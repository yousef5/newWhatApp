import { contextBridge, ipcRenderer } from 'electron'
import type { IPCChannel, IPCCommands, IPCEventChannel, IPCEvents } from '@shared/types'

const api = {
  invoke: <C extends IPCChannel>(
    channel: C,
    payload: IPCCommands[C]['payload']
  ): Promise<IPCCommands[C]['response']> => {
    return ipcRenderer.invoke(channel, payload)
  },

  on: <C extends IPCEventChannel>(
    channel: C,
    callback: (data: IPCEvents[C]) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IPCEvents[C]) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
