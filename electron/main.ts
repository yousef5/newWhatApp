import { app, BrowserWindow, Tray, Menu, nativeImage, session } from 'electron'
import { join } from 'path'
import { registerIPCHandlers } from './ipc/handlers'
import { listAccounts, loadConfig, saveConfig } from './storage/config'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

function setupPermissionsForPartition(partitionName: string): void {
  const ses = session.fromPartition(partitionName)

  // Allow notifications, media, clipboard for WhatsApp Web
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock', 'fullscreen']
    callback(allowed.includes(permission))
  })

  ses.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'pointerLock', 'fullscreen']
    return allowed.includes(permission)
  })

  // Set user agent for WhatsApp Web
  ses.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
}

function saveWindowState(): void {
  if (!mainWindow) return
  const config = loadConfig()
  const bounds = mainWindow.getBounds()
  config.settings.window = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: mainWindow.isMaximized(),
  }
  saveConfig(config)
}

function createWindow(): void {
  const config = loadConfig()
  const windowState = config.settings.window

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  })

  if (windowState.maximized) {
    mainWindow.maximize()
  }

  registerIPCHandlers()

  // Setup permissions for default session
  setupPermissionsForPartition('default')

  // Setup permissions for all existing account partitions
  const accounts = listAccounts()
  for (const account of accounts) {
    setupPermissionsForPartition(`persist:wa-${account.id}`)
  }

  // Listen for new webview creation to setup permissions
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    // Allow notifications from webviews
    webContents.on('did-finish-load', () => {
      // Inject notification override to make notifications work through Electron
      webContents.executeJavaScript(`
        (function() {
          const OriginalNotification = window.Notification;

          // Override Notification to ensure it works in webview
          if (OriginalNotification) {
            // Ensure permission is always granted
            Object.defineProperty(OriginalNotification, 'permission', {
              get: () => 'granted'
            });

            // Override requestPermission to always resolve with granted
            OriginalNotification.requestPermission = () => Promise.resolve('granted');
          }
        })()
      `).catch(() => {})
    })

    // Handle notification clicks - bring window to front
    webContents.on('notification-response' as any, () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  })

  // Save window state on resize/move (debounced)
  let stateTimer: ReturnType<typeof setTimeout> | null = null
  const debouncedSave = () => {
    if (stateTimer) clearTimeout(stateTimer)
    stateTimer = setTimeout(saveWindowState, 500)
  }
  mainWindow.on('resize', debouncedSave)
  mainWindow.on('move', debouncedSave)

  // Close-to-tray behavior
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      const cfg = loadConfig()
      if (cfg.settings.closeToTray) {
        e.preventDefault()
        mainWindow?.hide()
        return
      }
    }
    saveWindowState()
  })

  mainWindow.on('closed', () => { mainWindow = null })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    if (process.env.NODE_ENV !== 'production') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(join(__dirname, '../../resources/icon-32.png'))
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon)
  tray.setToolTip('MultiWhatsApp')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

app.on('before-quit', () => {
  isQuitting = true
  saveWindowState()
})

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
