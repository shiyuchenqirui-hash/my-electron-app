const output = document.getElementById('result')
const buttons = [...document.querySelectorAll('button')]

async function runAction (action) {
  buttons.forEach(button => { button.disabled = true })
  try {
    const state = await action()
    document.getElementById('window-title').textContent = state.window
    document.getElementById('experiment-mode').textContent = state.mode === 'shared'
      ? '第一轮：两个窗口，同一个 partition。'
      : '第二轮：只改变 B 的 partition，观察 Cookie 是否隔离。'
    output.textContent = JSON.stringify(state, null, 2)
  } catch (error) {
    output.textContent = `操作失败：${error.message}`
  } finally {
    buttons.forEach(button => { button.disabled = false })
  }
}

document.getElementById('write-cookie').addEventListener('click', () => {
  runAction(() => window.sessionLab.writeCookie())
})
document.getElementById('read-cookie').addEventListener('click', () => {
  runAction(() => window.sessionLab.readCookie())
})
document.getElementById('remove-cookie').addEventListener('click', () => {
  runAction(() => window.sessionLab.removeCookie())
})

runAction(() => window.sessionLab.readCookie())
