import { ipcMain, BrowserWindow, session } from 'electron'
import {
  loadConfig,
  updateSettings,
  createAccount,
  removeAccount,
  renameAccount,
  reorderAccounts,
  listAccounts,
} from '../storage/config'
import type { IPCCommands } from '@shared/types'

export function registerIPCHandlers(): void {
  // ── Window controls ────────────────────────────────────────────────────────

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // ── Account handlers ───────────────────────────────────────────────────────

  ipcMain.handle('account:create', (_event, payload: IPCCommands['account:create']['payload']) => {
    const account = createAccount(payload.name)
    // Setup permissions for the new account's webview partition
    const ses = session.fromPartition(`persist:wa-${account.id}`)
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      const allowed = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock', 'fullscreen']
      callback(allowed.includes(permission))
    })
    ses.setPermissionCheckHandler((_wc, permission) => {
      const allowed = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock', 'fullscreen']
      return allowed.includes(permission)
    })
    ses.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    return account
  })

  ipcMain.handle('account:remove', async (_event, payload: IPCCommands['account:remove']['payload']) => {
    removeAccount(payload.id)
    // Clear the webview session data for removed account
    try {
      const ses = session.fromPartition(`persist:wa-${payload.id}`)
      await ses.clearStorageData()
      await ses.clearCache()
    } catch {}
  })

  ipcMain.handle('account:rename', (_event, payload: IPCCommands['account:rename']['payload']) => {
    renameAccount(payload.id, payload.name)
  })

  ipcMain.handle('account:reorder', (_event, payload: IPCCommands['account:reorder']['payload']) => {
    reorderAccounts(payload.ids)
  })

  ipcMain.handle('account:list', () => {
    return listAccounts()
  })

  // ── Config handlers ────────────────────────────────────────────────────────

  ipcMain.handle('config:get', () => {
    return loadConfig()
  })

  ipcMain.handle('config:update', (_event, payload: IPCCommands['config:update']['payload']) => {
    updateSettings(payload.settings)
  })
}
