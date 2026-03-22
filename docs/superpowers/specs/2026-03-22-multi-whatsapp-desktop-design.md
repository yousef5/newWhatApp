# MultiWhatsApp Desktop — Design Spec

## Overview

A desktop application (Electron) that connects to real WhatsApp via Baileys, supporting unlimited accounts displayed in a tab sidebar layout. Each account is a separate WhatsApp Web session linked via QR code. Modern dark theme with purple/blue accents.

## Architecture

**Two-layer Electron app:**

- **Main Process** — runs all Baileys instances via `AccountManager`, manages SQLite storage per account, handles auth file persistence and media caching.
- **Renderer Process** — React app with Zustand for state management (accounts, chats, messages) and React Query for lazy-loading. UI shell: account sidebar (left) → chat list (middle) → message view (right).
- **IPC Bridge** — typed commands flow renderer → main (send message, create account, etc.) and events flow main → renderer (new message, connection status, QR code, etc.).

### Storage Layout

```
~/.newwhatsapp/
├── accounts/
│   ├── {account-id}/
│   │   ├── auth/           # Baileys multi-device auth state
│   │   ├── messages.db     # SQLite — messages, contacts, chats
│   │   └── media/          # Downloaded images, docs, voice notes
│   └── .../
└── config.json             # Global app settings
```

## Account Data Model

Each account is identified by a UUID v4, generated on creation. The account metadata is stored in `config.json`.

```typescript
interface Account {
  id: string;              // UUID v4
  name: string;            // User-assigned label (e.g., "Personal", "Work")
  phoneNumber?: string;    // Populated after successful connection
  avatarColor: string;     // Hex color for sidebar avatar
  createdAt: string;       // ISO 8601
  order: number;           // Sidebar display order
}
```

### config.json Schema

```typescript
interface AppConfig {
  accounts: Account[];
  settings: {
    theme: 'dark';                    // Only dark for v1
    notifications: {
      enabled: boolean;
      sound: boolean;
    };
    idleTimeoutMinutes: number;       // Default: 30
    window: {
      width: number;
      height: number;
      x?: number;
      y?: number;
      maximized: boolean;
    };
  };
}
```

## Security

