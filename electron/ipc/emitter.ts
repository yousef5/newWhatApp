import { BrowserWindow } from 'electron'
import type { IPCEventChannel, IPCEvents } from '@shared/types'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

export function emitToRenderer<C extends IPCEventChannel>(
  channel: C,
  data: IPCEvents[C]
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}
