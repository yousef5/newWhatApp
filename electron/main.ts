import { app, BrowserWindow, Tray, Menu, nativeImage, session } from 'electron'
import { join } from 'path'
import { registerIPCHandlers } from './ipc/handlers'
import { listAccounts } from './storage/config'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  })

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

  mainWindow.on('closed', () => { mainWindow = null })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  tray = new Tray(nativeImage.createEmpty())
  tray.setToolTip('MultiWhatsApp')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } },
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

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
