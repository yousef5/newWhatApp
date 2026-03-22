# MultiWhatsApp Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-account WhatsApp desktop client using Electron + React + Baileys with unlimited account support and a modern dark UI.

**Architecture:** Two-layer Electron app — main process runs Baileys sessions and SQLite storage, renderer process runs React UI. Communication via typed IPC bridge. Each account gets isolated storage (auth files, SQLite database, media cache).

**Tech Stack:** Electron 33+, React 19, TypeScript, Vite (electron-vite), Zustand, Tailwind CSS, @whiskeysockets/baileys, better-sqlite3, sharp, fluent-ffmpeg, react-window, emoji-mart

**Spec:** `docs/superpowers/specs/2026-03-22-multi-whatsapp-desktop-design.md`

---

## File Structure

```
newWhatApp/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── electron-vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── shared/
│   └── types.ts                          # All shared types: IPC contracts, data models, enums
├── electron/
│   ├── main.ts                           # Electron entry: window, tray, single instance, lifecycle
│   ├── preload.ts                        # contextBridge: exposes typed IPC API to renderer
│   ├── accounts/
│   │   ├── manager.ts                    # AccountManager: create/destroy/list sessions, idle tracking
│   │   ├── session.ts                    # BaileysSession: wraps single Baileys connection
│   │   └── auth-store.ts                 # Encrypted auth state read/write via safeStorage
│   ├── storage/
│   │   ├── config.ts                     # AppConfig: read/write ~/.newwhatsapp/config.json
│   │   ├── database.ts                   # SQLite setup: create DB, run migrations, WAL mode
│   │   ├── messages.ts                   # MessageStore: CRUD + FTS sync triggers
│   │   ├── contacts.ts                   # ContactStore: CRUD for contacts + groups
│   │   └── chats.ts                      # ChatStore: CRUD for chat list
│   ├── media/
│   │   └── handler.ts                    # MediaHandler: download, save, thumbnail, send
│   └── ipc/
│       ├── handlers.ts                   # Register all IPC handlers (routes commands to services)
│       └── emitter.ts                    # Helper to emit typed events to renderer
├── src/
│   ├── main.tsx                          # React entry point
│   ├── App.tsx                           # App shell: sidebar + active account view
│   ├── index.css                         # Tailwind imports + global styles
│   ├── stores/
│   │   ├── accounts.ts                   # Zustand: account list, active account, connection state
│   │   ├── chats.ts                      # Zustand: chat list for active account
│   │   └── messages.ts                   # Zustand: messages for active chat
│   ├── hooks/
│   │   ├── useIPC.ts                     # Hook: send IPC commands, subscribe to events
│   │   └── useAccounts.ts               # Hook: account switching, connection state
│   ├── components/
│   │   ├── AccountSidebar/
│   │   │   ├── AccountSidebar.tsx        # Sidebar container: account list + add button + settings
│   │   │   └── AccountAvatar.tsx         # Single account avatar with badge/status dot
│   │   ├── ChatList/
│   │   │   ├── ChatList.tsx              # Virtualized chat list with search + filters
│   │   │   ├── ChatListItem.tsx          # Single chat row: avatar, name, preview, time, badge
│   │   │   └── ChatListHeader.tsx        # Account name, status, search bar, filter pills
│   │   ├── MessageView/
│   │   │   ├── MessageView.tsx           # Container: header + messages + input
│   │   │   ├── MessageBubble.tsx         # Single message: text, media, document, status
│   │   │   ├── MessageInput.tsx          # Text input + emoji + attachment + voice + send
│   │   │   ├── MessageList.tsx           # Virtualized scrollable message list
│   │   │   └── ChatHeader.tsx            # Contact info bar at top of message view
│   │   ├── QRLogin/
│   │   │   └── QRLogin.tsx              # QR code overlay for new account pairing
│   │   ├── Settings/
│   │   │   └── Settings.tsx             # Settings panel (notifications, accounts, storage)
│   │   └── shared/
│   │       ├── EmptyState.tsx           # "Select a chat" / "No messages" placeholders
│   │       └── ConnectionBanner.tsx     # Reconnecting / offline banners
│   └── lib/
│       ├── utils.ts                     # Format time, truncate text, generate avatar color
│       └── constants.ts                 # Color palette, keyboard shortcut mappings
└── resources/
    └── icon.png                         # App icon (256x256)
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Electron-Vite Project

**Files:**
- Create: `package.json`
- Create: `electron-vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `.gitignore`
- Create: `tailwind.config.js`, `postcss.config.js`
- Create: `src/index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Initialize npm and install all dependencies**

```bash
cd /mnt/joe-data/Coding/newWhatApp
npm init -y
npm install electron electron-vite vite react react-dom @whiskeysockets/baileys better-sqlite3 sharp zustand react-window emoji-mart @emoji-mart/react @emoji-mart/data qrcode uuid @hapi/boom fluent-ffmpeg ffmpeg-static
npm install -D typescript @types/react @types/react-dom @types/node @types/better-sqlite3 @types/react-window @types/uuid @types/fluent-ffmpeg tailwindcss postcss autoprefixer @vitejs/plugin-react
```

- [ ] **Step 2: Create electron-vite.config.ts**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('shared') }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@shared': resolve('shared') }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('shared'),
        '@': resolve('src')
      }
    },
    plugins: [react()]
  }
})
```

