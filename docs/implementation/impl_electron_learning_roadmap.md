# Electron 学习路线与进度记录

> **类型**: 实现记录
> **状态**: 草稿
> **作者**: shiyu.chen
> **创建日期**: 2026-09-29
> **最后更新**: 2026-10-04

## TL;DR

- 本文将 Electron 官网目录重组为核心原理、近期实践、按需能力和暂缓内容，避免按左侧菜单线性阅读。
- 当前已经完成 Forge 打包发布、Playwright Smoke Test、Main/Preload/Renderer 双向 IPC、窗口生命周期和多 Renderer 调试实践。
- 下一阶段从 `webContents` 开始，随后补齐导航与外链安全、`session`、异常恢复和测试诊断能力。
- 项目继续以 Playwright Test 为主要自动化路线；WebDriver 保持概念层理解，不同时维护两套测试框架。
- 文中的“已阅读”“已实践”和“待验证”含义不同，不以看完页面代替实际掌握。

## 目录

- [1. 学习目标与状态定义](#1-学习目标与状态定义)
- [2. 当前进展](#2-当前进展)
- [3. 核心学习路线](#3-核心学习路线)
- [4. 示例功能的阅读优先级](#4-示例功能的阅读优先级)
- [5. 开发、分发与调试](#5-开发分发与调试)
- [6. 自动化测试工具选择](#6-自动化测试工具选择)
- [7. 下一步顺序](#7-下一步顺序)
- [8. 维护方式与参考资料](#8-维护方式与参考资料)

## 1. 学习目标与状态定义

这条路线的目标不是读完 Electron 官网，而是形成一套可以用于开发、调试和解释 Electron 应用的知识结构。API Reference 作为查询手册使用，示例章节按实际需求选择，不作为线性课程。

| 状态 | 含义 |
|------|------|
| 已实践 | 已在本项目、Electron Fiddle 或实际代码中操作过 |
| 已阅读 | 已阅读或讨论核心概念，但不代表能独立实现 |
| 待验证 | 已做配置或尝试，但还没有拿到完整运行结果 |
| 阅读中 | 当前正在阅读和理解 |
| 待读 | 近期应补齐 |
| 按需 | 出现对应需求后再学 |
| 暂缓 | 当前投入产出比较低，可以跳过 |

## 2. 当前进展

| 主题 | 当前状态 | 已完成内容或边界 |
|------|----------|------------------|
| 入门教程 | 已实践 | 已完成基础窗口、Preload、Renderer 和 Forge 项目结构 |
| Forge 打包与发布 | 已实践 | 已执行 `package`、`make`、`publish`，并发布 GitHub Release |
| 代码签名与自动更新 | 待验证 | 已接入 `update-electron-app`；当前缺少正式 macOS 签名，真实升级链路尚未验证 |
| 进程模型 | 已实践 | 已区分 Main、Renderer、Preload、Utility Process，并分别连接调试目标观察代码执行 |
| Context Isolation 与 Sandbox | 已阅读并局部实践 | 已理解隔离世界、权限边界和 Preload 的作用，并通过 `contextBridge` 暴露最小 API |
| IPC | 已实践 | 已完成 Main → Preload → Renderer → Preload → Main 双向链路及跨边界断点调试 |
| MessagePort | 已阅读 | 已理解 Renderer 间直连和响应流场景，暂未做完整示例 |
| 菜单 | 已实践 | 已使用 Electron Fiddle/Gist 练习，并在项目中实现计数器和 Settings 菜单入口 |
| `app` 生命周期 | 已实践 | 已学习 `ready`、`activate`、`window-all-closed` 及主动退出事件顺序 |
| `BrowserWindow` | 已实践 | 已实现主窗口、父子关系、模态 Settings 窗口及 `close`/`closed` 生命周期观察 |
| 调试 | 已实践 | 已使用 Node Inspector、Electron DevTools 和 VS Code 调试 Main、Preload 与多个 Renderer target |
| 性能 | 已实践但未完成分析 | 已生成 CPU/Heap Profile；尚未完成火焰图和热点判断 |
| 安全 | 已阅读并局部实践 | 已讨论远程内容、`contextBridge`、WebView/WebContentsView 和 IPC 暴露边界，并校验 Settings IPC sender |
| 深度链接 | 已阅读并分析项目 | 已阅读官方方案，并分析 `migoo-pc` 的注册、冷启动、热启动和路由校验链路 |
| 多线程 | 已浏览 | 已明确它属于 CPU 密集任务场景，不作为当前主线 |
| ASAR 与 Fuses | 已阅读 | 已理解 ASAR、完整性校验、`OnlyLoadAppFromAsar` 和 Fuses 的职责边界 |
| 自动化测试 | 已实践 | 已安装 Playwright Test，并覆盖应用启动、Main 状态读取、模态窗口关系和关闭操作 |

## 3. 核心学习路线

### 3.1 必须掌握

以下内容构成 Electron 的核心知识主干，应达到能够说明职责、调用方向、生命周期和安全边界的程度。

| 主题 | 学习重点 | 状态 |
|------|----------|------|
| [流程模型](https://www.electronjs.org/zh/docs/latest/tutorial/process-model) | Main、Renderer、Preload、Utility Process | 已实践 |
| [上下文隔离](https://www.electronjs.org/zh/docs/latest/tutorial/context-isolation) | 隔离世界、`contextBridge`、最小 API 暴露 | 已阅读并局部实践 |
| [进程间通信](https://www.electronjs.org/zh/docs/latest/tutorial/ipc) | 单向、双向、请求响应和 sender 校验 | 已实践 |
| [进程沙盒化](https://www.electronjs.org/zh/docs/latest/tutorial/sandbox) | Renderer 权限、Node Integration 与 Sandbox | 已阅读 |
| [安全指南](https://www.electronjs.org/zh/docs/latest/tutorial/security) | 远程内容、导航、新窗口、外链、IPC 校验 | 已阅读，后续回顾 |
| [性能指南](https://www.electronjs.org/zh/docs/latest/tutorial/performance) | Main/Renderer 阻塞、启动成本和性能分析 | 已阅读并局部实践 |

每篇核心文档应能回答以下问题：

1. 代码运行在哪个进程或线程？
2. 它跨越了什么权限边界？
3. 冷启动、热启动或窗口销毁时会发生什么？
4. 当前项目在什么场景下会用到它？

### 3.2 近期补齐

| 主题 | 学习重点 | 状态 |
|------|----------|------|
| `app` 生命周期 | `ready`、`activate`、`window-all-closed`、退出流程 | 已实践 |
| `BrowserWindow` | 窗口创建、显示、销毁和 `webPreferences` | 已实践 |
| `webContents` | 页面生命周期、导航、IPC、DevTools 和崩溃处理 | 待读 |
| `session` | 权限、Cookie、网络请求和下载管理 | 待读 |
| 导航与新窗口 | `will-navigate`、`setWindowOpenHandler`、外链校验 | 待读 |
| Renderer 稳定性 | `render-process-gone`、无响应和加载失败恢复 | 待读 |

### 3.3 按需深入

| 主题 | 触发条件 | 状态 |
|------|----------|------|
| [MessagePort](https://www.electronjs.org/zh/docs/latest/tutorial/message-ports) | Renderer 间直连、大量连续消息或数据流 | 已阅读，按需实践 |
| [多线程](https://www.electronjs.org/zh/docs/latest/tutorial/multithreading) | Renderer 中出现明显 CPU 密集计算 | 按需 |
| Utility Process | OCR、转码、压缩、索引等任务不能阻塞 Main | 按需 |
| [Native Node Modules](https://www.electronjs.org/zh/docs/latest/tutorial/using-native-node-modules) | 安装 `.node` 模块或遇到 ABI/rebuild 问题 | 按需 |
| Electron 中的 ESM | 项目迁移 ESM 或遇到模块加载时序问题 | 按需 |
| Service Worker | 复杂离线缓存、资源更新或网络代理需求 | 按需 |

`nodeIntegrationInWorker: true` 需要关闭 Sandbox，因此多线程文档展示的是一种特殊能力，不应直接作为普通 Electron 应用的默认结构。CPU 密集任务首先判断其运行环境：纯浏览器计算可考虑 Web Worker；需要 Node 能力并要求故障隔离时优先评估 Utility Process。

## 4. 示例功能的阅读优先级

示例章节用于解决具体需求，不需要从上到下全部阅读。

| 优先级 | 示例 | 阅读策略 |
|--------|------|----------|
| 高 | Menus、键盘快捷键、深度链接、自定义窗口 | 阅读并在 Fiddle 或项目中做最小实践 |
| 高 | Web 嵌入、BrowserWindow 展示文件 | 重点理解远程内容和权限边界 |
| 中 | 通知、原生文件拖放、Dark Mode | 出现对应产品需求时实践 |
| 中 | 任务栏、Dock、托盘 | 开始完善桌面体验时学习 |
| 低 | 应用内购买、设备访问、离屏渲染 | 当前暂缓 |
| 低 | 桌面启动器快捷操作、最近文件 | 出现系统集成需求时再看 |

## 5. 开发、分发与调试

### 5.1 当前进展

| 主题 | 目标 | 状态 |
|------|------|------|
| 调试主进程 | 使用 Inspector/DevTools 定位 Main 逻辑 | 已实践 |
| 使用 VS Code 调试 | 分别启动或附加 Main 与 Renderer | 已实践 |
| 调试应用 | 区分 Chromium、Node 和 Electron 调试目标 | 已实践 |
| 多窗口调试 | 按页面 URL 附加主窗口与 Settings Renderer | 已实践 |
| ASAR Archives | 理解打包结构、读取语义和 unpack 边界 | 已阅读，待观察产物 |
| ASAR Integrity | 理解打包产物完整性检查 | 已阅读 |
| Electron Fuses | 理解构建阶段关闭高风险能力 | 已阅读 |

### 5.2 当前可暂缓

- Windows on ARM
- Native C++ 教程
- Headless CI 专项配置
- Electron 源码编译与参与贡献
- 版本发布内部流程和框架维护资料

## 6. 自动化测试工具选择

### 6.1 概念关系

WebDriver、Selenium、WebdriverIO 和 Playwright 不是四个平级概念。

| 名称 | 定位 | Electron 中的方式 |
|------|------|------------------|
| WebDriver | 浏览器自动化协议和标准接口 | 通过驱动程序向 Chromium/Electron 发送标准化命令 |
| ChromeDriver | Chromium 对 WebDriver 的驱动实现 | 连接 Electron 内置的 Chromium |
| Selenium | 支持多语言的 WebDriver 自动化框架 | 需要配置 `electron-chromedriver`、端口和应用二进制路径 |
| WebdriverIO | JavaScript/TypeScript 测试框架，属于 WebDriver 生态 | Electron Service 可自动准备 ChromeDriver、识别 Forge/Builder 产物并访问或模拟 Electron API |
| Playwright | 测试运行器和浏览器自动化库 | 通过 CDP 提供实验性的 Electron 支持，使用 `_electron.launch()` 启动应用 |

### 6.2 核心差异

| 维度 | WebdriverIO / WebDriver | Playwright |
|------|-------------------------|------------|
| 底层入口 | WebDriver 与 ChromeDriver 生态 | Electron 场景主要通过 Chrome DevTools Protocol |
| Electron 启动 | Electron Service 可识别构建产物并管理启停 | `_electron.launch({ args: ['.'] })` 启动开发态应用 |
| Renderer 操作 | WebdriverIO 元素与断言 API | 使用 Playwright `Page`、Locator 和断言 API |
| Main 访问 | `browser.electron.execute()` 等 Electron Service 能力 | `electronApp.evaluate()` 在 Main 中执行代码 |
| 生态优势 | 标准化、跨语言、适合已有 WebDriver/WDIO 基础设施 | 前端开发体验直接，测试运行器、等待、截图、Trace 集成度高 |
| Electron 支持状态 | WebdriverIO 提供正式 Electron Service | Playwright 官方仍将 Electron API 标为 experimental |
| 适合场景 | 团队已有 WDIO/Selenium，或需要复用 WebDriver 基建 | 新的 JS/TS Electron 项目和页面交互测试 |

两条路线都主要控制 Electron 的 Web 内容并通过额外 API 进入 Main。它们不是完整的操作系统 GUI 自动化工具。原生文件选择器、系统菜单、权限弹窗等能力可能需要在 Main 中模拟，或使用平台级自动化工具单独验证。例如 Playwright 官方明确说明其不会直接拦截 Electron 的原生 `dialog` API。

### 6.3 当前决策

本项目采用以下学习策略：

1. **Playwright Test 作为主线**：项目是 JavaScript Electron Forge 应用，Playwright 的学习成本和页面测试体验更合适。
2. **WebDriver 学到概念层**：理解 WebDriver、ChromeDriver、Selenium 和 WebdriverIO 的关系，能够看懂配置和测试代码。
3. **暂不安装 WebdriverIO/Selenium**：同时维护两套端到端测试框架不会增加当前学习价值。
4. **出现明确条件再补 WebdriverIO**：团队已有 WDIO 基建、岗位明确要求或需要复用 WebDriver 测试平台时再实践。

此外，Playwright MCP 与 Playwright Test 不是同一个用途：

- Playwright MCP 用于让 AI 接管当前浏览器进行联调和观察。
- Playwright Test 是安装在项目中的自动化测试框架，测试代码可以提交并在本地或 CI 重复执行。

### 6.4 Playwright 学习里程碑

- [x] 完成 Electron 官网 Playwright 小节
- [x] 理解 `_electron.launch()`、`ElectronApplication` 和 `firstWindow()`
- [x] 为本项目安装 `@playwright/test`
- [x] 编写“应用可以启动并显示主窗口”的 Smoke Test
- [x] 使用 Locator 操作 Renderer 页面并断言结果
- [x] 使用 `electronApp.evaluate()` 读取 Main 状态
- [x] 验证两个 `BrowserWindow` 的独立 `webContents`、父子关系和模态状态
- [ ] 生成并查看失败截图或 Trace
- [ ] 再单独讨论适合本项目的测试范围，不追求一次覆盖所有能力

## 7. 下一步顺序

后续按以下顺序推进：

1. 学习 `webContents` 的页面加载事件、DevTools 控制和 Renderer 崩溃处理。
2. 实践 `will-navigate`、`setWindowOpenHandler`、`shell.openExternal()` 和 URL 白名单。
3. 学习 `session` 的 Cookie、缓存、代理、权限、请求拦截和下载管理。
4. 实践 `render-process-gone`、加载失败和无响应场景的诊断与恢复。
5. 补充 Playwright 失败截图、Trace Viewer、多窗口测试和诊断信息收集。
6. 完成 CPU/Heap Profile 分析，并比较基础启动与附加模块后的性能差异。
7. 观察 Forge 产物中的 `app.asar`，再根据分发需求补齐签名、公证和真实自动更新验证。
8. 根据实际需求选择 Web 嵌入、通知、拖放、托盘、MessagePort 或 Utility Process 等能力。

## 8. 维护方式与参考资料

每完成一项学习，应更新对应状态，并记录“实际做过什么”。仅阅读页面时标记为“已阅读”；只有运行过示例或验证过项目行为后才标记为“已实践”。无法确认结果时使用“待验证”，避免把配置完成当成功能已经生效。

主要参考资料：

- [Electron 官方文档](https://www.electronjs.org/zh/docs/latest/)
- [Electron 自动化测试](https://www.electronjs.org/zh/docs/latest/tutorial/automated-testing)
- [Playwright Electron API](https://playwright.dev/docs/api/class-electron)
- [WebdriverIO Electron Service](https://webdriver.io/docs/desktop-testing/electron/)
- [Electron Forge 文档](https://www.electronforge.io/)
