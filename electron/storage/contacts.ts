import { getDatabase } from './database'
import type { Contact, GroupMetadata } from '@shared/types'

export class ContactStore {
  constructor(private accountId: string) {}

  private get db() {
    return getDatabase(this.accountId)
  }

  getContact(jid: string): Contact | null {
    const row = this.db.prepare('SELECT * FROM contacts WHERE jid = ?').get(jid) as any
    return row ? this.mapContactRow(row) : null
  }

  upsertContact(contact: Partial<Contact> & { jid: string }): void {
    this.db.prepare(`
      INSERT INTO contacts (jid, name, saved_name, profile_picture_url, profile_picture_path, about, is_blocked)
      VALUES (@jid, @name, @savedName, @profilePictureUrl, @profilePicturePath, @about, @isBlocked)
      ON CONFLICT(jid) DO UPDATE SET
        name = COALESCE(@name, name),
        saved_name = COALESCE(@savedName, saved_name),
        profile_picture_url = COALESCE(@profilePictureUrl, profile_picture_url),
        profile_picture_path = COALESCE(@profilePicturePath, profile_picture_path),
        about = COALESCE(@about, about),
        is_blocked = COALESCE(@isBlocked, is_blocked)
    `).run({
      jid: contact.jid,
      name: contact.name ?? null,
      savedName: contact.savedName ?? null,
      profilePictureUrl: contact.profilePictureUrl ?? null,
      profilePicturePath: contact.profilePicturePath ?? null,
      about: contact.about ?? null,
      isBlocked: contact.isBlocked ? 1 : 0,
    })
  }

  setBlocked(jid: string, blocked: boolean): void {
    this.db.prepare('UPDATE contacts SET is_blocked = ? WHERE jid = ?').run(blocked ? 1 : 0, jid)
  }

  getGroupMetadata(jid: string): GroupMetadata | null {
    const row = this.db.prepare('SELECT * FROM group_metadata WHERE jid = ?').get(jid) as any
    if (!row) return null
    return {
      jid: row.jid,
      subject: row.subject,
      description: row.description,
      ownerJid: row.owner_jid,
      participantCount: row.participant_count,
      participants: JSON.parse(row.participants_json || '[]'),
      createdAt: row.created_at,
    }
  }

  upsertGroupMetadata(meta: GroupMetadata): void {
    this.db.prepare(`
      INSERT INTO group_metadata (jid, subject, description, owner_jid, participant_count, participants_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(jid) DO UPDATE SET
        subject = excluded.subject,
        description = excluded.description,
        owner_jid = excluded.owner_jid,
        participant_count = excluded.participant_count,
        participants_json = excluded.participants_json,
        created_at = excluded.created_at
    `).run(
      meta.jid, meta.subject, meta.description, meta.ownerJid,
      meta.participantCount, JSON.stringify(meta.participants), meta.createdAt
    )
  }

  private mapContactRow(row: any): Contact {
    return {
      jid: row.jid,
      name: row.name,
      savedName: row.saved_name,
      profilePictureUrl: row.profile_picture_url,
      profilePicturePath: row.profile_picture_path,
      about: row.about,
      isBlocked: !!row.is_blocked,
    }
  }
}