- [ ] **Step 3: Create TypeScript configs**

`tsconfig.json` references `tsconfig.node.json` and `tsconfig.web.json`.
`tsconfig.node.json` covers `electron/` and `shared/` with ESNext module.
`tsconfig.web.json` covers `src/` and `shared/` with JSX react-jsx.
Both use strict mode, path aliases for `@shared/*` and `@/*`.

- [ ] **Step 4: Create Tailwind config with custom dark theme colors**

Custom colors: `bg-primary (#0d1117)`, `bg-secondary (#161b22)`, `bg-tertiary (#21262d)`, `bg-sidebar (#010409)`, `accent-purple (#7c3aed)`, `accent-blue (#3b82f6)`, `accent-green (#3fb950)`, `accent-red (#f85149)`, `text-primary (#f0f6fc)`, `text-secondary (#8b949e)`, `text-muted (#484f58)`, `bubble-incoming (#161b22)`, `bubble-outgoing (#7c3aed)`.

- [ ] **Step 5: Create minimal renderer entry**

`src/index.html` — basic HTML with `<div id="root">` and Tailwind body classes.
`src/index.css` — Tailwind directives + scrollbar styling + overflow hidden on body.
`src/main.tsx` — React 19 createRoot rendering `<App />`.
`src/App.tsx` — placeholder div with "MultiWhatsApp — Loading..." text.

- [ ] **Step 6: Update .gitignore**

Add: `node_modules/`, `dist/`, `out/`, `*.db`, `*.db-wal`, `*.db-shm`

- [ ] **Step 7: Add npm scripts to package.json**

`"main": "./out/main/index.js"`, scripts: `dev`, `build`, `preview` via electron-vite.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron-Vite project with React + Tailwind"
```

---

### Task 2: Shared Types

**Files:**
- Create: `shared/types.ts`

- [ ] **Step 1: Write all shared type definitions**

Define all types from the spec:
- `Account`, `AccountWithState`, `ConnectionState`
- `Chat`
- `Message`, `MessageType`, `MessageStatus`, `MessageContent`, `MediaType`
- `Contact`
- `GroupMetadata`, `GroupParticipant`
- `PresenceData`
- `SearchResult`
- `AppConfig`, `AppSettings`, `DEFAULT_CONFIG`
- `IPCCommands` (all renderer-to-main invoke channels with payload/response types)
- `IPCEvents` (all main-to-renderer event channels with payload types)
- Helper types: `IPCChannel`, `IPCEventChannel`

Full type definitions match the IPC contract and database schema from the spec exactly.

**Note:** The following IPC channels are additions beyond the spec's IPC table (necessary for the app to function):
- `account:list` — load all accounts with connection state on startup
- `chat:list` — load chat list when switching accounts
- `contact:get` — load contact info for chat header
- `config:get` / `config:update` — settings panel read/write
- `message:getStarred` — starred messages view (added in Task 22)
- `chat:export` — chat export feature (added in Task 22)
- Group admin channels (added in Task 21)

- [ ] **Step 2: Commit**

```bash
git add shared/
git commit -m "feat: add shared TypeScript types for IPC, data models, and config"
```

---

### Task 3: Electron Main Process + Preload

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/ipc/emitter.ts`
- Create: `electron/ipc/handlers.ts` (placeholder)
- Create: `src/env.d.ts`

- [ ] **Step 1: Create IPC event emitter helper**

`electron/ipc/emitter.ts` — exports `setMainWindow()` and `emitToRenderer()` that type-safely sends events to the renderer BrowserWindow.

- [ ] **Step 2: Create Electron main entry**

