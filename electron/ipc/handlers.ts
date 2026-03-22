import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
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

  ipcMain.handle('message:getStarred', (_event, payload: IPCCommands['message:getStarred']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return []
    return session.getStarredMessages(payload.jid)
  })

  ipcMain.handle('chat:export', async (event, payload: IPCCommands['chat:export']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return { filePath: '' }

    const messages = session.getMessages(payload.jid, undefined, 100000)
    const chat = session.getChats().find((c) => c.jid === payload.jid)
    const chatName = chat?.name || payload.jid

    const lines = messages.map((msg) => {
      const date = new Date(msg.timestamp * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      const sender = msg.isFromMe ? 'You' : (msg.senderJid?.split('@')[0] || 'Unknown')
      const content = msg.content || `[${msg.type}]`
      return `${dateStr} ${timeStr} - ${sender}: ${content}`
    })

    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `${chatName.replace(/[^a-zA-Z0-9]/g, '_')}_chat_export.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
    })

    if (result.canceled || !result.filePath) {
      return { filePath: '' }
    }

    writeFileSync(result.filePath, lines.join('\n'), 'utf-8')
    return { filePath: result.filePath }
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

  ipcMain.handle('group:addParticipant', async (_event, payload: IPCCommands['group:addParticipant']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupParticipantsUpdate(payload.jid, [payload.participantJid], 'add')
  })

  ipcMain.handle('group:removeParticipant', async (_event, payload: IPCCommands['group:removeParticipant']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupParticipantsUpdate(payload.jid, [payload.participantJid], 'remove')
  })

  ipcMain.handle('group:promoteAdmin', async (_event, payload: IPCCommands['group:promoteAdmin']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupParticipantsUpdate(payload.jid, [payload.participantJid], 'promote')
  })

  ipcMain.handle('group:demoteAdmin', async (_event, payload: IPCCommands['group:demoteAdmin']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupParticipantsUpdate(payload.jid, [payload.participantJid], 'demote')
  })

  ipcMain.handle('group:updateSubject', async (_event, payload: IPCCommands['group:updateSubject']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupUpdateSubject(payload.jid, payload.subject)
  })

  ipcMain.handle('group:updateDescription', async (_event, payload: IPCCommands['group:updateDescription']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) return
    const socket = session.getSocket()
    if (!socket) return
    await socket.groupUpdateDescription(payload.jid, payload.description)
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

  ipcMain.handle('media:convertVoice', async (_event, payload: IPCCommands['media:convertVoice']['payload']) => {
    const session = accountManager.getSession(payload.accountId)
    if (!session) throw new Error(`No session for account ${payload.accountId}`)
    const socket = session.getSocket()
    if (!socket) throw new Error(`Socket not connected for account ${payload.accountId}`)

    // Save raw audio to a temp file
    const buffer = Buffer.from(payload.audioBuffer)
    const tmpPath = join(tmpdir(), `voice-${Date.now()}.webm`)
    writeFileSync(tmpPath, buffer)

    // TODO: Convert to opus/ogg using ffmpeg for better compatibility
    // For now, send the raw webm audio as a voice message (ptt = push to talk)
    const sent = await socket.sendMessage(payload.jid, {
      audio: readFileSync(tmpPath),
      mimetype: 'audio/webm; codecs=opus',
      ptt: true,
    })

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
