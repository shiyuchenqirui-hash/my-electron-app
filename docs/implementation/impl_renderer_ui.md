# 实验界面与 Renderer 构建

> **类型**: 实现记录
> **状态**: 已实现
> **作者**: shiyu.chen
> **创建日期**: 2026-10-07
> **最后更新**: 2026-10-07

## TL;DR

- 将已有计数器、Settings、导航目标页和 Session 页统一为 React、Tailwind CSS、shadcn/ui，不增加新的业务实验。
- Vite 只编译 Renderer，保留四个独立 HTML 和 `file://` 加载；Main、Preload 的 IPC 边界与源码入口不变。
- 原生 CSS 基线保存在 `d1f9c77`。迁移与后续 Session 展示优化分开提交，验证记录见实验索引。

## 方案与约束

采用 [Tailwind Vite 集成](https://tailwindcss.com/docs/installation/using-vite) 和 [shadcn/ui Vite 方案](https://ui.shadcn.com/docs/installation/vite)。没有为套脚手架重建整个 Forge 项目，也没有切换为 HTTP 开发服务器：导航实验依赖独立文档及明确的本地 URL 白名单。

React 负责视图；Tailwind 负责布局和主题；Button、Card、Badge 由官方 shadcn CLI 添加到 `ui/components/ui/`。组件保留 MIT 许可，适配本地 `cn` 工具和独立 Radix Slot 依赖；配置入口为 `components.json`。可继续通过 CLI 添加组件，但需审核生成结果。

不使用 CDN、远程字体、SPA Router 或 HMR。CSP 仍限制为本地脚本与样式，没有为 React 添加 `unsafe-eval` 或 `unsafe-inline`。第三方依赖版本以锁文件为准。

## 构建与代码入口

| 入口 | 行为 |
| --- | --- |
| `npm start` | Forge `generateAssets` hook 调用 Vite build，再启动 Electron |
| `npm test` | pretest 构建 Renderer，再由 Playwright 启动 Main 源码 |
| `npm run package` / `make` / `publish` | Forge 打包阶段先构建，再收集本地资源；publish 会发布，不用于普通验证 |
| VS Code 的 Main 调试配置 | preLaunchTask 运行 build，然后启动 Electron |
| `npm run build:watch` | 监听 UI 源码并重建；成功后通过 View → Reload 刷新页面 |

Vite 入口是根目录四个 HTML，产物在忽略的 `dist/renderer/`。`renderer-path.js` 统一 Main 的加载路径，Settings 白名单和 Session IPC 来源校验使用同一路径，防止迁移后放宽校验。

业务断点仍设在 `renderer.js` 的 `handleUpdateCounter`、`settings-renderer.js` 的 `handleCloseSettings`、`session-renderer.js` 的 `runAction`。JSX 展示位于 `ui/`；Main 和 Preload 不打包。构建保留 source map 和未压缩 JS，方便观察；发布体积优化不在本轮范围。

## 迁移后的语义

- Counter 从手写 DOM 更新改为 React 状态更新。IPC 回传不等待 React DOM 提交，不可把 `setValue()` 当作同步改 DOM。
- Preload 订阅返回取消函数，由 React effect 清理，原始 IPC event 仍不暴露给页面。
- Settings 仍是原生模态 BrowserWindow，不用 shadcn Dialog 替代，因此父子窗口实验保持原含义。
- Session 页面展示 Main 返回的快照，不自动更新另一个窗口、不伪造 Session 状态，不改变 partition 配置。

## 验证与边界

Smoke Test 延续原有窗口和 Cookie 检查，并增加 Counter 菜单 handler、重载和 Settings 导航回归。实际执行结果统一见 [实验索引](README.md)。自动化调用原生菜单 handler，不等于真实鼠标菜单操作；source map 生成不等于本轮已手动验证 VS Code 每个断点。

打包验证与开发态测试分开记录。Windows/Linux、多显示器、正式签名与更新链路不属于本轮已验证能力。
