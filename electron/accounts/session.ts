import { EventEmitter } from 'events'
import baileys from '@whiskeysockets/baileys'
const { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys
type WASocket = ReturnType<typeof makeWASocket>
import { Boom } from '@hapi/boom'
import { createAuthState, deleteAuthState } from './auth-store'
import { ChatStore } from '../storage/chats'
import { MessageStore } from '../storage/messages'
import { ContactStore } from '../storage/contacts'
import { emitToRenderer } from '../ipc/emitter'
import type {
  Message,
  MessageType,
  MessageStatus,
  ConnectionState,
  Chat,
  GroupMetadata as AppGroupMetadata,
  Contact,
  SearchResult,
} from '@shared/types'

const MAX_RETRIES = 5
const MAX_BACKOFF_MS = 30_000

export class BaileysSession extends EventEmitter {
  private socket: WASocket | null = null
  private chatStore: ChatStore
  private messageStore: MessageStore
  private contactStore: ContactStore
  private retryCount = 0
  private connectionState: ConnectionState = 'close'

  constructor(public readonly accountId: string) {
    super()
    this.chatStore = new ChatStore(accountId)
    this.messageStore = new MessageStore(accountId)
    this.contactStore = new ContactStore(accountId)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  async connect(): Promise<void> {
    const { state, saveCreds } = await createAuthState(this.accountId)
    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, undefined as any),
      },
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
    })

    this.socket = socket

    // --- connection.update ---
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        emitToRenderer('account:qr', { accountId: this.accountId, qr })
      }

      if (connection === 'open') {
        this.connectionState = 'open'
        this.retryCount = 0
        emitToRenderer('account:connection', {
          accountId: this.accountId,
          state: 'open',
        })
        this.emit('open')
      }

      if (connection === 'connecting') {
        this.connectionState = 'connecting'
        emitToRenderer('account:connection', {
          accountId: this.accountId,
          state: 'connecting',
        })
      }

      if (connection === 'close') {
        this.connectionState = 'close'
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode

        if (statusCode === DisconnectReason.loggedOut) {
          deleteAuthState(this.accountId)
          emitToRenderer('account:connection', {
            accountId: this.accountId,
            state: 'close',
          })
          this.emit('loggedOut')
          return
        }

        // Auto-reconnect with exponential backoff
        if (this.retryCount < MAX_RETRIES) {
          const backoff = Math.min(1000 * Math.pow(2, this.retryCount), MAX_BACKOFF_MS)
          this.retryCount++
          emitToRenderer('account:connection', {
            accountId: this.accountId,
            state: 'connecting',
          })
          setTimeout(() => this.connect(), backoff)
        } else {
          emitToRenderer('account:connection', {
            accountId: this.accountId,
            state: 'close',
          })
          this.emit('disconnected')
        }
      }
    })

    // --- creds.update ---
    socket.ev.on('creds.update', saveCreds)

    // --- chats.upsert ---
    socket.ev.on('chats.upsert', (chats) => { try {
      for (const chat of chats) {
        this.chatStore.upsert({
          jid: chat.id,
          name: chat.name ?? undefined,
          isGroup: chat.id.endsWith('@g.us'),
          unreadCount: chat.unreadCount ?? undefined,
          lastMessageTimestamp: typeof chat.conversationTimestamp === 'number'
            ? chat.conversationTimestamp
            : undefined,
          pinned: chat.pinned ? true : undefined,
          archived: chat.archived ? true : undefined,
        })
        const stored = this.chatStore.get(chat.id)
        if (stored) {
          emitToRenderer('chat:update', {
            accountId: this.accountId,
            jid: chat.id,
            update: stored,
          })
        }
      }
    } catch (e) { console.error('chats.upsert error:', e) } })

    // --- chats.update ---
    socket.ev.on('chats.update', (updates) => {
      for (const update of updates) {
        if (!update.id) continue
        const partial: Partial<Chat> & { jid: string } = { jid: update.id }
        if (update.name != null) partial.name = update.name
        if (update.unreadCount != null) partial.unreadCount = update.unreadCount
        if (update.conversationTimestamp != null) {
          partial.lastMessageTimestamp = typeof update.conversationTimestamp === 'number'
            ? update.conversationTimestamp
            : undefined
        }
        if (update.pinned != null) partial.pinned = !!update.pinned
        if (update.archived != null) partial.archived = !!update.archived

        this.chatStore.upsert(partial)
        const stored = this.chatStore.get(update.id)
        if (stored) {
          emitToRenderer('chat:update', {
            accountId: this.accountId,
            jid: update.id,
            update: stored,
          })
        }
      }
    })

    // --- messages.upsert ---
    socket.ev.on('messages.upsert', ({ messages, type }) => { try {
      for (const msg of messages) {
        const parsed = this.parseMessage(msg)
        if (!parsed) continue

        // Ensure chat exists
        this.chatStore.upsert({
          jid: parsed.chatJid,
          isGroup: parsed.chatJid.endsWith('@g.us'),
          lastMessageTimestamp: parsed.timestamp,
          lastMessagePreview: parsed.content?.slice(0, 100) ?? null,
        })

        this.messageStore.insert(parsed)

        // Auto-download media for images/videos/audio/stickers
        if (parsed.type === 'image' || parsed.type === 'video' || parsed.type === 'audio' || parsed.type === 'sticker') {
          this.downloadMedia(msg, parsed.id).catch((e) =>
            console.error('Media download failed:', e)
          )
        }

        if (type === 'notify' && !parsed.isFromMe) {
          this.chatStore.incrementUnread(parsed.chatJid)

          // Send OS notification for non-self messages
          const { Notification } = require('electron')
          const { loadConfig } = require('../storage/config')
          const config = loadConfig()
          if (config.settings.notifications.enabled) {
            const chatName = this.chatStore.get(parsed.chatJid)?.name || 'Unknown'
            const notif = new Notification({
              title: chatName,
              body: parsed.content || `[${parsed.type}]`,
              silent: !config.settings.notifications.sound,
            })
            notif.show()
          }
        }

        emitToRenderer('message:new', {
          accountId: this.accountId,
          message: parsed,
        })
      }
    } catch (e) { console.error('messages.upsert error:', e) } })

    // --- messages.update ---
    socket.ev.on('messages.update', (updates) => {
      for (const { key, update } of updates) {
        if (!key.id) continue

        const statusMap: { [code: number]: MessageStatus } = {
          1: 'pending',
          2: 'sent',
          3: 'delivered',
          4: 'read',
        }

        if (update.status != null) {
          const status = statusMap[update.status] ?? 'sent'
          this.messageStore.updateStatus(key.id, status)
          emitToRenderer('message:update', {
            accountId: this.accountId,
            messageId: key.id,
            update: { status },
          })
        }
      }
    })

    // --- contacts.upsert ---
    socket.ev.on('contacts.upsert', (contacts) => { try {
      for (const contact of contacts) {
        const mapped: Partial<Contact> & { jid: string } = {
          jid: contact.id,
          name: contact.name ?? contact.notify ?? null,
          savedName: contact.name ?? null,
        }
        this.contactStore.upsertContact(mapped)
        emitToRenderer('contact:update', {
          accountId: this.accountId,
          jid: contact.id,
          update: mapped,
        })
      }
    } catch (e) { console.error('contacts.upsert error:', e) } })

    // --- presence.update ---
    socket.ev.on('presence.update', ({ id, presences }) => {
      const jids = Object.keys(presences)
      for (const jid of jids) {
        const presence = presences[jid]
        emitToRenderer('presence:update', {
          accountId: this.accountId,
          jid: id,
          presence: {
            lastKnownPresence: presence.lastKnownPresence as any,
            lastSeen: presence.lastSeen ?? undefined,
          },
        })
      }
    })

    // --- groups.upsert ---
    socket.ev.on('groups.upsert', (groups) => {
      for (const group of groups) {
        this.chatStore.upsert({
          jid: group.id,
          name: group.subject,
          isGroup: true,
        })

        this.contactStore.upsertGroupMetadata({
          jid: group.id,
          subject: group.subject ?? null,
          description: group.desc ?? null,
          ownerJid: group.owner ?? null,
          participantCount: group.participants?.length ?? 0,
          participants: (group.participants ?? []).map((p) => ({
            jid: p.id,
            admin: p.admin === 'admin' || p.admin === 'superadmin',
          })),
          createdAt: group.creation ?? null,
        })
      }
    })

    // --- messaging-history.set (bulk history sync on first connect) ---
    socket.ev.on('messaging-history.set', ({ chats, contacts, messages, isLatest }) => { try {
      console.log(`[${this.accountId}] History sync: ${chats.length} chats, ${contacts.length} contacts, ${messages.length} messages`)

      // Upsert all chats
      for (const chat of chats) {
        this.chatStore.upsert({
          jid: chat.id,
          name: chat.name ?? undefined,
          isGroup: chat.id.endsWith('@g.us'),
          unreadCount: chat.unreadCount ?? 0,
          lastMessageTimestamp: typeof chat.conversationTimestamp === 'number'
            ? chat.conversationTimestamp
            : typeof chat.conversationTimestamp === 'object' && chat.conversationTimestamp
              ? Number(chat.conversationTimestamp.low || chat.conversationTimestamp)
              : undefined,
          pinned: chat.pinned ? true : false,
          archived: chat.archived ? true : false,
        })
      }

      // Upsert all contacts
      for (const contact of contacts) {
        this.contactStore.upsertContact({
          jid: contact.id,
          name: contact.name ?? contact.notify ?? null,
        })
        // Also update chat name from contact
        if (contact.name || contact.notify) {
          const existingChat = this.chatStore.get(contact.id)
          if (existingChat && !existingChat.name) {
            this.chatStore.upsert({
              jid: contact.id,
              name: contact.name || contact.notify || undefined,
            })
          }
        }
      }

      // Upsert all messages
      for (const msg of messages) {
        const parsed = this.parseMessage(msg)
        if (!parsed) continue

        // Ensure chat exists
        this.chatStore.upsert({
          jid: parsed.chatJid,
          isGroup: parsed.chatJid.endsWith('@g.us'),
          lastMessageTimestamp: parsed.timestamp,
          lastMessagePreview: parsed.content?.substring(0, 100) || `[${parsed.type}]`,
        })

        this.messageStore.insert(parsed)
      }

      // Notify renderer to refresh chat list
      const allChats = this.chatStore.getAll()
      for (const chat of allChats) {
        emitToRenderer('chat:update', {
          accountId: this.accountId,
          jid: chat.jid,
          update: chat,
        })
      }
    } catch (e) { console.error('messaging-history.set error:', e) } })
  }

  disconnect(): void {
    this.retryCount = MAX_RETRIES // prevent auto-reconnect
    this.socket?.end(undefined)
    this.socket = null
    this.connectionState = 'close'
  }

  async sendMessage(
    jid: string,
    content: { text?: string; quotedMessageId?: string }
  ): Promise<WAMessage | undefined> {
    if (!this.socket) throw new Error('Socket not connected')

    const opts: any = {}

    if (content.text) {
      opts.text = content.text
    }

    let quoted: WAMessage | undefined
    if (content.quotedMessageId) {
      const stored = this.messageStore.get(content.quotedMessageId)
      if (stored) {
        quoted = {
          key: {
            remoteJid: stored.chatJid,
            id: stored.id,
            fromMe: stored.isFromMe,
          },
          message: { conversation: stored.content ?? '' },
        } as WAMessage
      }
    }

    return this.socket.sendMessage(jid, opts, { quoted })
  }

  // --- Accessor methods ---

  getChats(): Chat[] {
    return this.chatStore.getAll()
  }

  getMessages(jid: string, before?: number, limit?: number): Message[] {
    return this.messageStore.getForChat(jid, before, limit)
  }

  searchMessages(query: string, jid?: string): SearchResult[] {
    return this.messageStore.search(query, jid)
  }

  getMessage(id: string): Message | null {
    return this.messageStore.get(id)
  }

  getContact(jid: string): Contact | null {
    return this.contactStore.getContact(jid)
  }

  getGroupInfo(jid: string): AppGroupMetadata | null {
    return this.contactStore.getGroupMetadata(jid)
  }

  markChatRead(jid: string): void {
    this.chatStore.markRead(jid)
    // Also tell WA server
    if (this.socket) {
      this.socket.readMessages([{ remoteJid: jid, id: '' }]).catch(() => {})
    }
  }

  muteChat(jid: string, until: number): void {
    this.chatStore.setMuted(jid, until)
    if (this.socket) {
      this.socket.chatModify({ mute: until > 0 ? until * 1000 : null }, jid).catch(() => {})
    }
  }

  starMessage(messageId: string, starred: boolean): void {
    this.messageStore.setStar(messageId, starred)
  }

  getStarredMessages(jid?: string): Message[] {
    return this.messageStore.getStarred(jid)
  }

  getSocket(): WASocket | null {
    return this.socket
  }

  // --- Message parser ---

  private async downloadMedia(msg: any, messageId: string): Promise<void> {
    try {
      const mediaHandler = new (await import('../media/handler')).MediaHandler(this.accountId)
      const { mediaPath, thumbnailPath } = await mediaHandler.downloadMessage(msg)
      this.messageStore.updateMediaPath(messageId, mediaPath, thumbnailPath)
      // Notify renderer of updated media paths
      emitToRenderer('message:update', {
        accountId: this.accountId,
        messageId,
        update: { mediaPath, thumbnailPath },
      })
    } catch (e) {
      console.error(`Failed to download media for ${messageId}:`, e)
    }
  }

  parseMessage(msg: WAMessage): Message | null {
    if (!msg.key?.id || !msg.key.remoteJid) return null

    const chatJid = msg.key.remoteJid
    const isFromMe = !!msg.key.fromMe
    const rawSenderJid = isFromMe ? null : (msg.key.participant ?? chatJid)
    // Resolve sender name: try contact store, then pushName, then JID
    let senderJid = rawSenderJid
    if (rawSenderJid) {
      const contact = this.contactStore.getContact(rawSenderJid)
      if (contact?.name) {
        senderJid = contact.name
      } else if ((msg as any).pushName) {
        senderJid = (msg as any).pushName
      }
    }
    const timestamp = typeof msg.messageTimestamp === 'number'
      ? msg.messageTimestamp
      : typeof msg.messageTimestamp === 'object'
        ? Number(msg.messageTimestamp)
        : Math.floor(Date.now() / 1000)

    const messageContent = msg.message
    if (!messageContent) return null

    let type: MessageType = 'text'
    let content: string | null = null
    let mediaMime: string | null = null
    let mediaSize: number | null = null

    if (messageContent.conversation) {
      type = 'text'
      content = messageContent.conversation
    } else if (messageContent.extendedTextMessage) {
      type = 'text'
      content = messageContent.extendedTextMessage.text ?? null
    } else if (messageContent.imageMessage) {
      type = 'image'
      content = messageContent.imageMessage.caption ?? null
      mediaMime = messageContent.imageMessage.mimetype ?? null
      mediaSize = messageContent.imageMessage.fileLength
        ? Number(messageContent.imageMessage.fileLength)
        : null
    } else if (messageContent.videoMessage) {
      type = 'video'
      content = messageContent.videoMessage.caption ?? null
      mediaMime = messageContent.videoMessage.mimetype ?? null
      mediaSize = messageContent.videoMessage.fileLength
        ? Number(messageContent.videoMessage.fileLength)
        : null
    } else if (messageContent.audioMessage) {
      type = 'audio'
      mediaMime = messageContent.audioMessage.mimetype ?? null
      mediaSize = messageContent.audioMessage.fileLength
        ? Number(messageContent.audioMessage.fileLength)
        : null
    } else if (messageContent.documentMessage) {
      type = 'document'
      content = messageContent.documentMessage.fileName ?? null
      mediaMime = messageContent.documentMessage.mimetype ?? null
      mediaSize = messageContent.documentMessage.fileLength
        ? Number(messageContent.documentMessage.fileLength)
        : null
    } else if (messageContent.stickerMessage) {
      type = 'sticker'
      mediaMime = messageContent.stickerMessage.mimetype ?? null
    } else if (messageContent.locationMessage) {
      type = 'location'
      const loc = messageContent.locationMessage
      content = `${loc.degreesLatitude},${loc.degreesLongitude}`
    } else if (messageContent.contactMessage) {
      type = 'contact'
      content = messageContent.contactMessage.displayName ?? null
    } else if (messageContent.reactionMessage) {
      type = 'reaction'
      content = messageContent.reactionMessage.text ?? null
    } else {
      // Unknown message type, skip
      return null
    }

    // Handle quoted message
    let quotedMessageId: string | null = null
    let quotedMessagePreview: string | null = null
    const contextInfo =
      messageContent.extendedTextMessage?.contextInfo ??
      messageContent.imageMessage?.contextInfo ??
      messageContent.videoMessage?.contextInfo ??
      messageContent.audioMessage?.contextInfo ??
      messageContent.documentMessage?.contextInfo

    if (contextInfo?.quotedMessage) {
      quotedMessageId = contextInfo.stanzaId ?? null
      const quoted = contextInfo.quotedMessage
      quotedMessagePreview =
        quoted.conversation ??
        quoted.extendedTextMessage?.text ??
        quoted.imageMessage?.caption ??
        quoted.videoMessage?.caption ??
        null
    }

    return {
      id: msg.key.id!,
      chatJid,
      senderJid,
      timestamp,
      type,
      content,
      mediaPath: null,
      mediaMime,
      mediaSize,
      thumbnailPath: null,
      isFromMe,
      status: isFromMe ? 'sent' : 'delivered',
      starred: false,
      quotedMessageId,
      quotedMessagePreview,
    }
  }
}