`electron/main.ts`:
- Single instance lock via `app.requestSingleInstanceLock()`
- `createWindow()`: reads config for window bounds, creates BrowserWindow with frameless title bar, context isolation, preload script, `minWidth: 900`, `minHeight: 600`. Loads renderer URL (dev) or HTML file (prod).
- `createTray()`: system tray with Show/Quit context menu.
- Window close saves bounds to config. Supports close-to-tray behavior.
- On `app.whenReady()`: create window, create tray, connect all accounts.
- On `before-quit`: disconnect all accounts, close all databases.

- [ ] **Step 3: Create preload with typed IPC bridge**

`electron/preload.ts`:
- `contextBridge.exposeInMainWorld('api', { invoke, on, window: { minimize, maximize, close } })`
- `invoke<C>()` wraps `ipcRenderer.invoke` with channel + payload typing.
- `on<C>()` wraps `ipcRenderer.on`, returns unsubscribe function.
- Export `ElectronAPI` type for renderer.

- [ ] **Step 4: Create env.d.ts for renderer**

`src/env.d.ts` — declares `Window.api: ElectronAPI` globally.

- [ ] **Step 5: Create placeholder IPC handlers**

`electron/ipc/handlers.ts` — registers window control handlers (minimize, maximize, close). Account/chat/message handlers added in Task 11.

- [ ] **Step 6: Verify app launches**

Run: `npm run dev`
Expected: Electron window opens with dark background and placeholder text.

- [ ] **Step 7: Commit**

```bash
git add electron/ src/env.d.ts
git commit -m "feat: add Electron main process, preload IPC bridge, and window management"
```

---

## Phase 2: Storage Layer

### Task 4: Config Storage

**Files:**
- Create: `electron/storage/config.ts`

- [ ] **Step 1: Implement config read/write**

`electron/storage/config.ts`:
- `DATA_DIR = ~/.newwhatsapp`, `CONFIG_PATH = ~/.newwhatsapp/config.json`
- `getDataDir()`, `getAccountDir(id)`, `ensureDataDir()`
- `loadConfig()`: reads JSON, returns parsed `AppConfig` or `DEFAULT_CONFIG` if missing/corrupt.
- `saveConfig(config)`: writes JSON with pretty print.
- `updateSettings(updates)`: merges partial settings, saves, returns config.

- [ ] **Step 2: Commit**

```bash
git add electron/storage/config.ts
git commit -m "feat: add config.json storage with read/write/defaults"
```

---

### Task 5: SQLite Database Setup

**Files:**
- Create: `electron/storage/database.ts`

- [ ] **Step 1: Implement database initialization with full schema**

`electron/storage/database.ts`:
- `dbInstances` map keyed by accountId.
- `getDatabase(accountId)`: creates/returns DB at `~/.newwhatsapp/accounts/{id}/messages.db`, enables WAL + foreign keys, runs migrations.
- `closeDatabase(accountId)`, `closeAllDatabases()`.
- `runMigrations(db)`: creates all tables (`chats`, `messages`, `contacts`, `group_metadata`), indexes, FTS5 virtual table, and FTS sync triggers (insert/delete/update).
- Schema matches spec exactly.

- [ ] **Step 2: Commit**

```bash
git add electron/storage/database.ts
git commit -m "feat: add SQLite database setup with schema, migrations, and FTS triggers"
```

---

### Task 6: Message, Chat, and Contact Stores

**Files:**
- Create: `electron/storage/chats.ts`
- Create: `electron/storage/messages.ts`
- Create: `electron/storage/contacts.ts`

- [ ] **Step 1: Implement ChatStore**

`electron/storage/chats.ts` — class with methods: `getAll()` (sorted by pinned then timestamp), `get(jid)`, `upsert(chat)` (INSERT OR UPDATE), `incrementUnread(jid)`, `markRead(jid)`, `setMuted(jid, until)`, `delete(jid)`. Maps DB rows to `Chat` type.

- [ ] **Step 2: Implement MessageStore**

`electron/storage/messages.ts` — class with methods: `getForChat(jid, before?, limit)` (cursor pagination by timestamp DESC), `get(id)`, `insert(msg)`, `updateStatus(id, status)`, `setStar(id, starred)`, `delete(id)`, `getStarred(jid?)`, `search(query, jid?)` (uses FTS5 MATCH, joins chats for name, returns `SearchResult[]`).

- [ ] **Step 3: Implement ContactStore**

`electron/storage/contacts.ts` — class with methods: `getContact(jid)`, `upsertContact(contact)`, `setBlocked(jid, blocked)`, `getGroupMetadata(jid)`, `upsertGroupMetadata(meta)` (JSON serializes participants array).

- [ ] **Step 4: Commit**

```bash
git add electron/storage/
git commit -m "feat: add SQLite stores for chats, messages (with FTS search), and contacts"
```

---

## Phase 3: Baileys Integration

