import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AppConfig, AppSettings } from '@shared/types'
import { DEFAULT_CONFIG } from '@shared/types'

const DATA_DIR = join(app.getPath('home'), '.newwhatsapp')
const CONFIG_PATH = join(DATA_DIR, 'config.json')

export function getDataDir(): string {
  return DATA_DIR
}

export function getAccountDir(accountId: string): string {
  return join(DATA_DIR, 'accounts', accountId)
}

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
