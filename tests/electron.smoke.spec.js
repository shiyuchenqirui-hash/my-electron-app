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

test('应用可以启动，并连接 Main、Preload 和 Renderer', async ({}, testInfo) => {
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

  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().items.find(item => item.label === 'Counter').submenu.items[0].click()
  })
  await expect(mainWindow.locator('#counter')).toHaveText('1')
  await mainWindow.reload()
  await expect(mainWindow.locator('#counter')).toHaveText('0')
  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().items.find(item => item.label === 'Counter').submenu.items[0].click()
  })
  await expect(mainWindow.locator('#counter')).toHaveText('1')
  await mainWindow.screenshot({ path: testInfo.outputPath('main.png'), fullPage: true })
})

test('可以打开拥有独立 webContents 的模态设置窗口', async ({}, testInfo) => {
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

  await settingsWindow.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true })

  const settingsClosedPromise = settingsWindow.waitForEvent('close')
  await settingsWindow.getByRole('button', { name: 'Close' }).click({ noWaitAfter: true })
  await settingsClosedPromise

  const remainingWindowCount = await electronApp.evaluate(({ BrowserWindow }) => (
    BrowserWindow.getAllWindows().length
  ))

  expect(remainingWindowCount).toBe(1)
})

test('构建后的 Settings 保留同页、跨文档导航和拦截策略', async () => {
  const main = await electronApp.firstWindow()
  await expect(main.locator('#counter')).toHaveText('0')
  const opened = electronApp.waitForEvent('window')
  await electronApp.evaluate(({ Menu }) => {
    Menu.getApplicationMenu().getMenuItemById('open-settings').click()
  })
  const settings = await opened
  await expect(settings.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await settings.evaluate(() => { window.studyValue = 123 })
  await settings.getByText('Same-document hash navigation', { exact: true }).click()
  await expect(settings).toHaveURL(/settings\.html#navigation-section$/)
  expect(await settings.evaluate(() => window.studyValue)).toBe(123)

  const denied = electronApp.waitForEvent('console', {
    predicate: message => message.text().includes('[settings] window-open-request')
  })
  await settings.getByText('New-window request', { exact: true }).click()
  await denied
  expect(electronApp.windows()).toHaveLength(2)

  await settings.getByText('Current-window document navigation', { exact: true }).click()
  await expect(settings).toHaveTitle('Navigation Target')
  expect(await settings.evaluate(() => typeof window.studyValue)).toBe('undefined')
  await settings.getByText('Back to Settings', { exact: true }).click()
  await expect(settings.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  const blocked = electronApp.waitForEvent('console', {
    predicate: message => message.text().includes('[settings] navigation-blocked')
  })
  await settings.getByText('Blocked local page', { exact: true }).click({ noWaitAfter: true })
  await blocked
  // Verify through Electron after cancellation; Playwright lost its frame URL
  // in this scenario during the migration check.
  const actual = await electronApp.evaluate(async ({ BrowserWindow }) => {
    const wc = BrowserWindow.getAllWindows().find(win => win.getTitle() === 'Settings').webContents
    return {
      url: wc.getURL(),
      document: await wc.executeJavaScript('({ url: location.href, title: document.querySelector("h1").textContent })')
    }
  })
  expect(actual.url).toMatch(/settings\.html$/)
  expect(actual.document.url).toBe(actual.url)
  expect(actual.document.title).toBe('Settings')
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
  await expect(b.locator('#cookie-value')).toHaveText(valueB)
  await expect(b.locator('#session-relation')).toHaveText('独立 Session')
  await expect(b.getByRole('status')).toContainText('写入完成')
  await expect(b.getByRole('status')).toContainText('仅更新本窗口快照')
  await b.screenshot({ path: testInfo.outputPath('session-isolated.png'), fullPage: true })

  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().find(win => win.getTitle() === 'Session A').close()
  })
  await b.getByRole('button', { name: '读取 Cookie', exact: true }).click()
  await expect(b.locator('#session-relation')).toHaveText('无对照窗口')
  await expect(b.locator('#cookie-value')).toHaveText(valueB)

  // Failure injection is test-only; the production IPC handler remains unchanged.
  await electronApp.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('session-lab:read')
    ipcMain.handle('session-lab:read', () => { throw new Error('模拟读取失败') })
  })
  await b.getByRole('button', { name: '读取 Cookie', exact: true }).click()
  await expect(b.getByRole('alert')).toContainText('模拟读取失败')
  await expect(b.getByRole('status')).toContainText('上一次成功快照')
  await expect(b.locator('#cookie-value')).toHaveText(valueB)
  await expect(b.getByRole('button', { name: '读取 Cookie', exact: true })).toBeEnabled()
  await b.getByRole('button', { name: '删除测试 Cookie' }).click()
  await expect(b.getByRole('alert')).toHaveCount(0)
  await expect(b.locator('#cookie-value')).toHaveText('未设置（null）')
  await expect(b.getByRole('status')).toContainText('删除完成')
})