### Task 7: Encrypted Auth Store

**Files:**
- Create: `electron/accounts/auth-store.ts`

- [ ] **Step 1: Implement encrypted auth state**

`electron/accounts/auth-store.ts`:
- `createAuthState(accountId)`: returns `{ state: AuthenticationState, saveCreds }`.
- Auth dir at `~/.newwhatsapp/accounts/{id}/auth/` with 0700 permissions.
- `readData(file)`: reads encrypted file, decrypts via `safeStorage.decryptString()`, parses JSON with `BufferJSON.reviver`.
- `writeData(file, data)`: serializes with `BufferJSON.replacer`, encrypts via `safeStorage.encryptString()`, writes.
- Keys: `get(type, ids)` reads individual key files, handles `app-state-sync-key` proto deserialization. `set(data)` writes/deletes key files.
- `deleteAuthState(accountId)`: removes all files in auth dir.

- [ ] **Step 2: Commit**

```bash
git add electron/accounts/auth-store.ts
git commit -m "feat: add encrypted Baileys auth store using Electron safeStorage"
```

---

### Task 8: Baileys Session Wrapper

**Files:**
- Create: `electron/accounts/session.ts`

- [ ] **Step 1: Implement BaileysSession class**

`electron/accounts/session.ts` — class extending EventEmitter:
- Properties: `socket`, `connectionState`, stores (ChatStore, MessageStore, ContactStore).
- `connect()`: creates auth state, fetches Baileys version, creates WASocket. Registers event handlers:
  - `connection.update`: emits QR codes, handles open/close/connecting states, auto-reconnect with exponential backoff (max 5 retries), handles loggedOut by deleting auth.
  - `creds.update`: saves credentials.
  - `chats.upsert` / `chats.update`: upserts to ChatStore, emits `chat:update`.
  - `messages.upsert`: parses messages, stores in DB, handles `notify` (new) vs `prepend` (history), increments unread, sends notifications.
  - `messages.update`: maps status codes to strings, updates DB, emits `message:update`.
  - `contacts.upsert`: upserts to ContactStore.
  - `presence.update`: emits `presence:update`.
  - `groups.upsert`: upserts chat + group metadata.
- `disconnect()`: ends socket.
- `sendMessage(jid, content)`: sends via Baileys, supports text + quoted.
- Accessor methods: `getChats()`, `getMessages()`, `searchMessages()`, `getMessage()`, `getContact()`, `getGroupInfo()`, `markChatRead()`, `muteChat()`, `starMessage()`.
- `parseMessage(msg)`: extracts text/image/video/audio/document content, handles extended text, quoted messages, timestamps.

- [ ] **Step 2: Commit**

```bash
git add electron/accounts/session.ts
git commit -m "feat: add Baileys session wrapper with message parsing and event handling"
```

---

### Task 9: Account Manager

**Files:**
- Create: `electron/accounts/manager.ts`

- [ ] **Step 1: Implement AccountManager singleton**

`electron/accounts/manager.ts`:
- `sessions` map, `idleTimers` map, `activeAccountId`.
- `createAccount(name)`: generates UUID, picks avatar color, saves to config, creates + connects session.
- `removeAccount(id, deleteData)`: disconnects, closes DB, removes from config, optionally deletes directory.
- `renameAccount(id, name)`, `reorderAccounts(ids)`.
- `reconnect(id)`: disconnect + reconnect existing session, or create new one.
- `setActiveAccount(id)`: clears idle timer for active, ensures connected, starts idle timers for others.
- `getSession(id)`, `listAccounts()` (returns `AccountWithState[]`).
- `connectAll()`: iterates config accounts, creates sessions with 2-second stagger between connections.
- `disconnectAll()`: disconnects all, clears timers.
- `startIdleTimers()`: for non-active connected accounts, sets timeout to disconnect after configured idle minutes.
- Export singleton `accountManager`.

- [ ] **Step 2: Commit**

```bash
git add electron/accounts/manager.ts
git commit -m "feat: add AccountManager with multi-session lifecycle and idle management"
```

---

### Task 10: Media Handler

**Files:**
- Create: `electron/media/handler.ts`

- [ ] **Step 1: Implement MediaHandler**

`electron/media/handler.ts`:
- Media dir at `~/.newwhatsapp/accounts/{id}/media/`.
- `downloadMessage(msg)`: downloads via Baileys `downloadMediaMessage`, saves buffer to file named `{messageId}{ext}`. Generates 200x200 JPEG thumbnail via sharp for images/videos. Returns `{ mediaPath, thumbnailPath }`.
- `getMediaPath(messageId, ext)`.
- Helper: `getMediaType(msg)` and `getExtension(msg)` map Baileys message types to `MediaType` and file extensions via MIME lookup.

