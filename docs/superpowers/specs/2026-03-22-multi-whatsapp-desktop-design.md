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
- Voice note recording + playback (fluent-ffmpeg)

### Search
- Per-chat message search
- Global search across all chats in active account
- Starred/bookmarked messages

### Groups
- View group info (participants, description, settings)
- Group admin actions (if admin)
- Mute/unmute groups

### Status/Stories
- View contacts' status updates
- Post text/image status

### Contacts
- View contact info, about, profile picture
- Online/last seen status
- Block/unblock contacts

### Notifications
- Electron native OS notifications for new messages
- Tray icon with aggregate unread badge (sum of all accounts)
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
| Styling | Tailwind CSS |
| WhatsApp | @whiskeysockets/baileys |
| Database | better-sqlite3 (WAL mode) |
| Media | sharp (thumbnails), fluent-ffmpeg (voice notes) |
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
│   │   └── auth-store.ts   # Auth state persistence
│   ├── storage/
│   │   ├── database.ts     # SQLite setup + migrations
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
│   └── lib/                # Utilities, types
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
- Chat list virtualized with react-window for 1000+ chats
- Messages lazy-loaded: fetch 50 at a time, load more on scroll up
- Media: thumbnails on download, full resolution on click
