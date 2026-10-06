const path = require('node:path')
const { test, expect, _electron: electron } = require('@playwright/test')

let electronApp

test.beforeEach(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '..', 'main.js')],
    env: {
      ...process.env,
      PLAYWRIGHT_TEST: '1'
    }
  })
})

test.afterEach(async () => {
  await electronApp.close()
})

test('应用可以启动，并连接 Main、Preload 和 Renderer', async () => {
  const mainWindow = await electronApp.firstWindow()

  await expect(mainWindow).toHaveTitle('Menu Counter')
  await expect(mainWindow.locator('#counter')).toHaveText('0')

  const exposedApiTypes = await mainWindow.evaluate(() => ({
    onUpdateCounter: typeof window.electronAPI?.onUpdateCounter,
    counterValue: typeof window.electronAPI?.counterValue
  }))

  expect(exposedApiTypes).toEqual({
    onUpdateCounter: 'function',
    counterValue: 'function'
  })

  const windowCount = await electronApp.evaluate(({ BrowserWindow }) => (
    BrowserWindow.getAllWindows().length
  ))

  expect(windowCount).toBe(1)
  await expect.poll(() => electronApp.evaluate(({ BrowserWindow }) => (
    BrowserWindow.getAllWindows()[0].isMaximized()
  ))).toBe(true)
})

test('可以打开拥有独立 webContents 的模态设置窗口', async () => {
  const mainWindow = await electronApp.firstWindow()
  const settingsWindowPromise = electronApp.waitForEvent('window')

  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().getMenuItemById('open-settings').click()
  })

  const settingsWindow = await settingsWindowPromise
  await expect(settingsWindow).toHaveTitle('Settings')

  const relationship = await electronApp.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows()
    const main = windows.find(window => window.getTitle() === 'Menu Counter')
    const settings = windows.find(window => window.getTitle() === 'Settings')

    return {
      mainWindowId: main.id,
      mainWebContentsId: main.webContents.id,
      settingsWindowId: settings.id,
      settingsWebContentsId: settings.webContents.id,
      parentWindowId: settings.getParentWindow().id,
      isModal: settings.isModal()
    }
  })

  expect(relationship.settingsWindowId).not.toBe(relationship.mainWindowId)
  expect(relationship.settingsWebContentsId).not.toBe(relationship.mainWebContentsId)
  expect(relationship.parentWindowId).toBe(relationship.mainWindowId)
  expect(relationship.isModal).toBe(true)

  const settingsClosedPromise = settingsWindow.waitForEvent('close')
  await settingsWindow.getByRole('button', { name: 'Close' }).click()
  await settingsClosedPromise

  const remainingWindowCount = await electronApp.evaluate(({ BrowserWindow }) => (
    BrowserWindow.getAllWindows().length
  ))

  expect(remainingWindowCount).toBe(1)
})

test('两个实验窗口共享 Session Cookie，但保持独立 webContents', async () => {
  const mainWindow = await electronApp.firstWindow()
  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().getMenuItemById('open-session-lab').click()
  })
  await expect.poll(() => electronApp.windows().length).toBe(3)
  const pages = electronApp.windows().filter(page => page !== mainWindow)
  // Locate by the rendered label: both windows intentionally load the same HTML.
  await expect.poll(async () => {
    const labels = await Promise.all(pages.map(page => page.locator('h1').textContent()))
    return labels.includes('Session A') && labels.includes('Session B')
  }).toBe(true)
  const labels = await Promise.all(pages.map(page => page.locator('h1').textContent()))
  const a = pages[labels.indexOf('Session A')]
  const b = pages[labels.indexOf('Session B')]

  await a.getByRole('button', { name: '删除测试 Cookie' }).click()
  await expect(a.locator('#result')).toContainText('"cookie": null')
  await a.getByRole('button', { name: '写入测试 Cookie' }).click()
  await expect(a.locator('#result')).toContainText('written-by-Session A-')
  const stateA = JSON.parse(await a.locator('#result').textContent())
  await b.getByRole('button', { name: '读取 Cookie', exact: true }).click()
  await expect(b.locator('#result')).toContainText(stateA.cookie)
  const stateB = JSON.parse(await b.locator('#result').textContent())

  expect(stateB.webContentsId).not.toBe(stateA.webContentsId)
  expect(stateB.sameSessionAsPeer).toBe(true)
  expect(stateB.persistent).toBe(false)
  await b.getByRole('button', { name: '删除测试 Cookie' }).click()
  await expect(b.locator('#result')).toContainText('"cookie": null')
  await a.getByRole('button', { name: '读取 Cookie', exact: true }).click()
  await expect(a.locator('#result')).toContainText('"cookie": null')
})

