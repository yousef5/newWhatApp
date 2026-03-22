import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Account, AppConfig, AppSettings } from '@shared/types'
import { DEFAULT_CONFIG } from '@shared/types'
import { randomUUID } from 'crypto'

const DATA_DIR = join(app.getPath('home'), '.newwhatsapp')
const CONFIG_PATH = join(DATA_DIR, 'config.json')

const AVATAR_COLORS = [
  '#a855f7', '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
]

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function loadConfig(): AppConfig {
  ensureDataDir()
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG)
    return { ...DEFAULT_CONFIG }
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: AppConfig): void {
  ensureDataDir()
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function updateSettings(updates: Partial<AppSettings>): AppConfig {
  const config = loadConfig()
  config.settings = { ...config.settings, ...updates }
  saveConfig(config)
  return config
}

export function createAccount(name: string): Account {
  const config = loadConfig()
  const account: Account = {
    id: randomUUID(),
    name,
    avatarColor: AVATAR_COLORS[config.accounts.length % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
    order: config.accounts.length,
  }
  config.accounts.push(account)
  saveConfig(config)
  return account
}

export function removeAccount(id: string): void {
  const config = loadConfig()
  config.accounts = config.accounts.filter((a) => a.id !== id)
  // Re-index order
  config.accounts.forEach((a, i) => { a.order = i })
  saveConfig(config)
}

export function renameAccount(id: string, name: string): void {
  const config = loadConfig()
  const account = config.accounts.find((a) => a.id === id)
  if (account) {
    account.name = name
    saveConfig(config)
  }
}

export function reorderAccounts(ids: string[]): void {
  const config = loadConfig()
  const byId = new Map(config.accounts.map((a) => [a.id, a]))
  const reordered: Account[] = []
  for (const id of ids) {
    const acc = byId.get(id)
    if (acc) {
      acc.order = reordered.length
      reordered.push(acc)
    }
  }
  config.accounts = reordered
  saveConfig(config)
}

export function listAccounts(): Account[] {
  const config = loadConfig()
  return [...config.accounts].sort((a, b) => a.order - b.order)
}
