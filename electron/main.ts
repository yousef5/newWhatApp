import { app, BrowserWindow, Tray, Menu, nativeImage, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { setMainWindow } from './ipc/emitter'
import { registerIPCHandlers } from './ipc/handlers'
import { accountManager } from './accounts/manager'
import { closeAllDatabases } from './storage/database'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// Single instance lock
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  setMainWindow(mainWindow)
  registerIPCHandlers()

  mainWindow.on('close', (e) => {
    // For now just close. Config-based close-to-tray will be added when config storage exists.
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open devtools in dev mode
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.openDevTools()
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

// Register custom protocol to serve local files (avatars, media)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
])

app.whenReady().then(() => {
  // Handle local-file:// protocol — maps to filesystem
  protocol.handle('local-file', (request) => {
    // URL is like local-file:///home/joe/path/to/file.jpg
    // or local-file://home/joe/path/to/file.jpg
    let filePath = decodeURIComponent(request.url)
    filePath = filePath.replace(/^local-file:\/\/\/?/, '/')
    // Ensure absolute path
    if (!filePath.startsWith('/')) filePath = '/' + filePath
    console.log('[local-file] Serving:', filePath)
    return net.fetch(pathToFileURL(filePath).href)
  })

  createWindow()
  createTray()
  accountManager.connectAll()
})

app.on('before-quit', async () => {
  await accountManager.disconnectAll()
  closeAllDatabases()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