test('改变 B 的 partition 后，同名 Cookie 的写入和删除互不影响', async ({}, testInfo) => {
  const mainWindow = await electronApp.firstWindow()
  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().getMenuItemById('open-isolated-session-lab').click()
  })
  await expect.poll(() => electronApp.windows().length).toBe(3)
  const pages = electronApp.windows().filter(page => page !== mainWindow)
  await expect.poll(async () => {
    const labels = await Promise.all(pages.map(page => page.locator('h1').textContent()))
    return labels.includes('Session A') && labels.includes('Session B')
  }).toBe(true)
  const labels = await Promise.all(pages.map(page => page.locator('h1').textContent()))
  const a = pages[labels.indexOf('Session A')]
  const b = pages[labels.indexOf('Session B')]

  const layout = await electronApp.evaluate(({ BrowserWindow, screen }) => {
    const windows = BrowserWindow.getAllWindows()
    const a = windows.find(win => win.getTitle() === 'Session A').getBounds()
    const b = windows.find(win => win.getTitle() === 'Session B').getBounds()
    return { a, b, area: screen.getDisplayMatching(a).workArea }
  })
  expect(layout.a.x + layout.a.width).toBeLessThan(layout.b.x)
  expect(layout.a.y).toBe(layout.b.y)
  expect(layout.a.height).toBe(layout.b.height)
  expect(layout.a.x).toBeGreaterThanOrEqual(layout.area.x)
  expect(layout.a.y).toBeGreaterThanOrEqual(layout.area.y)
  expect(layout.b.x + layout.b.width).toBeLessThanOrEqual(layout.area.x + layout.area.width)
  expect(layout.b.y + layout.b.height).toBeLessThanOrEqual(layout.area.y + layout.area.height)

  for (const page of [a, b]) {
    await page.getByRole('button', { name: '删除测试 Cookie' }).click()
    await expect(page.locator('#result')).toContainText('"cookie": null')
  }
  await a.getByRole('button', { name: '写入测试 Cookie' }).click()
  await expect(a.locator('#result')).toContainText('written-by-Session A-')
  const stateA = JSON.parse(await a.locator('#result').textContent())
  // Await the actual IPC result; an already-null display alone would not prove a fresh read.
  const stateB = await b.evaluate(() => window.sessionLab.readCookie())
  expect(stateB.cookie).toBeNull()
  expect(stateB.sameSessionAsPeer).toBe(false)
  expect(stateB.partition).not.toBe(stateA.partition)

  await b.getByRole('button', { name: '写入测试 Cookie' }).click()
  await expect(b.locator('#result')).toContainText('written-by-Session B-')
  const valueB = JSON.parse(await b.locator('#result').textContent()).cookie
  expect((await a.evaluate(() => window.sessionLab.readCookie())).cookie).toBe(stateA.cookie)
  await a.getByRole('button', { name: '删除测试 Cookie' }).click()
  await expect(a.locator('#result')).toContainText('"cookie": null')
  expect((await b.evaluate(() => window.sessionLab.readCookie())).cookie).toBe(valueB)
  await b.screenshot({ path: testInfo.outputPath('session-isolated.png'), fullPage: true })
})
