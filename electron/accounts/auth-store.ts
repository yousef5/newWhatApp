import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { getAccountDir } from '../storage/config'
import baileys from '@whiskeysockets/baileys'
const { initAuthCreds, BufferJSON, proto } = baileys
type AuthenticationState = baileys.AuthenticationState

function getAuthDir(accountId: string): string {
  return join(getAccountDir(accountId), 'auth')
}

function ensureAuthDir(accountId: string): string {
  const dir = getAuthDir(accountId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  return dir
}

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function readData(filePath: string): any | null {
  if (!existsSync(filePath)) return null
  try {
    if (canEncrypt()) {
      const encrypted = readFileSync(filePath)
      const decrypted = safeStorage.decryptString(encrypted)
      return JSON.parse(decrypted, BufferJSON.reviver)
    } else {
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw, BufferJSON.reviver)
    }
  } catch {
    // If decryption fails, try reading as plain text (migration case)
    try {
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw, BufferJSON.reviver)
    } catch {
      return null
    }
  }
}

function writeData(filePath: string, data: any): void {
  const serialized = JSON.stringify(data, BufferJSON.replacer)
  if (canEncrypt()) {
    const encrypted = safeStorage.encryptString(serialized)
    writeFileSync(filePath, encrypted)
  } else {
    writeFileSync(filePath, serialized, 'utf-8')
  }
}

export async function createAuthState(accountId: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const authDir = ensureAuthDir(accountId)
  const credsPath = join(authDir, 'creds.json')

  let creds: any
  const savedCreds = readData(credsPath)
  if (savedCreds) {
    creds = savedCreds
  } else {
    creds = initAuthCreds()
  }

  const keys = {
    get: (type: string, ids: string[]): { [id: string]: any } => {
      const result: { [id: string]: any } = {}
      for (const id of ids) {
        const filePath = join(authDir, `${type}-${id}.json`)
        let value = readData(filePath)
        if (value) {
          if (type === 'app-state-sync-key') {
            value = proto.Message.AppStateSyncKeyData.fromObject(value)
          }
          result[id] = value
        }
      }
      return result
    },

    set: (data: { [category: string]: { [id: string]: any } }): void => {
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id]
          const filePath = join(authDir, `${category}-${id}.json`)
          if (value) {
            writeData(filePath, value)
          } else {
            if (existsSync(filePath)) {
              rmSync(filePath)
            }
          }
        }
      }
    },
  }

  const saveCreds = async (): Promise<void> => {
    writeData(credsPath, creds)
  }

  return {
    state: { creds, keys },
    saveCreds,
  }
}

export function deleteAuthState(accountId: string): void {
  const dir = getAuthDir(accountId)
  if (existsSync(dir)) {
    const files = readdirSync(dir)
    for (const file of files) {
      rmSync(join(dir, file))
    }
    rmSync(dir, { recursive: true })
  }
}
