import { getDatabase } from './database'
import type { Message, SearchResult } from '@shared/types'

export class MessageStore {
  constructor(private accountId: string) {}

  private get db() {
    return getDatabase(this.accountId)
  }

  getForChat(chatJid: string, before?: number, limit = 50): Message[] {
    let query = 'SELECT * FROM messages WHERE chat_jid = ?'
    const params: any[] = [chatJid]

    if (before) {
      query += ' AND timestamp < ?'
      params.push(before)
    }

    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const rows = this.db.prepare(query).all(...params) as any[]
    return rows.map(this.mapRow).reverse()
  }

  get(id: string): Message | null {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any
    return row ? this.mapRow(row) : null
  }

  insert(msg: Message): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO messages
        (id, chat_jid, sender_jid, timestamp, type, content, media_path, media_mime, media_size,
         thumbnail_path, is_from_me, status, starred, quoted_message_id, quoted_message_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id, msg.chatJid, msg.senderJid, msg.timestamp, msg.type, msg.content,
      msg.mediaPath, msg.mediaMime, msg.mediaSize, msg.thumbnailPath,
      msg.isFromMe ? 1 : 0, msg.status, msg.starred ? 1 : 0,
      msg.quotedMessageId, msg.quotedMessagePreview
    )
  }

  updateStatus(id: string, status: string): void {
    this.db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id)
  }

  setStar(id: string, starred: boolean): void {
    this.db.prepare('UPDATE messages SET starred = ? WHERE id = ?').run(starred ? 1 : 0, id)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id)
  }

  updateMediaPath(id: string, mediaPath: string, thumbnailPath: string | null): void {
    this.db.prepare('UPDATE messages SET media_path = ?, thumbnail_path = ? WHERE id = ?').run(mediaPath, thumbnailPath, id)
  }

  getStarred(chatJid?: string): Message[] {
    let query = 'SELECT * FROM messages WHERE starred = 1'
    const params: any[] = []
    if (chatJid) {
      query += ' AND chat_jid = ?'
      params.push(chatJid)
    }
    query += ' ORDER BY timestamp DESC'
    return (this.db.prepare(query).all(...params) as any[]).map(this.mapRow)
  }

  search(query: string, chatJid?: string): SearchResult[] {
    let sql = `
      SELECT m.id, m.chat_jid, c.name as chat_name, m.content, m.timestamp, m.is_from_me
      FROM messages m
      JOIN messages_fts fts ON fts.rowid = m.rowid
      JOIN chats c ON c.jid = m.chat_jid
      WHERE messages_fts MATCH ?
    `
    const params: any[] = [query]
    if (chatJid) {
      sql += ' AND m.chat_jid = ?'
      params.push(chatJid)
    }
    sql += ' ORDER BY m.timestamp DESC LIMIT 100'

    return (this.db.prepare(sql).all(...params) as any[]).map((row: any) => ({
      messageId: row.id,
      chatJid: row.chat_jid,
      chatName: row.chat_name,
      content: row.content,
      timestamp: row.timestamp,
      isFromMe: !!row.is_from_me,
    }))
  }

  private mapRow(row: any): Message {
    return {
      id: row.id,
      chatJid: row.chat_jid,
      senderJid: row.sender_jid,
      timestamp: row.timestamp,
      type: row.type,
      content: row.content,
      mediaPath: row.media_path,
      mediaMime: row.media_mime,
      mediaSize: row.media_size,
      thumbnailPath: row.thumbnail_path,
      isFromMe: !!row.is_from_me,
      status: row.status,
      starred: !!row.starred,
      quotedMessageId: row.quoted_message_id,
      quotedMessagePreview: row.quoted_message_preview,
    }
  }
}
