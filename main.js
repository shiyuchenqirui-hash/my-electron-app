const { app, BrowserWindow, Menu, ipcMain } = require('electron/main')
const path = require('node:path')

function sendCounterUpdate (mainWindow, value) {
  mainWindow.webContents.send('update-counter', value)
}

function handleCounterValue (_event, value) {
  console.log(value) // will print value to Node console
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
    { role: 'windowMenu' }
  ])

  Menu.setApplicationMenu(menu)

  mainWindow.loadFile('index.html')

  if (!process.env.PLAYWRIGHT_TEST) {
    // Open the DevTools during normal development, but not in automated tests.
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  ipcMain.on('counter-value', handleCounterValue)
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
