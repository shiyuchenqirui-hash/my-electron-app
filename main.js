const { app, BrowserWindow, Menu, MenuItem, ipcMain, shell } = require('electron/main')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { openSessionWindows, registerSessionLabHandlers } = require('./session-lab')

const allowedSettingsPages = new Set([
  pathToFileURL(path.join(__dirname, 'settings.html')).href,
  pathToFileURL(path.join(__dirname, 'navigation-target.html')).href
])

let settingsWindow = null

function getSettingsNavigationAction (url) {
  let target

  try {
    target = new URL(url)
  } catch {
    return 'deny'
  }

  if (target.username || target.password) return 'deny'

  if (target.origin === 'https://www.electronjs.org') return 'external'

  // Query strings and hashes do not change which local file is allowed.
  target.search = ''
  target.hash = ''

  return allowedSettingsPages.has(target.href) ? 'allow' : 'deny'
}

function handleSettingsNavigation (event) {
  const action = getSettingsNavigationAction(event.url)

  if (action === 'allow') {
    console.log('[settings] navigation-allowed', { url: event.url })
    return
  }

  event.preventDefault()

  if (action === 'external' && event.isMainFrame) {
    console.log('[settings] external-open-request', { url: event.url })
    shell.openExternal(event.url).catch((error) => {
      console.error('[settings] external-open-failed', error)
    })
    return
  }

  console.log('[settings] navigation-blocked', { url: event.url })
}

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

  settingsWindow.webContents.on('did-start-loading', () => {
    console.log('[settings] did-start-loading')
  })

  settingsWindow.webContents.on('dom-ready', () => {
    console.log('[settings] dom-ready')
  })

  settingsWindow.webContents.on('did-finish-load', () => {
    console.log('[settings] did-finish-load')
  })

  settingsWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.log('[settings] did-fail-load', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame
      })
    }
  )

  settingsWindow.webContents.on('did-start-navigation', (details) => {
    console.log('[settings] did-start-navigation', {
      url: details.url,
      isSameDocument: details.isSameDocument,
      isMainFrame: details.isMainFrame
    })
  })

  settingsWindow.webContents.on('will-frame-navigate', (details) => {
    console.log('[settings] will-frame-navigate', {
      url: details.url,
      isMainFrame: details.isMainFrame
    })

    // Main-frame requests are handled by will-navigate below.
    if (!details.isMainFrame) handleSettingsNavigation(details)
  })

  settingsWindow.webContents.on('will-navigate', (details) => {
    console.log('[settings] will-navigate', {
      url: details.url,
      isMainFrame: details.isMainFrame
    })

    handleSettingsNavigation(details)
  })

  settingsWindow.webContents.on('will-redirect', (event) => {
    if (getSettingsNavigationAction(event.url) !== 'allow') {
      event.preventDefault()
      console.log('[settings] redirect-blocked', { url: event.url })
    }
  })

  settingsWindow.webContents.on(
    'did-frame-navigate',
    (_event, url, httpResponseCode, httpStatusText, isMainFrame) => {
      console.log('[settings] did-frame-navigate', {
        url,
        httpResponseCode,
        httpStatusText,
        isMainFrame
      })
    }
  )

  settingsWindow.webContents.on(
    'did-navigate',
    (_event, url, httpResponseCode, httpStatusText) => {
      console.log('[settings] did-navigate', {
        url,
        httpResponseCode,
        httpStatusText
      })
    }
  )

  settingsWindow.webContents.on(
    'did-navigate-in-page',
    (_event, url, isMainFrame) => {
      console.log('[settings] did-navigate-in-page', {
        url,
        isMainFrame
      })
    }
  )

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[settings] window-open-request', { url, action: 'deny' })

    return { action: 'deny' }
  })

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
    {
      label: 'Session',
      submenu: [{
        id: 'open-session-lab',
        label: 'Open Shared Windows',
        click: openSessionWindows
      }]
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
  registerSessionLabHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
