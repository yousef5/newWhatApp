import { getDatabase } from './database'
import type { Chat } from '@shared/types'

export class ChatStore {
  constructor(private accountId: string) {}

  private get db() {
    return getDatabase(this.accountId)
  }

  getAll(): Chat[] {
    const rows = this.db.prepare(`
      SELECT
        c.*,
        COALESCE(c.name, gm.subject, ct.name, ct.saved_name) as resolved_name
      FROM chats c
      LEFT JOIN contacts ct ON c.jid = ct.jid
      LEFT JOIN group_metadata gm ON c.jid = gm.jid
      WHERE c.archived = 0
        AND c.jid != 'status@broadcast'
      ORDER BY c.pinned DESC, c.last_message_timestamp DESC
    `).all() as any[]
    return rows.map(this.mapRow)
  }

  get(jid: string): Chat | null {
    const row = this.db.prepare(`
      SELECT
        c.*,
        COALESCE(c.name, gm.subject, ct.name, ct.saved_name) as resolved_name
      FROM chats c
      LEFT JOIN contacts ct ON c.jid = ct.jid
      LEFT JOIN group_metadata gm ON c.jid = gm.jid
      WHERE c.jid = ?
    `).get(jid) as any
    return row ? this.mapRow(row) : null
  }

  upsert(chat: Partial<Chat> & { jid: string }): void {
    this.db.prepare(`
      INSERT INTO chats (jid, name, is_group, unread_count, last_message_timestamp, last_message_preview, muted_until, pinned, archived)
      VALUES (@jid, @name, @isGroup, @unreadCount, @lastMessageTimestamp, @lastMessagePreview, @mutedUntil, @pinned, @archived)
      ON CONFLICT(jid) DO UPDATE SET
        name = COALESCE(@name, name),
        is_group = COALESCE(@isGroup, is_group),
        unread_count = COALESCE(@unreadCount, unread_count),
        last_message_timestamp = COALESCE(@lastMessageTimestamp, last_message_timestamp),
        last_message_preview = COALESCE(@lastMessagePreview, last_message_preview),
        muted_until = COALESCE(@mutedUntil, muted_until),
        pinned = COALESCE(@pinned, pinned),
        archived = COALESCE(@archived, archived)
    `).run({
      jid: chat.jid,
      name: chat.name ?? null,
      isGroup: chat.isGroup ? 1 : 0,
      unreadCount: chat.unreadCount ?? 0,
      lastMessageTimestamp: chat.lastMessageTimestamp ?? null,
      lastMessagePreview: chat.lastMessagePreview ?? null,
      mutedUntil: chat.mutedUntil ?? 0,
      pinned: chat.pinned ? 1 : 0,
      archived: chat.archived ? 1 : 0,
    })
  }

  incrementUnread(jid: string): void {
    this.db.prepare('UPDATE chats SET unread_count = unread_count + 1 WHERE jid = ?').run(jid)
  }

  markRead(jid: string): void {
    this.db.prepare('UPDATE chats SET unread_count = 0 WHERE jid = ?').run(jid)
  }

  setMuted(jid: string, until: number): void {
    this.db.prepare('UPDATE chats SET muted_until = ? WHERE jid = ?').run(until, jid)
  }

  delete(jid: string): void {
    this.db.prepare('DELETE FROM chats WHERE jid = ?').run(jid)
  }

  private mapRow(row: any): Chat {
    return {
      jid: row.jid,
      name: row.resolved_name ?? row.name,
      isGroup: !!row.is_group,
      unreadCount: row.unread_count,
      lastMessageTimestamp: row.last_message_timestamp,
      lastMessagePreview: row.last_message_preview,
      mutedUntil: row.muted_until,
      pinned: !!row.pinned,
      archived: !!row.archived,
    }
  }
}
