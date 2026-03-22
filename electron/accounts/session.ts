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
      syncFullHistory: true,
    })

    this.socket = socket

    // --- connection.update ---
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        emitToRenderer('account:qr', { accountId: this.accountId, qr })
      }

      if (connection === 'open') {
        console.log(`[${this.accountId}] Connection OPEN`)
        this.connectionState = 'open'
        this.retryCount = 0
        emitToRenderer('account:connection', {
          accountId: this.accountId,
          state: 'open',
        })
        this.emit('open')

        // Fetch profile pictures in background after connection
        this.fetchProfilePictures().catch((e) =>
          console.error('Profile picture fetch error:', e)
        )
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

    // --- chats.set (Baileys v6 uses this on reconnect) ---
    socket.ev.on('chats.set' as any, (data: any) => { try {
      const chatArray = data?.chats ?? data
      if (Array.isArray(chatArray)) {
        console.log(`[${this.accountId}] chats.set: ${chatArray.length} chats`)
        for (const chat of chatArray) {
          this.chatStore.upsert({
            jid: chat.id,
            name: chat.name ?? undefined,
            isGroup: chat.id?.endsWith('@g.us') ?? false,
            unreadCount: chat.unreadCount ?? 0,
            lastMessageTimestamp: typeof chat.conversationTimestamp === 'number'
              ? chat.conversationTimestamp
              : typeof chat.conversationTimestamp === 'object' && chat.conversationTimestamp
                ? Number(chat.conversationTimestamp.low || chat.conversationTimestamp)
                : undefined,
          })
        }
      }
    } catch (e) { console.error('chats.set error:', e) } })

    // --- chats.upsert ---
    socket.ev.on('chats.upsert', (chats) => { try {
      console.log(`[${this.accountId}] chats.upsert: ${chats.length} chats`)
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

        if (type === 'notify') {
          // Real-time message — notify renderer
          if (!parsed.isFromMe) {
            this.chatStore.incrementUnread(parsed.chatJid)

            // Send OS notification
            try {
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
            } catch {}
          }

          emitToRenderer('message:new', {
            accountId: this.accountId,
            message: parsed,
          })
        }
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
        const name = contact.name ?? contact.notify ?? null
        const mapped: Partial<Contact> & { jid: string } = {
          jid: contact.id,
          name,
          savedName: contact.name ?? null,
        }
        this.contactStore.upsertContact(mapped)

        // Also update chat name directly so it shows even for @lid JIDs
        if (name) {
          const existingChat = this.chatStore.get(contact.id)
          if (existingChat && !existingChat.name) {
            this.chatStore.upsert({ jid: contact.id, name })
          }
          // Also try to match by LID if contact has a lid field
          if ((contact as any).lid) {
            const lidJid = (contact as any).lid
            this.contactStore.upsertContact({ jid: lidJid, name })
            const lidChat = this.chatStore.get(lidJid)
            if (lidChat && !lidChat.name) {
              this.chatStore.upsert({ jid: lidJid, name })
            }
          }
        }

        emitToRenderer('contact:update', {
          accountId: this.accountId,
          jid: contact.id,
          update: mapped,
        })
      }
    } catch (e) { console.error('contacts.upsert error:', e) } })

    // --- contacts.update (LID mappings and name changes) ---
    socket.ev.on('contacts.update', (updates) => { try {
      for (const update of updates) {
        if (!update.id) continue
        const name = (update as any).name ?? (update as any).notify ?? null
        if (name) {
          this.contactStore.upsertContact({ jid: update.id, name })
          // Update chat name too
          this.chatStore.upsert({ jid: update.id, name })
        }
      }
    } catch (e) { console.error('contacts.update error:', e) } })

    // --- lid-mapping.update (maps LID JIDs to phone JIDs) ---
    socket.ev.on('lid-mapping.update' as any, (data: any) => { try {
      if (data?.lid && data?.pn) {
        const lidJid = data.lid.includes('@') ? data.lid : `${data.lid}@lid`
        const phoneJid = data.pn.includes('@') ? data.pn : `${data.pn}@s.whatsapp.net`
        console.log(`[${this.accountId}] LID mapping: ${lidJid} -> ${phoneJid}`)

        // Store the mapping
        const db = (this.chatStore as any).db
        db.prepare('INSERT OR REPLACE INTO lid_mapping (lid, phone_jid) VALUES (?, ?)').run(lidJid, phoneJid)

        // Also copy contact name from phone JID to chat name if available
        const phoneContact = this.contactStore.getContact(phoneJid)
        if (phoneContact?.name) {
          this.chatStore.upsert({ jid: lidJid, name: phoneContact.name })
          this.contactStore.upsertContact({ jid: lidJid, name: phoneContact.name })
        }
      }
    } catch (e) { console.error('lid-mapping.update error:', e) } })

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

      // Upsert all chats — extract last message preview from the chat object
      for (const chat of chats) {
        // Try to get the last message text from the chat's messages array
        let lastPreview: string | null = null
        const lastMsg = (chat as any).messages?.[0]?.message
        if (lastMsg) {
          lastPreview = lastMsg.conversation
            ?? lastMsg.extendedTextMessage?.text
            ?? lastMsg.imageMessage?.caption
            ?? lastMsg.videoMessage?.caption
            ?? (lastMsg.imageMessage ? '[Image]' : null)
            ?? (lastMsg.videoMessage ? '[Video]' : null)
            ?? (lastMsg.audioMessage ? '[Voice Note]' : null)
            ?? (lastMsg.stickerMessage ? '[Sticker]' : null)
            ?? (lastMsg.documentMessage?.fileName ?? (lastMsg.documentMessage ? '[Document]' : null))
            ?? null
        }

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
          lastMessagePreview: lastPreview ?? undefined,
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

      // Upsert all messages and download media for recent ones
      const recentMediaMsgs: any[] = []
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400

      for (const msg of messages) {
        const parsed = this.parseMessage(msg)
        if (!parsed) continue

        this.chatStore.upsert({
          jid: parsed.chatJid,
          isGroup: parsed.chatJid.endsWith('@g.us'),
          lastMessageTimestamp: parsed.timestamp,
          lastMessagePreview: parsed.content?.substring(0, 100) || `[${parsed.type}]`,
        })

        this.messageStore.insert(parsed)

        // Queue recent media for download
        if (parsed.timestamp > oneDayAgo && (parsed.type === 'image' || parsed.type === 'video' || parsed.type === 'audio')) {
          recentMediaMsgs.push({ msg, id: parsed.id })
        }
      }

      // Download recent media in background
      for (const { msg: rawMsg, id } of recentMediaMsgs.slice(0, 20)) {
        this.downloadMedia(rawMsg, id).catch(() => {})
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

      // Fetch recent messages for top chats that don't have messages yet
      if (this.socket) {
        this.fetchRecentMessagesForChats().catch(e =>
          console.error('fetchRecentMessages error:', e)
        )
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

  async fetchOlderMessages(jid: string, count = 50): Promise<void> {
    if (!this.socket) return
    // Get oldest local message for this chat
    const localMessages = this.messageStore.getForChat(jid, undefined, 1)
    if (localMessages.length === 0) {
      // No local messages — request with a fake old key
      try {
        await (this.socket as any).fetchMessageHistory(count, {
          remoteJid: jid,
          id: '',
          fromMe: false,
        }, 0)
        console.log(`[${this.accountId}] Requested ${count} messages for ${jid}`)
      } catch (e) {
        console.error('fetchMessageHistory failed:', e)
      }
    } else {
      const oldest = localMessages[0]
      try {
        await (this.socket as any).fetchMessageHistory(count, {
          remoteJid: jid,
          id: oldest.id,
          fromMe: oldest.isFromMe,
        }, oldest.timestamp * 1000)
        console.log(`[${this.accountId}] Requested ${count} older messages for ${jid} before ${oldest.id}`)
      } catch (e) {
        console.error('fetchMessageHistory failed:', e)
      }
    }
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

  private async fetchRecentMessagesForChats(): Promise<void> {
    if (!this.socket) return
    const chats = this.chatStore.getAll()
    console.log(`[${this.accountId}] Fetching recent messages for ${Math.min(chats.length, 50)} chats...`)

    // Request messages for top 50 chats that have no local messages
    let fetched = 0
    for (const chat of chats.slice(0, 50)) {
      const localMsgs = this.messageStore.getForChat(chat.jid, undefined, 1)
      if (localMsgs.length > 0) continue // already have messages

      try {
        await (this.socket as any).fetchMessageHistory(10, {
          remoteJid: chat.jid,
          id: '',
          fromMe: false,
        }, 0)
        fetched++
        // Small delay between requests
        await new Promise(r => setTimeout(r, 300))
      } catch {
        // Skip failed ones
      }
    }
    console.log(`[${this.accountId}] Requested messages for ${fetched} chats`)

    // After a delay, refresh the chat list to pick up new messages
    setTimeout(() => {
      const updatedChats = this.chatStore.getAll()
      for (const chat of updatedChats) {
        emitToRenderer('chat:update', {
          accountId: this.accountId,
          jid: chat.jid,
          update: chat,
        })
      }
    }, 5000)
  }

  async fetchProfilePictures(force = false): Promise<void> {
    if (!this.socket) return
    const chats = this.chatStore.getAll()
    const { existsSync, mkdirSync, writeFileSync } = await import('fs')
    const { join } = await import('path')
    const { getAccountDir } = await import('../storage/config')

    const avatarDir = join(getAccountDir(this.accountId), 'avatars')
    if (!existsSync(avatarDir)) mkdirSync(avatarDir, { recursive: true })

    // Fetch in batches with delay to avoid rate limiting
    for (const chat of chats.slice(0, 100)) {
      try {
        if (!force) {
          const existing = this.contactStore.getContact(chat.jid)
          if (existing?.profilePicturePath) continue
        }

        const url = await this.socket!.profilePictureUrl(chat.jid, 'image').catch(() => null)
        if (!url) continue

        // Download the image
        const response = await fetch(url)
        if (!response.ok) continue
        const buffer = Buffer.from(await response.arrayBuffer())

        const filePath = join(avatarDir, `${chat.jid.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`)
        writeFileSync(filePath, buffer)

        this.contactStore.upsertContact({
          jid: chat.jid,
          profilePictureUrl: url,
          profilePicturePath: filePath,
        })
      } catch {
        // Skip failed ones silently
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 200))
    }
  }

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
    // For groups, sender is the participant. For DMs, sender is the remote JID.
    // Never store the group JID as the sender.
    const isGroup = chatJid.endsWith('@g.us')
    // participant can be in various places depending on message source
    const participant = msg.key.participant
      || (msg as any).participant
      || (msg as any).verifiedBizName  // business messages
      || null

    // For group messages without participant, use pushName as sender display name
    // Store it directly as senderJid since we can't do a contact JOIN without a real JID
    const rawSenderJid = isFromMe ? null : (participant || (isGroup ? null : chatJid))

    // Store pushName as contact name for the sender
    const pushName = (msg as any).pushName as string | undefined
    if (rawSenderJid && pushName) {
      this.contactStore.upsertContact({
        jid: rawSenderJid,
        name: pushName,
      })
    }

    // Store raw JID if available, otherwise use pushName as display name
    const senderJid = rawSenderJid || (isGroup && !isFromMe && pushName ? pushName : null)

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

    // Extract inline thumbnail from media messages and save to disk
    let thumbnailPath: string | null = null
    const thumbData =
      messageContent.imageMessage?.jpegThumbnail ??
      messageContent.videoMessage?.jpegThumbnail ??
      messageContent.stickerMessage?.pngThumbnail ??
      null

    if (thumbData && thumbData.length > 0) {
      try {
        const { existsSync, mkdirSync, writeFileSync } = require('fs')
        const { join } = require('path')
        const { getAccountDir } = require('../storage/config')
        const mediaDir = join(getAccountDir(this.accountId), 'media')
        if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true })
        const ext = messageContent.stickerMessage ? '.png' : '.jpg'
        thumbnailPath = join(mediaDir, `${msg.key.id}_thumb${ext}`)
        writeFileSync(thumbnailPath, Buffer.from(thumbData))
      } catch {
        thumbnailPath = null
      }
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
      thumbnailPath,
      isFromMe,
      status: isFromMe ? 'sent' : 'delivered',
      starred: false,
      quotedMessageId,
      quotedMessagePreview,
    }
  }
}
