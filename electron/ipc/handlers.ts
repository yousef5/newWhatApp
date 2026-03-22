import { ipcMain, BrowserWindow } from 'electron'
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
    return createAccount(payload.name)
  })

  ipcMain.handle('account:remove', (_event, payload: IPCCommands['account:remove']['payload']) => {
    removeAccount(payload.id)
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