- [ ] **Step 2: Commit**

```bash
git add electron/media/handler.ts
git commit -m "feat: add media handler with download, thumbnail generation"
```

---

### Task 11: Complete IPC Handlers

**Files:**
- Modify: `electron/ipc/handlers.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Wire all IPC handlers to AccountManager**

`electron/ipc/handlers.ts` — register handlers for all IPC channels:
- Account: `account:create`, `account:remove`, `account:rename`, `account:reorder`, `account:reconnect`, `account:list`.
- Chat: `chat:list`, `chat:load`, `chat:markRead`, `chat:mute`, `chat:search`.
- Message: `message:send`, `message:delete`, `message:star`, `message:forward`.
- Contact: `contact:get`, `contact:block`, `contact:unblock`.
- Group: `group:info`.
- Media: `media:download`, `media:send` (reads file, sends appropriate Baileys message type).
- Config: `config:get`, `config:update`.

Each handler gets the session from `accountManager.getSession()`, calls the appropriate method, returns typed response.

- [ ] **Step 2: Update main.ts for startup + cleanup**

Add `accountManager.connectAll()` in `app.whenReady()`.
Add `accountManager.disconnectAll()` and `closeAllDatabases()` in `before-quit`.

- [ ] **Step 3: Commit**

```bash
git add electron/
git commit -m "feat: wire up all IPC handlers to AccountManager and Baileys sessions"
```

---

## Phase 4: Renderer UI

### Task 12: Zustand Stores + IPC Hooks

**Files:**
- Create: `src/stores/accounts.ts`
- Create: `src/stores/chats.ts`
- Create: `src/stores/messages.ts`
- Create: `src/hooks/useIPC.ts`
- Create: `src/hooks/useAccounts.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create utility functions**

`src/lib/utils.ts`: `formatTime(ts)` (relative: time/Yesterday/date), `formatFullTime(ts)` (HH:MM), `formatDate(ts)` (Today/Yesterday/full), `truncate(str, len)`, `getInitials(name)`, `formatFileSize(bytes)`.

`src/lib/constants.ts`: keyboard shortcut mappings.

- [ ] **Step 2: Create IPC hooks**

`src/hooks/useIPC.ts`:
- `useIPCInvoke()`: returns typed invoke function wrapping `window.api.invoke`.
- `useIPCEvent(channel, handler)`: subscribes via `window.api.on`, cleans up on unmount, uses ref for stable handler.

- [ ] **Step 3: Create Zustand stores**

`src/stores/accounts.ts`: accounts array, activeAccountId, actions: setAccounts, setActiveAccount, updateConnectionState, updateUnreadCount, incrementUnread.

`src/stores/chats.ts`: chats array, activeChatJid, filter ('all'|'unread'|'groups'), searchQuery, actions: setChats, setActiveChat, setFilter, setSearchQuery, updateChat, getFilteredChats (computed).

`src/stores/messages.ts`: messages array, loading, hasMore, actions: setMessages, prependMessages, addMessage, updateMessage, removeMessage, setLoading, setHasMore, clear.

- [ ] **Step 4: Create useAccounts hook**

`src/hooks/useAccounts.ts`:
- Loads accounts on mount via `account:list`.
- Subscribes to IPC events: `account:connection`, `account:idle`, `message:new`, `message:update`, `message:delete`, `chat:update`, `contact:update`.
- `switchAccount(id)`: sets active, clears messages, loads chats.
- Auto-marks chat read when viewing incoming messages.
- On `account:idle`: update connection state to 'close' for that account.
- On `contact:update`: update local contact data if viewing that contact's chat.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add Zustand stores, IPC hooks, and utility functions"
```

---

### Task 13: App Shell + Account Sidebar

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/AccountSidebar/AccountSidebar.tsx`
- Create: `src/components/AccountSidebar/AccountAvatar.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/ConnectionBanner.tsx`

- [ ] **Step 1: Create AccountAvatar**

Shows account initial in colored circle, green/gray/yellow status dot, red unread badge. Active state has purple border.

- [ ] **Step 2: Create AccountSidebar**

62px wide, bg-sidebar. App logo (gradient W), account avatars list (scrollable), "+" add button (dashed border), settings gear. All with proper hover states.

- [ ] **Step 3: Create shared components**

`EmptyState` — centered title + subtitle. `ConnectionBanner` — yellow "Reconnecting..." or red "Disconnected" with retry button.

- [ ] **Step 4: Update App.tsx**