### Auth State Protection
- Baileys auth files are encrypted at rest using `safeStorage` (Electron's OS-level encryption: DPAPI on Windows, Keychain on macOS, libsecret on Linux)
- Auth directory has restrictive file permissions (0700 on Unix)
- On first launch, a master key is generated and stored in the OS keychain via `safeStorage`
- Copying the data directory to another machine without the OS keychain renders auth files useless

### App Lock
- No app-level lock for v1 — relies on OS-level screen lock
- Auth state is only decrypted while the app is running

## IPC Contract

### Renderer → Main (Commands)

| Channel | Payload | Response | Description |
|---------|---------|----------|-------------|
| `account:create` | `{ name: string }` | `{ id: string }` | Create new account, starts QR flow |
| `account:remove` | `{ id: string, deleteData: boolean }` | `void` | Remove account |
| `account:rename` | `{ id: string, name: string }` | `void` | Rename account |
| `account:reorder` | `{ ids: string[] }` | `void` | Reorder accounts |
| `account:reconnect` | `{ id: string }` | `void` | Force reconnect idle/disconnected account |
| `message:send` | `{ accountId: string, jid: string, content: MessageContent }` | `{ id: string }` | Send message |
| `message:delete` | `{ accountId: string, jid: string, messageId: string }` | `void` | Delete message |
| `message:star` | `{ accountId: string, messageId: string, starred: boolean }` | `void` | Star/unstar message |
| `chat:load` | `{ accountId: string, jid: string, before?: string, limit: number }` | `Message[]` | Load messages (paginated) |
| `chat:markRead` | `{ accountId: string, jid: string }` | `void` | Mark chat as read |
| `chat:mute` | `{ accountId: string, jid: string, until: number }` | `void` | Mute chat |
| `chat:search` | `{ accountId: string, query: string, jid?: string }` | `SearchResult[]` | Search messages |
| `contact:block` | `{ accountId: string, jid: string }` | `void` | Block contact |
| `contact:unblock` | `{ accountId: string, jid: string }` | `void` | Unblock contact |
| `media:download` | `{ accountId: string, messageId: string }` | `{ path: string }` | Download full media |
| `media:send` | `{ accountId: string, jid: string, filePath: string, type: MediaType }` | `{ id: string }` | Send media |
| `group:info` | `{ accountId: string, jid: string }` | `GroupMetadata` | Get group info |
| `message:forward` | `{ accountId: string, messageId: string, toJid: string }` | `{ id: string }` | Forward message to another chat |

### Main → Renderer (Events)

| Channel | Payload | Description |
|---------|---------|-------------|
| `account:qr` | `{ accountId: string, qr: string }` | QR code for scanning |
| `account:connection` | `{ accountId: string, state: 'open' \| 'close' \| 'connecting' }` | Connection state change |
| `account:idle` | `{ accountId: string }` | Account disconnected due to idle |
| `message:new` | `{ accountId: string, message: Message }` | New incoming message |
| `message:update` | `{ accountId: string, messageId: string, update: Partial<Message> }` | Message status update |
| `message:delete` | `{ accountId: string, messageId: string }` | Message deleted remotely |
| `chat:update` | `{ accountId: string, jid: string, update: Partial<Chat> }` | Chat metadata changed |
| `contact:update` | `{ accountId: string, jid: string, update: Partial<Contact> }` | Contact info changed |
| `presence:update` | `{ accountId: string, jid: string, presence: PresenceData }` | Online/typing status |

## Database Schema (per account)

```sql
CREATE TABLE chats (
  jid TEXT PRIMARY KEY,
  name TEXT,
  is_group INTEGER NOT NULL DEFAULT 0,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_timestamp INTEGER,
  last_message_preview TEXT,
  muted_until INTEGER DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_jid TEXT NOT NULL REFERENCES chats(jid),
  sender_jid TEXT,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',   -- text, image, video, audio, document, sticker, location, contact, reaction
  content TEXT,                         -- text body or caption
  media_path TEXT,                      -- local file path for downloaded media
  media_mime TEXT,
  media_size INTEGER,
  thumbnail_path TEXT,
  is_from_me INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'sent',           -- pending, sent, delivered, read, failed
  starred INTEGER NOT NULL DEFAULT 0,
  quoted_message_id TEXT,
  quoted_message_preview TEXT
);
CREATE INDEX idx_messages_chat_ts ON messages(chat_jid, timestamp DESC);
CREATE INDEX idx_messages_starred ON messages(starred) WHERE starred = 1;

CREATE VIRTUAL TABLE messages_fts USING fts5(
  content, content='messages', content_rowid='rowid'
);

CREATE TABLE contacts (
  jid TEXT PRIMARY KEY,
  name TEXT,                            -- push name from WhatsApp
  saved_name TEXT,                      -- locally saved name
  profile_picture_url TEXT,
  profile_picture_path TEXT,            -- cached locally
  about TEXT,
  is_blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE group_metadata (
  jid TEXT PRIMARY KEY REFERENCES chats(jid),
  subject TEXT,
  description TEXT,
  owner_jid TEXT,
  participant_count INTEGER,
  participants_json TEXT,               -- JSON array of {jid, admin: boolean}
  created_at INTEGER
);
```

## Core Features

### Account Management
- **Add account** — click "+" → Baileys creates session → QR code displayed → scan with phone → connected
- **Switch accounts** — click account avatar in sidebar → loads that account's chat list and messages
- **Remove account** — delete auth state + optionally delete local data
- **Unlimited accounts** — no hard cap, managed via idle disconnection

### Messaging
- Send/receive text messages
- Send/receive media: images, videos, documents, voice notes
- Message status: sent (✓), delivered (✓✓), read (blue ✓✓)
- Reply to messages
- Forward messages
- Delete messages

### Media
- Incoming: Baileys downloads buffer → saves to `media/` → SQLite stores path + metadata → thumbnail in chat
- Outgoing: user picks file → renderer sends path via IPC → main reads + sends via Baileys → stores locally
- Thumbnails generated on download (sharp), full media on click
- Voice note recording via `navigator.mediaDevices.getUserMedia` in renderer, converted to opus/ogg via fluent-ffmpeg to match WhatsApp format. Hold-to-record UI with waveform visualization. Max duration: 15 minutes.

### Search
- Per-chat message search using SQLite FTS5 (full-text search)
- Global search across all chats in active account — searches message text, media captions, document filenames
- Results displayed as a list with message preview, clicking jumps to message in context
- Starred/bookmarked messages

### Groups
- View group info (participants, description, settings)
- Group admin actions (if admin): add/remove participants, promote/demote admins, change subject/description
- Mute/unmute groups

### Status/Stories — Deferred to v2
Not included in v1. Requires separate UI panel and Baileys status API handling.

### Contacts
- View contact info, about, profile picture
- Online/last seen status
- Block/unblock contacts

### Notifications
- Electron native OS notifications for new messages on **connected accounts only**
- Idle/disconnected accounts do not receive real-time notifications — unread badges update on reconnect (when user switches to account or app restarts)
- Tray icon with unread badge for connected accounts
- Per-account and per-chat mute option
- Sound notifications (toggleable)

### Power User
- Chat export (text format)
- Starred messages view
- Keyboard shortcuts for navigation

## UI Layout

### Account Sidebar (62px width)
- App logo at top
- Account avatars with initials, colored uniquely
- Green dot = connected, gray dot = disconnected/idle
- Red badge = unread message count
- "+" button to add new account
- Settings gear at bottom

### Chat List Panel (280px width)
- Header: account name + connection status
- Search bar: "Search or start new chat..."
- Filter pills: All | Unread | Groups
- Scrollable chat items: avatar, name, last message preview, timestamp, unread badge
- Active chat highlighted with purple left border

### Message View (flex, remaining width)
- Chat header: contact avatar, name, online status, action icons (search, attach, menu)
- Scrollable message area: date dividers, incoming (dark card, left-aligned) and outgoing (purple, right-aligned) bubbles
- Document/media cards inline
- Input bar: emoji button, attachment button, text input, send/voice button

### QR Login Overlay
- Full-screen overlay when adding new account
- QR code centered with "Scan with WhatsApp" instruction
- Loading spinner during connection
- Success animation on connect

### Settings Panel
- Theme preferences
- Notification settings
- Account management (rename, remove, reorder)
- Storage management (clear media cache)
- About/version info

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 33+ |
| Frontend | React 19 + TypeScript |
| Bundler | Vite + electron-vite |
| State | Zustand |
| Async Data | @tanstack/react-query |
| Styling | Tailwind CSS |
| WhatsApp | @whiskeysockets/baileys |
| Database | better-sqlite3 (WAL mode) |
| Media | sharp (thumbnails), fluent-ffmpeg (voice notes) |
| Chat Virtualization | react-window |
| Emoji | emoji-mart |
| Notifications | Electron native |
| Packaging | electron-builder |

## Project Structure

```
newWhatApp/
├── electron/                # Main process
│   ├── main.ts             # Entry point, window management
│   ├── preload.ts          # IPC bridge (contextBridge)
│   ├── accounts/
│   │   ├── manager.ts      # AccountManager — create/destroy sessions
│   │   ├── session.ts      # Single Baileys session wrapper
│   │   └── auth-store.ts   # Auth state persistence (encrypted)
│   ├── storage/
│   │   ├── database.ts     # SQLite setup + migrations
│   │   ├── migrations/     # Schema migration files
│   │   ├── messages.ts     # Message CRUD
│   │   └── contacts.ts     # Contact CRUD
│   ├── media/
│   │   └── handler.ts      # Download, cache, thumbnails
│   └── ipc/
│       └── handlers.ts     # IPC command handlers
├── src/                     # Renderer (React)
│   ├── App.tsx
│   ├── stores/             # Zustand stores
│   │   ├── accounts.ts
│   │   ├── chats.ts
│   │   └── messages.ts
│   ├── components/
│   │   ├── AccountSidebar/
│   │   ├── ChatList/
│   │   ├── MessageView/
│   │   ├── QRLogin/
│   │   └── Settings/
│   ├── hooks/              # useIPC, useAccount, etc.
│   └── lib/                # Utilities, types, IPC type definitions
├── shared/                  # Shared types between main and renderer
│   └── types.ts            # IPC contracts, data models, enums
├── resources/              # App icons
├── electron-vite.config.ts
├── package.json
└── tsconfig.json
```

## Data Flow

### Account Lifecycle
1. User clicks "+" → renderer sends `account:create` via IPC
2. Main process creates Baileys instance → emits QR code event
3. Renderer shows QR overlay → user scans with phone
4. Baileys connects → emits `connection:open` → account is live
5. Sidebar shows green dot, chats start loading into SQLite

### Incoming Message
Baileys receives → store in SQLite → emit `message:new` via IPC → Zustand updates → UI re-renders

### Outgoing Message
User sends → renderer emits `message:send` via IPC → main calls Baileys → on success store in SQLite → emit `message:update` with status

## Error Handling

### Connection
- Baileys disconnects → yellow "Reconnecting..." banner → auto-retry with exponential backoff (1s, 2s, 4s, max 30s)
- Phone offline → session stays alive, messages sync on return
- QR expires → "QR expired, click to refresh" button
- Account logged out from phone → "Session ended" with re-login option, local history preserved

### Multi-Account
- Duplicate phone number → detect and block with error
- Account fails on startup → skip, load others, show error badge
- All accounts offline → global offline banner

### Data Safety
- SQLite WAL mode for crash resistance
- Auth files backed up on each successful connection
- Media download failure → placeholder with retry button
- Message send failure → red "!" icon with retry/delete

## Performance (Unlimited Accounts)

- Only active account's Baileys socket stays fully connected
- Idle accounts (30min+) → disconnect socket, preserve auth state → reconnect on switch
- When switching to idle account: show "Reconnecting..." spinner, Baileys reconnects and performs history sync for missed messages
- Chat list virtualized with react-window for 1000+ chats
- Messages lazy-loaded: fetch 50 at a time, load more on scroll up
- Media: thumbnails on download, full resolution on click
- Staggered connections on startup: accounts connect with 2-second delay between each to reduce ban risk

## History Sync

- On first QR pairing: Baileys provides limited history sync (~3 months of recent chats). Messages are stored in SQLite as they arrive via `messages.upsert` events with `type: 'prepend'`.
- On reconnect after idle: Baileys syncs missed messages automatically. The app processes `messages.upsert` with `type: 'notify'` for new messages and `type: 'prepend'` for backfilled history.
- No ability to fetch arbitrarily old messages from WhatsApp servers — only what Baileys history sync provides.

## Feature Scope

### v1 (This Spec)
- Multi-account with tab sidebar
- Text messaging (send/receive/reply/forward/delete)
- Media (images, videos, documents, voice notes)
- Message search (FTS5)
- Groups (view info, admin actions)
- Contacts (info, block/unblock)
- Notifications (connected accounts)
- Starred messages
- Chat export
- Keyboard shortcuts

### Deferred to v2
- Status/Stories viewing and posting
- Sticker browsing and sending
- Link previews (rich URL cards)
- Polls
- Location sharing
- Contact card (vCard) sharing
- Disappearing/ephemeral messages
- Message reactions
- Voice/video calls
- Auto-update mechanism
- App-level lock/PIN

## Window Management

- Minimum window size: 900x600
- Single instance only (second launch focuses existing window)
- Close button minimizes to system tray (configurable: quit or minimize)
- Window position and size persisted in `config.json`
- Tray icon with right-click menu: Show/Hide, Quit
- No auto-launch on boot for v1

## Anti-Ban Considerations

WhatsApp actively detects unofficial clients. Mitigation strategies:
- Stagger account connections on startup (2s delay between each)
- No bulk messaging features
- Respect WhatsApp's rate limits for message sending
- Use Baileys' built-in browser fingerprint (mimics WhatsApp Web)
- Warn users in settings that using unofficial clients risks account bans
