import { ipcMain, BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import { accountManager } from '../accounts/manager'
import { loadConfig, updateSettings } from '../storage/config'
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

  ipcMain.handle('account:create', async (_event, payload: IPCCommands['account:create']['payload']) => {
    return accountManager.createAccount(payload.name)
  })

  ipcMain.handle('account:remove', async (_event, payload: IPCCommands['account:remove']['payload']) => {
    await accountManager.removeAccount(payload.id, payload.deleteData)
  })

  ipcMain.handle('account:rename', (_event, payload: IPCCommands['account:rename']['payload']) => {
    accountManager.renameAccount(payload.id, payload.name)
  })

  ipcMain.handle('account:reorder', (_event, payload: IPCCommands['account:reorder']['payload']) => {
    accountManager.reorderAccounts(payload.ids)
  })

  ipcMain.handle('account:reconnect', async (_event, payload: IPCCommands['account:reconnect']['payload']) => {
    await accountManager.reconnect(payload.id)
  })

  ipcMain.handle('account:list', () => {
    return accountManager.listAccounts()
  })

  // ── Chat handlers ──────────────────────────────────────────────────────────

  ipcMain.handle('chat:list', (_event, payload: IPCCommands['chat:list']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return []
    return session.getChats()
  })

  ipcMain.handle('chat:load', (_event, payload: IPCCommands['chat:load']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return []
    return session.getMessages(payload.jid, payload.before, payload.limit)
  })

  ipcMain.handle('chat:markRead', (_event, payload: IPCCommands['chat:markRead']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    session.markChatRead(payload.jid)
  })

  ipcMain.handle('chat:mute', (_event, payload: IPCCommands['chat:mute']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    session.muteChat(payload.jid, payload.until)
  })

  ipcMain.handle('chat:search', (_event, payload: IPCCommands['chat:search']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return []
    return session.searchMessages(payload.query, payload.jid)
  })

  // ── Message handlers ───────────────────────────────────────────────────────

  ipcMain.handle('message:send', async (_event, payload: IPCCommands['message:send']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) throw new Error(`No session for account ${payload.accountId}`)
    const sent = await session.sendMessage(payload.jid, payload.content)
    return { id: sent?.key?.id ?? '' }
  })

  ipcMain.handle('message:delete', async (_event, payload: IPCCommands['message:delete']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.sendMessage(payload.jid, {
      delete: { remoteJid: payload.jid, id: payload.messageId, fromMe: true },
    })
  })

  ipcMain.handle('message:star', (_event, payload: IPCCommands['message:star']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    session.starMessage(payload.messageId, payload.starred)
  })

  ipcMain.handle('message:forward', async (_event, payload: IPCCommands['message:forward']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) throw new Error(`No session for account ${payload.accountId}`)
    const msg = session.getMessage(payload.messageId)
    const sent = await session.sendMessage(payload.toJid, { text: msg?.content ?? '' })
    return { id: sent?.key?.id ?? '' }
  })

  // ── Contact handlers ───────────────────────────────────────────────────────

  ipcMain.handle('contact:get', (_event, payload: IPCCommands['contact:get']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return null
    return session.getContact(payload.jid)
  })

  ipcMain.handle('contact:block', async (_event, payload: IPCCommands['contact:block']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.updateBlockStatus(payload.jid, 'block')
  })

  ipcMain.handle('contact:unblock', async (_event, payload: IPCCommands['contact:unblock']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.updateBlockStatus(payload.jid, 'unblock')
  })

  // ── Group handlers ─────────────────────────────────────────────────────────

  ipcMain.handle('group:info', (_event, payload: IPCCommands['group:info']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return null
    return session.getGroupInfo(payload.jid)
  })

  // ── Media handlers ─────────────────────────────────────────────────────────

  ipcMain.handle('media:download', (_event, payload: IPCCommands['media:download']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return { path: '' }
    const msg = session.getMessage(payload.messageId)
    return { path: msg?.mediaPath ?? '' }
  })

  ipcMain.handle('media:send', async (_event, payload: IPCCommands['media:send']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) throw new Error(`No session for account ${payload.accountId}`)
    const socket = session.getSocket()
    if (!socket) throw new Error(`Socket not connected for account ${payload.accountId}`)

    const fileBuffer = readFileSync(payload.filePath)

    let messageContent: any

    switch (payload.type) {
      case 'image':
        messageContent = { image: fileBuffer }
        break
      case 'video':
        messageContent = { video: fileBuffer }
        break
      case 'audio':
        messageContent = { audio: fileBuffer }
        break
      case 'document':
      default:
        messageContent = { document: fileBuffer }
        break
    }

    const sent = await socket.sendMessage(payload.jid, messageContent)
    return { id: sent?.key?.id ?? '' }
  })

  // ── Config handlers ────────────────────────────────────────────────────────

  ipcMain.handle('config:get', () => {
    return loadConfig()
  })

  ipcMain.handle('config:update', (_event, payload: IPCCommands['config:update']['payload']) => {
    updateSettings(payload.settings)
  })
}
