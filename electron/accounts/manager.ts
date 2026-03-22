import { v4 as uuidv4 } from 'uuid'
import { rmSync } from 'fs'
import { BaileysSession } from './session'
import { loadConfig, saveConfig, getAccountDir } from '../storage/config'
import { closeDatabase } from '../storage/database'
import { emitToRenderer } from '../ipc/emitter'
import type { Account, AccountWithState } from '@shared/types'

const AVATAR_COLORS = [
  '#7c3aed', '#3b82f6', '#00a884', '#e040fb', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981',
]

class AccountManager {
  private sessions = new Map<string, BaileysSession>()
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private activeAccountId: string | null = null

  async createAccount(name: string): Promise<{ id: string }> {
    const id = uuidv4()
    const config = loadConfig()

    const colorIndex = config.accounts.length % AVATAR_COLORS.length
    const account: Account = {
      id,
      name,
      avatarColor: AVATAR_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
      order: config.accounts.length,
    }

    config.accounts.push(account)
    saveConfig(config)

    const session = new BaileysSession(id)
    this.sessions.set(id, session)
    await session.connect()

    return { id }
  }

  async removeAccount(id: string, deleteData: boolean): Promise<void> {
    // Disconnect session
    const session = this.sessions.get(id)
    if (session) {
      session.disconnect()
      this.sessions.delete(id)
    }

    // Clear idle timer
    const timer = this.idleTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.idleTimers.delete(id)
    }

    // Close database
    closeDatabase(id)

    // Remove from config
    const config = loadConfig()
    config.accounts = config.accounts.filter((a) => a.id !== id)
    // Re-index order
    config.accounts.forEach((a, i) => { a.order = i })
    saveConfig(config)

    // Optionally delete all account data
    if (deleteData) {
      try {
        rmSync(getAccountDir(id), { recursive: true, force: true })
      } catch {
        // Ignore deletion errors
      }
    }
  }

  renameAccount(id: string, name: string): void {
    const config = loadConfig()
    const account = config.accounts.find((a) => a.id === id)
    if (account) {
      account.name = name
      saveConfig(config)
    }
  }

  reorderAccounts(ids: string[]): void {
    const config = loadConfig()
    const accountMap = new Map(config.accounts.map((a) => [a.id, a]))
    config.accounts = ids
      .map((id, index) => {
        const account = accountMap.get(id)
        if (account) {
          account.order = index
        }
        return account
      })
      .filter(Boolean) as Account[]
    saveConfig(config)
  }

  async reconnect(id: string): Promise<void> {
    const session = this.sessions.get(id)
    if (session) {
      session.disconnect()
    }

    const newSession = new BaileysSession(id)
    this.sessions.set(id, newSession)
    await newSession.connect()
  }

  async setActiveAccount(id: string): Promise<void> {
    this.activeAccountId = id

    // Clear idle timer for the newly active account
    const timer = this.idleTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.idleTimers.delete(id)
    }

    // Ensure the active account is connected
    const session = this.sessions.get(id)
    if (session && session.getConnectionState() === 'close') {
      await session.connect()
    }

    // Start idle timers for non-active accounts
    this.startIdleTimers()
  }

  getSession(id: string): BaileysSession | undefined {
    return this.sessions.get(id)
  }

  listAccounts(): AccountWithState[] {
    const config = loadConfig()
    return config.accounts.map((account) => {
      const session = this.sessions.get(account.id)
      const chats = session?.getChats() ?? []
      const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0)

      return {
        ...account,
        connectionState: session?.getConnectionState() ?? 'close',
        unreadCount: totalUnread,
      }
    })
  }

  async connectAll(): Promise<void> {
    const config = loadConfig()
    for (let i = 0; i < config.accounts.length; i++) {
      const account = config.accounts[i]
      const session = new BaileysSession(account.id)
      this.sessions.set(account.id, session)

      try {
        await session.connect()
      } catch (err) {
        console.error(`Failed to connect account ${account.id} (${account.name}):`, err)
        // Continue to next account instead of failing all
      }

      // Stagger connections by 2 seconds between accounts
      if (i < config.accounts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  disconnectAll(): void {
    for (const [id, session] of this.sessions) {
      session.disconnect()
    }
    this.sessions.clear()

    for (const [, timer] of this.idleTimers) {
      clearTimeout(timer)
    }
    this.idleTimers.clear()
  }

  startIdleTimers(): void {
    const config = loadConfig()
    const idleMs = config.settings.idleTimeoutMinutes * 60 * 1000

    for (const [id, session] of this.sessions) {
      // Skip the active account
      if (id === this.activeAccountId) continue

      // Skip accounts that are already disconnected
      if (session.getConnectionState() !== 'open') continue

      // Clear any existing timer
      const existing = this.idleTimers.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timer = setTimeout(() => {
        session.disconnect()
        this.idleTimers.delete(id)
        emitToRenderer('account:idle', { accountId: id })
      }, idleMs)

      this.idleTimers.set(id, timer)
    }
  }
}

export const accountManager = new AccountManager()
