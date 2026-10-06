# 页面加载与导航边界实验

> **类型**: 实现记录
> **状态**: 已实现
> **作者**: shiyu.chen
> **创建日期**: 2026-10-04
> **最后更新**: 2026-10-07

## TL;DR

- 用 Settings 对照同页 hash、当前窗口跨文档、新窗口请求和系统浏览器外链。
- 记录一次目标文件加载失败后仍出现完成类事件的历史观察，避免只凭 `did-finish-load` 判定目标文件成功。
- 当前实现包含 URL 策略和日志；Smoke Test 覆盖 hash、跨文档、本地拒绝和新窗口拒绝，重定向及子框架分支仍待专门实测。

## 问题与资料

先阅读 [webContents 导航事件](https://www.electronjs.org/zh/docs/latest/api/web-contents#navigation-events) 和 [安全指南](https://www.electronjs.org/zh/docs/latest/tutorial/security)。问题是：不同“跳转”走哪个入口，哪些状态会保留，哪些请求应该阻止？工作区版本边界见 [实验索引](README.md#验证基准)。

## 当前导航实验

启动并打开 Settings，保持启动终端可见。逐项点击 [settings-page.jsx](../../ui/settings-page.jsx) 渲染的链接；跨文档后点击 **Back to Settings** 返回，最后用 Close 退出。源码 HTML 是 Vite 入口；实际加载 `dist/renderer/settings.html`，仍然是独立文档而非 SPA 路由。

| 链接 | 当前源码策略／预期 | 历史观察或待验证 |
| --- | --- | --- |
| Same-document hash navigation | 同一文档改变 hash | 已观察 `isSameDocument: true`、`did-navigate-in-page` |
| Current-window document navigation | 允许切换到 `navigation-target.html` | 已观察跨文档导航及加载事件 |
| New-window request | `setWindowOpenHandler` 返回 deny | 已观察 `window-open-request`，没有创建新窗口 |
| Open Electron docs in system browser | 阻止窗口内导航，交给 `shell.openExternal` | 本轮只核对代码；系统浏览器打开结果未重新验证 |
| Blocked local page | `index.html` 不在 Settings 本地页面白名单 | 已纳入自动化：等待拒绝日志并确认 URL 未改变 |
| Blocked external site | `example.com` 不在允许的官方 origin 中 | 本轮只核对代码策略，未重做点击验证 |

定位 [main.js](../../main.js) 的 `getSettingsNavigationAction`、`handleSettingsNavigation`、`will-navigate`、`will-frame-navigate`、`will-redirect` 和 `setWindowOpenHandler`。当前外链只允许准确的 `https://www.electronjs.org` origin，带用户名或密码的 URL 被拒绝；不能把这一示例当作所有应用的通用白名单。

hash 是否同文档看 `isSameDocument` 等证据，不能仅凭 `did-start-loading` 判断重载。跨文档后页面变量重建，也不直接证明操作系统进程 PID 更换。

## 加载失败的历史反例

学习时临时将 Settings 的加载文件改为不存在的 `missing-settings.html`，一次全新启动的日志包含以下顺序。文件路径已脱敏，保留事件和错误码：

```text
[settings] did-start-loading
[settings] did-fail-load { errorCode: -6, errorDescription: 'ERR_FILE_NOT_FOUND', ... }
[settings] dom-ready
[settings] did-finish-load
[settings] failed to load Error: ERR_FILE_NOT_FOUND ...
[settings] closed
```

这个结果说明：该次失败中仍出现 `did-finish-load`，但加载 Promise 进入 catch。不能仅凭一个完成事件确认请求的 HTML 成功加载。后续事件来自错误文档属于「推断」，该次没有额外验证文档身份。

当前代码使用 `loadFile(rendererPath('settings.html'))`。如需重做，在干净检查点临时把其中的文件名替换为 `missing-settings.html`，重启并打开 Settings，记录完整日志后恢复。catch 中会 `destroy()` 窗口，所以这里的 `closed` 不能解释成“所有加载失败都会自动关窗”。该临时变更尚无独立历史 commit，不提供虚构的版本链接。

## 结论与边界

正常加载、同文档导航、跨文档导航、新窗口请求与加载失败需要分开比较。本记录保存历史观察并核对当前入口；本轮没有重新操作所有导航场景，也没有宣称整个导航安全策略已通过测试。