Custom frameless title bar with minimize/maximize/close buttons (draggable area).
Layout: `AccountSidebar | ChatList | MessageView`.
Empty state when no accounts. QR overlay state. Settings overlay state.
Wires `useAccounts` hook for data + switching.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add App shell, AccountSidebar, and shared UI components"
```

---

### Task 14: Chat List Components

**Files:**
- Create: `src/components/ChatList/ChatList.tsx`
- Create: `src/components/ChatList/ChatListItem.tsx`
- Create: `src/components/ChatList/ChatListHeader.tsx`

- [ ] **Step 1: Create ChatListHeader**

Shows account name + connection status (green/yellow/red text). Search input. Filter pills (All/Unread/Groups) with purple active state.

- [ ] **Step 2: Create ChatListItem**

64px height. Avatar circle with initials, name (bold if unread), last message preview (truncated), relative timestamp, unread count badge (purple). Active state: purple left border + bg-secondary.

- [ ] **Step 3: Create ChatList container**

280px wide. Uses react-window `FixedSizeList` for virtualization. On chat click: sets active, loads messages via IPC, marks read. Shows "No chats found" empty state.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatList/
git commit -m "feat: add ChatList with virtualized list, search, and filter pills"
```

---

### Task 15: Message View Components

**Files:**
- Create: `src/components/MessageView/MessageView.tsx`
- Create: `src/components/MessageView/MessageBubble.tsx`
- Create: `src/components/MessageView/MessageInput.tsx`
- Create: `src/components/MessageView/MessageList.tsx`
- Create: `src/components/MessageView/ChatHeader.tsx`

- [ ] **Step 1: Create ChatHeader**

Shows contact avatar, name, presence (online/typing/recording in green text). Action buttons: search, attach.

- [ ] **Step 2: Create MessageBubble**

Purple for outgoing (rounded-tr-sm), dark card with border for incoming (rounded-tl-sm). Shows: sender name in groups, quoted message preview (left border), document attachment card, image thumbnail, audio player, text content, timestamp + delivery status (pending/sent/delivered/read icons). Failed messages show red "!" icon with retry and delete buttons.

- [ ] **Step 3: Create MessageList**

Scrollable container. Groups messages by date with centered date dividers. Auto-scrolls to bottom on new messages. Loads older messages on scroll to top (infinite scroll with scroll position preservation). Shows loading spinner.

- [ ] **Step 4: Create MessageInput**

Bottom bar: emoji button, attachment button, auto-growing textarea (Enter sends, Shift+Enter newline), send button (purple when text present) / mic button (when empty).

- [ ] **Step 5: Create MessageView container**

Flex column: ConnectionBanner (if disconnected) + ChatHeader + MessageList + MessageInput.
`handleSend`: invokes `message:send` IPC, adds optimistic local message with pending status.
`handleAttach`: placeholder for file picker.

- [ ] **Step 6: Commit**

```bash
git add src/components/MessageView/
git commit -m "feat: add MessageView with bubbles, input, chat header, and infinite scroll"
```

---

### Task 16: QR Login Component

**Files:**
- Create: `src/components/QRLogin/QRLogin.tsx`

- [ ] **Step 1: Create QR login overlay**

Full-screen overlay with backdrop blur. Card with: close button, "Link WhatsApp" title, instruction text, QR code rendered via `qrcode` library (dark theme colors), loading spinner while waiting for QR, green checkmark on connect, auto-closes after 1 second on success.

Subscribes to `account:qr` and `account:connection` IPC events.

- [ ] **Step 2: Commit**

```bash
git add src/components/QRLogin/
git commit -m "feat: add QR login overlay with real-time QR code rendering"
```

---

### Task 17: Settings Panel

**Files:**
- Create: `src/components/Settings/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Settings component**

Full-screen overlay. Sections:
- **Notifications**: enable toggle, sound toggle.
- **Behavior**: close-to-tray toggle, idle timeout number input.
- **Account Management**: list of accounts with rename (inline edit), remove (with confirm dialog "Delete data?" checkbox), drag-to-reorder.
- **Storage**: show media cache size per account, "Clear cache" button per account.
- **About**: version, ban risk disclaimer.

Loads config and account list on mount, updates via `config:update` and account IPC channels.

- [ ] **Step 2: Wire Settings into App.tsx**

Add Settings import and render conditionally when `showSettings` is true.

- [ ] **Step 3: Commit**

```bash
git add src/components/Settings/ src/App.tsx
git commit -m "feat: add Settings panel with notification, behavior, and about sections"
```

---

## Phase 5: Notifications + Window Polish

### Task 18: Desktop Notifications

**Files:**
- Modify: `electron/accounts/session.ts`

- [ ] **Step 1: Add notification to message handler**

In the `messages.upsert` handler, inside the `type === 'notify'` block for non-self messages: check `config.settings.notifications.enabled`, create Electron `Notification` with chat name as title and message content as body, respect sound setting via `silent` flag.

- [ ] **Step 2: Commit**

```bash
git add electron/accounts/session.ts
git commit -m "feat: add native OS notifications for incoming messages"
```

---

### Task 19: Window Title Bar + Final Polish

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Finalize custom title bar**

Ensure frameless window title bar has: drag area, minimize/maximize/close buttons with hover states (red hover on close). Content offset by 32px (title bar height).

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: finalize custom frameless window title bar"
```

