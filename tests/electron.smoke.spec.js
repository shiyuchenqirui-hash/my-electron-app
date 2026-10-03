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
