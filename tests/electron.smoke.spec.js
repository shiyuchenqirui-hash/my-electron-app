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