---

### Task 20: Voice Note Recording

**Files:**
- Create: `src/components/MessageView/VoiceRecorder.tsx`
- Modify: `src/components/MessageView/MessageInput.tsx`
- Modify: `electron/ipc/handlers.ts`

- [ ] **Step 1: Create VoiceRecorder component**

`src/components/MessageView/VoiceRecorder.tsx`:
- Hold-to-record UI: mic button switches to recording state on mousedown, stops on mouseup.
- Uses `navigator.mediaDevices.getUserMedia({ audio: true })` to capture audio via MediaRecorder API.
- Shows recording duration timer and simple waveform visualization (analyser node).
- Max duration: 15 minutes (auto-stops).
- On release: sends audio buffer to main process via IPC for format conversion and sending.
- Cancel by sliding left (or pressing Escape).

- [ ] **Step 2: Wire VoiceRecorder into MessageInput**

Replace the mic button placeholder in MessageInput with VoiceRecorder. When no text is entered and mic is pressed, show recording UI. When text is present, show send button instead.

- [ ] **Step 3: Add voice note conversion IPC handler**

In `electron/ipc/handlers.ts`, add `media:convertVoice` handler:
- Receives audio buffer (webm/opus from browser MediaRecorder).
- Uses `fluent-ffmpeg` to convert to ogg/opus format (WhatsApp compatible).
- Saves to temp file, sends via Baileys as audio message with `ptt: true` flag.
- Returns message ID.

Note: `fluent-ffmpeg` requires ffmpeg binary installed on system. Add ffmpeg-static as a dependency.

- [ ] **Step 4: Install fluent-ffmpeg dependencies**

```bash
npm install fluent-ffmpeg ffmpeg-static
npm install -D @types/fluent-ffmpeg
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MessageView/ electron/ipc/handlers.ts
git commit -m "feat: add voice note recording with hold-to-record UI and ffmpeg conversion"
```

---

### Task 21: Group Admin Actions

**Files:**
- Create: `src/components/GroupInfo/GroupInfo.tsx`
- Modify: `electron/accounts/session.ts`
- Modify: `electron/ipc/handlers.ts`
- Modify: `shared/types.ts`

- [ ] **Step 1: Add group admin IPC channels to shared types**

Add to `IPCCommands` in `shared/types.ts`:
- `group:addParticipant`: `{ accountId, jid, participantJid }` → `void`
- `group:removeParticipant`: `{ accountId, jid, participantJid }` → `void`
- `group:promoteAdmin`: `{ accountId, jid, participantJid }` → `void`
- `group:demoteAdmin`: `{ accountId, jid, participantJid }` → `void`
- `group:updateSubject`: `{ accountId, jid, subject }` → `void`
- `group:updateDescription`: `{ accountId, jid, description }` → `void`

- [ ] **Step 2: Add Baileys group methods to session.ts**

Add methods to BaileysSession: `addGroupParticipant()`, `removeGroupParticipant()`, `promoteGroupAdmin()`, `demoteGroupAdmin()`, `updateGroupSubject()`, `updateGroupDescription()` — each calls the corresponding `socket.groupParticipantsUpdate()` or `socket.groupUpdateSubject()` / `socket.groupUpdateDescription()`.

- [ ] **Step 3: Register group admin IPC handlers**

Wire the new channels in `handlers.ts` to the session methods.

- [ ] **Step 4: Create GroupInfo panel**

`src/components/GroupInfo/GroupInfo.tsx`:
- Slide-in panel from right (or overlay) showing group details.
- Group subject, description (editable if admin), participant list.
- For admins: "Add participant" button, remove/promote/demote buttons per participant.
- Triggered by clicking group name in ChatHeader.

- [ ] **Step 5: Commit**

```bash
git add shared/types.ts electron/ src/components/GroupInfo/
git commit -m "feat: add group admin actions (add/remove participants, promote/demote, edit info)"
```

