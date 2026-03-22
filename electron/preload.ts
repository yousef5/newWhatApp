import { contextBridge, ipcRenderer } from 'electron'
import type { IPCChannel, IPCCommands } from '@shared/types'

const api = {
  invoke: <C extends IPCChannel>(
    channel: C,
    payload: IPCCommands[C]['payload']
  ): Promise<IPCCommands[C]['response']> => {
    return ipcRenderer.invoke(channel, payload)
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
