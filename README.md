# my-electron-app

一个使用 Electron Forge 的个人学习项目。通过菜单计数器、模态设置窗口和页面导航等小实验，观察 Main、Preload、Renderer 的通信、安全边界及生命周期。

实验过程和结果保存在 [实验索引](docs/implementation/README.md)，后续阅读顺序见 [学习路线](docs/implementation/impl_electron_learning_roadmap.md)。项目用于学习与复现，尚不是生产应用。

## 运行与退出

当前练习环境为 macOS，使用 Node.js 22.x；本地已安装版本为 Electron 44.4.5、Forge 7.11.2、Playwright Test 1.63.0。依赖版本以 `package-lock.json` 为准，Windows/Linux 尚未在本项目验证。

在项目根目录执行：

```sh
npm ci
npm start
```

启动后出现最大化的 `Menu Counter` 窗口（不进入 macOS 独立全屏空间），开发模式会同时打开 DevTools。首次安装需要下载 Electron。

- 点击应用菜单 **Counter → Increment / Decrement**，观察数字和启动终端输出。
- 点击 **Window → Open Settings**，打开模态设置窗口；窗口内的 **Close** 按钮关闭它。
- Settings 中有同页 hash、当前窗口跳转、新窗口和外链的实验入口；逐项说明见实验索引。
- 点击 **Session → Open Shared Windows / Open Isolated Windows**，进行 [双窗口 Cookie 共享与隔离实验](docs/implementation/impl_session_partition.md)；A、B 自动按当前显示器可用区域左右排列，重复选择同一菜单可重新排齐。切换模式前先关闭 A、B。
- macOS 点击应用菜单中的 **Quit** 退出整个应用；只关闭窗口可能仍保留应用进程。

## 调试与测试

在 VS Code 左侧选择“运行和调试”，选择 **Main + renderer**，点击绿色三角启动（会先自动构建 Renderer）。先打开 Settings，再选择 **Renderer - Settings Window** 并点击绿色三角附加设置页。配置见 [.vscode/launch.json](.vscode/launch.json)；附加使用本机 9222 端口，运行前退出上一轮实例。Main、Preload 仍调试原文件；Renderer 通过 source map 对应根目录的 `*-renderer.js`、`renderer.js` 和 `ui/` 源码。

```sh
npm test
```

[Smoke Test](tests/electron.smoke.spec.js) 覆盖开发态启动、计数器菜单与重载、模态窗口关系和关闭、部分导航策略，以及双窗口 Cookie 共享与隔离。它们不覆盖全部 IPC、导航、崩溃实验，也不验证打包产物。最近一次执行情况统一记录在 [实验索引](docs/implementation/README.md)。

## 代码入口

四个页面使用 React + Tailwind CSS + shadcn/ui。Vite 构建到 `dist/renderer/`，Electron 仍通过 `loadFile()` 加载独立 HTML，不使用 SPA 路由或远程开发服务器。[styles.css](styles.css) 定义共享主题，[ui/components/ui](ui/components/ui) 保存官方 CLI 生成并适配的组件源码。方案与迁移边界见 [界面构建记录](docs/implementation/impl_renderer_ui.md)。

`npm start`、Forge 打包和 `npm test` 会先构建页面。编辑 UI 时可另开终端执行 `npm run build:watch`，等构建成功后点击应用菜单 **View → Reload**；没有启用 HMR。直接执行 `npx electron .` 前须先运行 `npm run build`，否则可能缺少页面或加载旧产物。

| 文件 | 阅读重点 |
| --- | --- |
| [main.js](main.js) | 创建窗口、应用菜单、IPC 接收、Settings 导航策略及加载日志 |
| [preload.js](preload.js) | 通过 `contextBridge` 暴露有限 API，过滤原始 IPC event |
| [renderer.js](renderer.js) | 接收菜单消息、更新 React 状态、回传计数 |
| [settings-renderer.js](settings-renderer.js) | 设置页关闭按钮到 Preload 的调用 |
| [ui/settings-page.jsx](ui/settings-page.jsx) | 同页与跨文档导航的对照链接；两个独立 HTML 仍保留 |
| [session-renderer.js](session-renderer.js)、[ui/session-page.jsx](ui/session-page.jsx) | Session IPC 操作和展示分层 |

## 构建与当前边界

`npm run package` 生成应用目录，`npm run make` 生成当前平台配置的分发产物，输出在 `out/`。`npm run publish` 会执行发布流程；当前 [Forge 配置](forge.config.js) 指向作者的 GitHub 仓库并创建 Draft，不属于普通运行步骤。Fork 后发布前应先修改目标仓库。

当前配置启用了 ASAR 和部分 Fuses，未配置 macOS 正式签名；真实自动更新链路尚未验证。虽然依赖包含 `update-electron-app`，当前 `main.js` 没有初始化调用，不能据此宣称自动更新已启用。

研究结论区分官方契约、源码分析和实际观察。历史记录不随代码清理而删除；有必要复测的实验保留入口，其余通过步骤和历史版本追溯。
