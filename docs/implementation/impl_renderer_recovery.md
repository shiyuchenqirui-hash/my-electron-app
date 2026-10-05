# Renderer 终止与重载实验

> **类型**: 实现记录
> **状态**: 已实现
> **作者**: shiyu.chen
> **创建日期**: 2026-10-04
> **最后更新**: 2026-10-04

## TL;DR

- 本文记录一次手动强制终止 Settings Renderer 后，检查窗口对象并重载的实验。
- 历史观察中 Main 仍能执行命令，BrowserWindow 和 webContents 未销毁；重载后页面变量消失。
- “已实现”指实验记录已形成；应用没有自动崩溃恢复功能，也没有对应自动化测试。

## 问题、资料与环境

问题：Renderer 被终止，是否等于整个窗口对象或 Main 也结束？参考 [forcefullyCrashRenderer](https://www.electronjs.org/zh/docs/latest/api/web-contents#contentsforcefullycrashrenderer)、[render-process-gone](https://www.electronjs.org/zh/docs/latest/api/web-contents#event-render-process-gone)。

历史实测在 macOS、Electron 44.4.5 开发态完成，以下为 2026-10-04 根据当次控制台截图与终端输出补记；并非本轮重新制造崩溃。当前相关窗口入口见 [main.js](../../main.js)。故意终止进程会丢失页面内存状态，只在学习实例使用。

## 复现步骤

1. 在 VS Code 的“运行和调试”选择 **Main**，点击绿色三角。应用启动后点击 **Window → Open Settings**。
2. 在 `main.js` 的 Settings `did-finish-load` 回调内设置断点；重新打开 Settings，让 Main 暂停在此作用域。选择对应 Main 调用栈，在 **Debug Console** 检查 `process.versions.electron`。
3. 此时执行 `globalThis.studyWindow = settingsWindow`，再检查 `studyWindow.webContents.getURL()`，确认是 `settings.html`。点击调试工具栏“继续”，取消本轮无关断点。页面暂停时不要等待页面异步脚本完成。
4. 在同一个 Main Debug Console 中依次执行下面的命令，每次等相应结果返回后再继续。此项目将标准输出放在 **Terminal**，`.then(console.log)` 的结果可能出现在那里；立即显示的 Promise pending 不代表失败。

先注册单次观察器并写入一个页面变量：

```js
studyWindow.webContents.once('render-process-gone', (_event, details) => {
  console.log('[study] Renderer gone', details)
})
studyWindow.webContents.executeJavaScript('window.studyValue = 123').then(console.log)
```

等终端输出 `123` 后，故意终止这个页面所在的 Renderer，并等退出事件：

```js
studyWindow.webContents.forcefullyCrashRenderer()
```

再检查 Main 中持有的对象：

```js
({
  mainPid: process.pid,
  windowDestroyed: studyWindow.isDestroyed(),
  webContentsDestroyed: studyWindow.webContents.isDestroyed()
})
```

最后执行 `studyWindow.webContents.reload()`，等 Settings 加载完成再执行：

```js
studyWindow.webContents.executeJavaScript('typeof window.studyValue').then(console.log)
```

完成后点击 Settings 的 Close，执行 `delete globalThis.studyWindow`，移除临时断点并退出应用。一次性探针留在文档，无需增加到应用启动代码。

## 历史观察与解释

当次输出为：

```text
123
[study] Renderer gone { reason: 'killed', exitCode: 2 }
windowDestroyed: false
webContentsDestroyed: false
重载后 typeof window.studyValue 的输出：undefined
```

Main 仍能执行对象检查和 reload；两个对象未被销毁，重载后的新页面上下文没有原变量。这支持区分 Main 持有的窗口对象、webContents 与 Renderer 页面状态；不把具体退出码当作跨平台固定值。

`forcefullyCrashRenderer()` 用于主动制造进程终止；它不是普通关闭窗口，也不是生产恢复策略。官方还提醒同一 Renderer 进程可能承载多个 webContents，因此不能根据这次 Settings 观察承诺所有窗口场景都互不影响。