---

### Task 22: Chat Export + Starred Messages

**Files:**
- Create: `src/components/StarredMessages/StarredMessages.tsx`
- Modify: `electron/ipc/handlers.ts`
- Modify: `shared/types.ts`

- [ ] **Step 1: Add IPC channels for starred messages and chat export**

Add to `IPCCommands` in `shared/types.ts`:
- `message:getStarred`: `{ accountId, jid? }` → `Message[]`
- `chat:export`: `{ accountId, jid }` → `{ filePath: string }` (saves .txt file via dialog)

- [ ] **Step 2: Register IPC handlers**

`message:getStarred`: calls `session.messageStore.getStarred(jid)`.
`chat:export`: loads all messages for chat, formats as text (timestamp - sender: message), opens save dialog via `dialog.showSaveDialog()`, writes .txt file.

- [ ] **Step 3: Create StarredMessages panel**

`src/components/StarredMessages/StarredMessages.tsx`:
- Overlay panel showing list of starred messages across all chats (or filtered to current chat).
- Each item shows: chat name, message preview, timestamp.
- Click to jump to message in context (switch chat + scroll to message).
- Toggle star/unstar from this view.

- [ ] **Step 4: Wire into UI**

Add "Starred" option to ChatHeader menu dropdown. Add "Export chat" option to ChatHeader menu.

- [ ] **Step 5: Commit**

```bash
git add shared/types.ts electron/ src/components/StarredMessages/
git commit -m "feat: add starred messages panel and chat export to text file"
```

---

### Task 23: Keyboard Shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create keyboard shortcuts hook**

`src/hooks/useKeyboardShortcuts.ts`:
- Registers global keydown listener.
- Shortcuts:
  - `Ctrl+Tab` / `Ctrl+Shift+Tab`: next/previous account
  - `Ctrl+F`: focus search input in chat list
  - `Ctrl+N`: start new chat (focus search in chat list)
  - `Escape`: close active chat / close overlay
  - `Ctrl+1` through `Ctrl+9`: switch to account by index
  - `Ctrl+E`: export current chat
- Accepts callbacks for each action from the parent component.

- [ ] **Step 2: Wire into App.tsx**

Use `useKeyboardShortcuts` in App component, passing account switching, search focus, and overlay close handlers.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx
git commit -m "feat: add keyboard shortcuts for account switching, search, and navigation"
```

---

### Task 24: Error Handling UI

**Files:**
- Modify: `src/components/QRLogin/QRLogin.tsx`
- Modify: `src/components/MessageView/MessageBubble.tsx`
- Modify: `electron/accounts/manager.ts`

- [ ] **Step 1: QR expiry handling**

In `QRLogin.tsx`: track QR age with a timer. After 60 seconds without a new QR or connection, show "QR expired" message with a "Refresh" button that calls `account:reconnect` to restart the session and get a new QR.

- [ ] **Step 2: Failed message UI**

In `MessageBubble.tsx`: when `message.status === 'failed'`, show red "!" icon with tooltip "Failed to send". Add a retry button that re-invokes `message:send` with the same content, and a delete button that removes the local message.

- [ ] **Step 3: Duplicate account detection**

In `AccountManager.createAccount()`: after Baileys connects and phone number is known, check if any other account has the same phone number. If duplicate found, disconnect the new session, remove the account, and emit an error event to renderer.

- [ ] **Step 4: Startup error handling**

In `AccountManager.connectAll()`: wrap each `session.connect()` in try/catch. On failure, log error, set connection state to 'close', and continue to next account. The renderer already shows error badges via connection state.

- [ ] **Step 5: Commit**

```bash
git add src/components/ electron/accounts/manager.ts
git commit -m "feat: add error handling UI for QR expiry, failed messages, and duplicate accounts"
```

---

### Task 25: Final Integration + Verify

- [ ] **Step 1: Verify all dependencies installed**

Run: `npm install`

- [ ] **Step 2: Verify app compiles and launches**

Run: `npm run dev`
Expected: App opens with dark theme, empty sidebar with "+" button, "Welcome to MultiWhatsApp" message.

- [ ] **Step 3: Test add account flow**

Click "+" then QR code overlay should appear. Scan with phone. Should connect and show chats.

- [ ] **Step 4: Test chat flow**

Click a chat. Messages load. Type and send a message. Message appears with pending status. Status updates to sent/delivered.

- [ ] **Step 5: Test account switching**

Add second account. Click between account avatars. Chat list switches. Unread badges show on inactive account.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: complete v1 integration — multi-account WhatsApp desktop app"
git push origin main
```
