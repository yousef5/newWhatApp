import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { getAccountDir } from './config'

const dbInstances = new Map<string, Database.Database>()

export function getDatabase(accountId: string): Database.Database {
  const existing = dbInstances.get(accountId)
  if (existing) return existing

  const dbPath = join(getAccountDir(accountId), 'messages.db')
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  dbInstances.set(accountId, db)
  return db
}

export function closeDatabase(accountId: string): void {
  const db = dbInstances.get(accountId)
  if (db) {
    db.close()
    dbInstances.delete(accountId)
  }
}

export function closeAllDatabases(): void {
  for (const [, db] of dbInstances) {
    db.close()
  }
  dbInstances.clear()
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      jid TEXT PRIMARY KEY,
      name TEXT,
      is_group INTEGER NOT NULL DEFAULT 0,
      unread_count INTEGER NOT NULL DEFAULT 0,
      last_message_timestamp INTEGER,
      last_message_preview TEXT,
      muted_until INTEGER DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_jid TEXT NOT NULL REFERENCES chats(jid) ON DELETE CASCADE,
      sender_jid TEXT,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT,
      media_path TEXT,
      media_mime TEXT,
      media_size INTEGER,
      thumbnail_path TEXT,
      is_from_me INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'sent',
      starred INTEGER NOT NULL DEFAULT 0,
      quoted_message_id TEXT,
      quoted_message_preview TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chat_jid, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages(starred) WHERE starred = 1;

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content='messages',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END;
    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE OF content ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    CREATE TABLE IF NOT EXISTS contacts (
      jid TEXT PRIMARY KEY,
      name TEXT,
      saved_name TEXT,
      profile_picture_url TEXT,
      profile_picture_path TEXT,
      about TEXT,
      is_blocked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS group_metadata (
      jid TEXT PRIMARY KEY REFERENCES chats(jid) ON DELETE CASCADE,
      subject TEXT,
      description TEXT,
      owner_jid TEXT,
      participant_count INTEGER,
      participants_json TEXT,
      created_at INTEGER
    );
  `)
}
