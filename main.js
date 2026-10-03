const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron/main')
const path = require('node:path')

let settingsWindow = null

function sendCounterUpdate (mainWindow, value) {
  mainWindow.webContents.send('update-counter', value)
}

function handleCounterValue (_event, value) {
  console.log(value) // will print value to Node console
}

function handleCloseSettings (event) {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender)

  if (sourceWindow === settingsWindow) {
    sourceWindow.close()
  }
}

function createSettingsWindow (mainWindow) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: false,
    width: 500,
    height: 400,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const windowIds = {
    mainWindowId: mainWindow.id,
    mainWebContentsId: mainWindow.webContents.id,
    settingsWindowId: settingsWindow.id,
    settingsWebContentsId: settingsWindow.webContents.id
  }

  console.log('[windows] created', windowIds)

  settingsWindow.once('ready-to-show', () => {
    console.log('[settings] ready-to-show')
    settingsWindow.show()
  })

  settingsWindow.on('close', () => {
    console.log('[settings] close')
  })

  settingsWindow.on('closed', () => {
    console.log('[settings] closed')
    settingsWindow = null
  })

  settingsWindow.loadFile('settings.html').catch((error) => {
    console.error('[settings] failed to load', error)

    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.destroy()
    }
  })
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const menu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    {
      label: 'Counter',
      submenu: [
        {
          label: 'Increment',
          click: () => sendCounterUpdate(mainWindow, 1)
        },
        {
          label: 'Decrement',
          click: () => sendCounterUpdate(mainWindow, -1)
        }
      ]
    },
    { id: 'window-menu', role: 'windowMenu' }
  ])

  const windowMenu = menu.getMenuItemById('window-menu')
  windowMenu.submenu.insert(0, new MenuItem({
    id: 'open-settings',
    label: 'Open Settings',
    accelerator: 'CmdOrCtrl+,',
    click: () => createSettingsWindow(mainWindow)
  }))
  windowMenu.submenu.insert(1, new MenuItem({ type: 'separator' }))

  Menu.setApplicationMenu(menu)

  mainWindow.loadFile('index.html')

  mainWindow.on('close', () => {
    console.log('[main] close')
  })

  mainWindow.on('closed', () => {
    console.log('[main] closed')
  })

  if (!process.env.PLAYWRIGHT_TEST) {
    // Open the DevTools during normal development, but not in automated tests.
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  ipcMain.on('counter-value', handleCounterValue)
  ipcMain.on('settings:close', handleCloseSettings)
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
