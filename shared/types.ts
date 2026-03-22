// ============ Account ============

export interface Account {
  id: string              // UUID v4
  name: string            // User-assigned label (e.g., "Personal", "Work")
  phoneNumber?: string    // Populated after successful connection
  avatarColor: string     // Hex color for sidebar avatar
  createdAt: string       // ISO 8601
  order: number           // Sidebar display order
}

export type ConnectionState = 'open' | 'close' | 'connecting'

export interface AccountWithState extends Account {
  connectionState: ConnectionState
  unreadCount: number
}

// ============ Chat ============

export interface Chat {
  jid: string
  name: string
  isGroup: boolean
  unreadCount: number
  lastMessageTimestamp: number | null
  lastMessagePreview: string | null
  mutedUntil: number
  pinned: boolean
  archived: boolean
  profilePicture?: string | null
}

// ============ Message ============

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: string
  chatJid: string
  senderJid: string | null
  timestamp: number
  type: MessageType
  content: string | null
  mediaPath: string | null
  mediaMime: string | null
  mediaSize: number | null
  thumbnailPath: string | null
  isFromMe: boolean
  status: MessageStatus
  starred: boolean
  quotedMessageId: string | null
  quotedMessagePreview: string | null
}

export type MediaType = 'image' | 'video' | 'audio' | 'document'

export interface MessageContent {
  text?: string
  media?: {
    path: string
    type: MediaType
    caption?: string
  }
  quotedMessageId?: string
}

// ============ Contact ============

export interface Contact {
  jid: string
  name: string | null
  savedName: string | null
  profilePictureUrl: string | null
  profilePicturePath: string | null
  about: string | null
  isBlocked: boolean
}

// ============ Group ============

export interface GroupParticipant {
  jid: string
  admin: boolean
}

export interface GroupMetadata {
  jid: string
  subject: string | null
  description: string | null
  ownerJid: string | null
  participantCount: number
  participants: GroupParticipant[]
  createdAt: number | null
}

// ============ Presence ============

export interface PresenceData {
  lastKnownPresence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'
  lastSeen?: number
}

// ============ Search ============

export interface SearchResult {
  messageId: string
  chatJid: string
  chatName: string | null
  content: string
  timestamp: number
  isFromMe: boolean
}

// ============ Config ============

export interface AppConfig {
  accounts: Account[]
  settings: AppSettings
}

export interface AppSettings {
  theme: 'dark'
  notifications: {
    enabled: boolean
    sound: boolean
  }
  idleTimeoutMinutes: number
  closeToTray: boolean
  window: {
    width: number
    height: number
    x?: number
    y?: number
    maximized: boolean
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  accounts: [],
  settings: {
    theme: 'dark',
    notifications: { enabled: true, sound: true },
    idleTimeoutMinutes: 30,
    closeToTray: true,
    window: {
      width: 1200,
      height: 800,
      maximized: false,
    },
  },
}

// ============ IPC Channels ============

// Renderer → Main (invoke)
export type IPCCommands = {
  'account:create': { payload: { name: string }; response: { id: string } }
  'account:remove': { payload: { id: string; deleteData: boolean }; response: void }
  'account:rename': { payload: { id: string; name: string }; response: void }
  'account:reorder': { payload: { ids: string[] }; response: void }
  'account:reconnect': { payload: { id: string }; response: void }
  'account:list': { payload: void; response: AccountWithState[] }
  'message:send': { payload: { accountId: string; jid: string; content: MessageContent }; response: { id: string } }
  'message:delete': { payload: { accountId: string; jid: string; messageId: string }; response: void }
  'message:star': { payload: { accountId: string; messageId: string; starred: boolean }; response: void }
  'message:forward': { payload: { accountId: string; messageId: string; toJid: string }; response: { id: string } }
  'message:getStarred': { payload: { accountId: string; jid?: string }; response: Message[] }
  'chat:load': { payload: { accountId: string; jid: string; before?: number; limit: number }; response: Message[] }
  'chat:list': { payload: { accountId: string }; response: Chat[] }
  'chat:markRead': { payload: { accountId: string; jid: string }; response: void }
  'chat:mute': { payload: { accountId: string; jid: string; until: number }; response: void }
  'chat:search': { payload: { accountId: string; query: string; jid?: string }; response: SearchResult[] }
  'chat:export': { payload: { accountId: string; jid: string }; response: { filePath: string } }
  'contact:block': { payload: { accountId: string; jid: string }; response: void }
  'contact:unblock': { payload: { accountId: string; jid: string }; response: void }
  'contact:get': { payload: { accountId: string; jid: string }; response: Contact | null }
  'media:download': { payload: { accountId: string; messageId: string }; response: { path: string } }
  'media:send': { payload: { accountId: string; jid: string; filePath: string; type: MediaType }; response: { id: string } }
  'media:convertVoice': { payload: { accountId: string; jid: string; audioBuffer: ArrayBuffer }; response: { id: string } }
  'group:info': { payload: { accountId: string; jid: string }; response: GroupMetadata }
  'group:addParticipant': { payload: { accountId: string; jid: string; participantJid: string }; response: void }
  'group:removeParticipant': { payload: { accountId: string; jid: string; participantJid: string }; response: void }
  'group:promoteAdmin': { payload: { accountId: string; jid: string; participantJid: string }; response: void }
  'group:demoteAdmin': { payload: { accountId: string; jid: string; participantJid: string }; response: void }
  'group:updateSubject': { payload: { accountId: string; jid: string; subject: string }; response: void }
  'group:updateDescription': { payload: { accountId: string; jid: string; description: string }; response: void }
  'config:get': { payload: void; response: AppConfig }
  'config:update': { payload: { settings: Partial<AppSettings> }; response: void }
  'account:refetchAvatars': { payload: { accountId: string }; response: void }
}

// Main → Renderer (events via send)
export type IPCEvents = {
  'account:qr': { accountId: string; qr: string }
  'account:connection': { accountId: string; state: ConnectionState }
  'account:idle': { accountId: string }
  'message:new': { accountId: string; message: Message }
  'message:update': { accountId: string; messageId: string; update: Partial<Message> }
  'message:delete': { accountId: string; messageId: string }
  'chat:update': { accountId: string; jid: string; update: Partial<Chat> }
  'contact:update': { accountId: string; jid: string; update: Partial<Contact> }
  'presence:update': { accountId: string; jid: string; presence: PresenceData }
}

// Type-safe IPC helper types
export type IPCChannel = keyof IPCCommands
export type IPCEventChannel = keyof IPCEvents
