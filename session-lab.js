const { BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// Round 1: both windows use the same non-persistent partition.
const partition = 'session-lab-shared'
const cookieURL = 'https://session-lab.example/'
const cookieName = 'study-cookie'
const pageURL = pathToFileURL(path.join(__dirname, 'session-lab.html')).href
const windows = new Map()

function getSourceWindow (event) {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win || ![...windows.values()].includes(win) ||
      event.senderFrame !== event.sender.mainFrame ||
      event.senderFrame.url !== pageURL) {
    throw new Error('Session lab request rejected')
  }
  return win
}

async function readState (win) {
  const ownSession = win.webContents.session
  const peer = [...windows.values()].find(candidate => candidate !== win)
  const cookies = await ownSession.cookies.get({ url: cookieURL, name: cookieName })
  return {
    window: win.getTitle(),
    windowId: win.id,
    webContentsId: win.webContents.id,
    partition,
    persistent: ownSession.isPersistent(),
    sameSessionAsPeer: peer ? ownSession === peer.webContents.session : null,
    cookie: cookies[0]?.value ?? null
  }
}

async function readCookie (event) {
  const state = await readState(getSourceWindow(event))
  console.log('[session-lab] read', state)
  return state
}

async function writeCookie (event) {
  const win = getSourceWindow(event)
  const value = `written-by-${win.getTitle()}-${Date.now()}`
  // Use the requesting window's session, not defaultSession or a shared JS variable.
  await win.webContents.session.cookies.set({ url: cookieURL, name: cookieName, value })
  console.log('[session-lab] write', { window: win.getTitle(), value })
  return readState(win)
}

async function removeCookie (event) {
  const win = getSourceWindow(event)
  await win.webContents.session.cookies.remove(cookieURL, cookieName)
  return readState(win)
}

function registerSessionLabHandlers () {
  ipcMain.handle('session-lab:read', readCookie)
  ipcMain.handle('session-lab:write', writeCookie)
  ipcMain.handle('session-lab:remove', removeCookie)
}

function openSessionWindows () {
  for (const label of ['A', 'B']) {
    if (windows.has(label)) {
      windows.get(label).show()
      windows.get(label).focus()
      continue
    }

    const win = new BrowserWindow({
      title: `Session ${label}`,
      width: 540,
      height: 560,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        partition,
        preload: path.join(__dirname, 'session-preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false
      }
    })
    windows.set(label, win)
    win.on('page-title-updated', event => event.preventDefault())
    win.webContents.on('will-navigate', event => event.preventDefault())
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.once('ready-to-show', () => win.show())
    win.on('closed', () => windows.delete(label))
    win.loadFile('session-lab.html').catch(error => {
      console.error('[session-lab] load failed', error)
      if (!win.isDestroyed()) win.destroy()
    })
  }
}

module.exports = { openSessionWindows, registerSessionLabHandlers }
