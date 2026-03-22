import { app, BrowserWindow, Tray, Menu, nativeImage, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { readFileSync, existsSync } from 'fs'
import { setMainWindow } from './ipc/emitter'
import { registerIPCHandlers } from './ipc/handlers'
import { accountManager } from './accounts/manager'
import { closeAllDatabases } from './storage/database'

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
      webSecurity: false, // Allow loading local files in dev mode
    },
  })

  setMainWindow(mainWindow)
  registerIPCHandlers()

  mainWindow.on('close', () => {})
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

// Register custom protocol for local file access
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, standard: true, secure: true } }
])

app.whenReady().then(() => {
  // Serve local files via localfile:// protocol
  protocol.handle('localfile', (request) => {
    const url = new URL(request.url)
    // localfile://path/to/file -> /path/to/file
    const filePath = decodeURIComponent(url.pathname)
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
