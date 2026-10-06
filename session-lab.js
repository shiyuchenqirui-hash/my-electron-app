const { BrowserWindow, dialog, ipcMain, screen } = require('electron/main')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// Round 2 changes only B's partition. Both modes remain in-memory.
const partitions = {
  shared: { A: 'session-lab-shared', B: 'session-lab-shared' },
  isolated: { A: 'session-lab-shared', B: 'session-lab-isolated-b' }
}
const cookieURL = 'https://session-lab.example/'
const cookieName = 'study-cookie'
const pageURL = pathToFileURL(path.join(__dirname, 'session-lab.html')).href
const windows = new Map()
const windowPartitions = new WeakMap()
let currentMode = 'shared'

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
    mode: currentMode,
    partition: windowPartitions.get(win),
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

function getSessionWindowBounds () {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  const display = focusedWindow
    ? screen.getDisplayMatching(focusedWindow.getBounds())
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { x, y, width, height } = display.workArea
  const margin = 16
  const gap = 12
  const leftWidth = Math.floor((width - margin * 2 - gap) / 2)
  return {
    A: { x: x + margin, y: y + margin, width: leftWidth, height: height - margin * 2 },
    B: {
      x: x + margin + leftWidth + gap,
      y: y + margin,
      width: width - margin * 2 - gap - leftWidth,
      height: height - margin * 2
    }
  }
}

function openSessionWindows (mode = 'shared') {
  if (!Object.hasOwn(partitions, mode)) throw new Error('Unknown session lab mode')
  if (windows.size > 0 && mode !== currentMode) {
    dialog.showMessageBox({
      type: 'info',
      message: '请先关闭 Session A、B，再切换实验模式。',
      detail: 'partition 在创建窗口时指定；关闭窗口不会清空测试 Cookie。',
      buttons: ['知道了']
    }).catch(error => console.error('[session-lab] dialog failed', error))
    return
  }
  currentMode = mode
  const bounds = getSessionWindowBounds()
  for (const label of ['A', 'B']) {
    if (windows.has(label)) {
      const win = windows.get(label)
      if (win.isMinimized()) win.restore()
      if (win.isMaximized()) win.unmaximize()
      win.setBounds(bounds[label])
      win.show()
      win.focus()
      continue
    }

    const win = new BrowserWindow({
      title: `Session ${label}`,
      ...bounds[label],
      show: false,
      backgroundColor: '#f4f3ee',
      webPreferences: {
        partition: partitions[mode][label],
        preload: path.join(__dirname, 'session-preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false
      }
    })
    windows.set(label, win)
    windowPartitions.set(win, partitions[mode][label])
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
