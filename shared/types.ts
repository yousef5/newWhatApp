// ============ Account ============

export interface Account {
  id: string              // UUID v4
  name: string            // User-assigned label (e.g., "Personal", "Work")
  avatarColor: string     // Hex color for sidebar avatar
  createdAt: string       // ISO 8601
  order: number           // Sidebar display order
}

// ============ Config ============

export interface AppConfig {
  accounts: Account[]
  settings: AppSettings
}

export interface AppSettings {
  theme: 'dark'
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
    closeToTray: true,
    window: {
      width: 1200,
      height: 800,
      maximized: false,
    },
  },
}

// ============ IPC Channels ============

// Renderer -> Main (invoke)
export type IPCCommands = {
  'account:create': { payload: { name: string }; response: Account }
  'account:remove': { payload: { id: string }; response: void }
  'account:rename': { payload: { id: string; name: string }; response: void }
  'account:reorder': { payload: { ids: string[] }; response: void }
  'account:list': { payload: void; response: Account[] }
  'config:get': { payload: void; response: AppConfig }
  'config:update': { payload: { settings: Partial<AppSettings> }; response: void }
}

// Type-safe IPC helper types
export type IPCChannel = keyof IPCCommands
