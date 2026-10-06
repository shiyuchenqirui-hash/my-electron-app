# Electron 实验索引

> **类型**: 实现记录
> **状态**: 已实现
> **作者**: shiyu.chen
> **创建日期**: 2026-10-04
> **最后更新**: 2026-10-07

## TL;DR

- 本索引连接可运行代码与问题导向的实验记录，阅读顺序另见 [学习路线](impl_electron_learning_roadmap.md)。
- “历史手测”来自学习时的操作、日志与截图；“本次复测”只涵盖下面明确列出的检查。
- 记录于 2026-10-04 补齐；本轮整理不代表当天首次完成所有实验，也不代表所有实验都有自动化覆盖。

## 实验入口

先按 [项目 README](../../README.md) 启动应用，再选择一个问题。

| 研究问题 | 触发入口 | 证据与边界 |
| --- | --- | --- |
| [一次计数消息如何经过三个执行环境？](impl_ipc_counter.md) | Counter → Increment / Decrement | 历史断点手测；自动化覆盖菜单递增与重载后重新订阅，未逐条断言返回 Main 的计数日志 |
| [Settings 如何创建、显示和关闭？](impl_modal_lifecycle.md) | Window → Open Settings → Close | 历史手测；现有测试覆盖父子关系、modal、独立 webContents 和关闭 |
| [页面加载失败与不同导航如何区分？](impl_navigation_loading.md) | Settings 内六个链接；失败场景见文档 | 历史日志；已增加 hash、跨文档、本地拒绝与新窗口拒绝的自动化检查 |
| [Renderer 终止后哪些对象和状态仍在？](impl_renderer_recovery.md) | VS Code Main Debug Console | 历史控制台实测；临时探针未写入业务代码，无自动恢复实现 |
| [独立窗口如何共享或隔离 Cookie？](impl_session_partition.md) | Session → Open Shared Windows / Open Isolated Windows | 共享、隔离自动化通过；第一轮已手测，第二轮待手测，持久化对照尚未实现 |
| [界面怎样构建且保留原实验？](impl_renderer_ui.md) | npm start / VS Code Main | React、Tailwind、shadcn/ui 多页面构建；保留本地导航和原生模态窗口 |

## 验证基准

本文整理基于本地 `8e6f271eeb82b42bd7807db3ff6fb8cb0c1ecbcc` 之后的工作区。该旧 SHA 不包含导航相关 `main.js`、`settings.html` 改动和新增的 `navigation-target.html`；复现新增导航实验应使用包含这些文件的后续版本。

当前已安装版本：Electron 44.4.5、Forge 7.11.2、Playwright Test 1.63.0；复测使用 macOS 与 Node.js 22.23.2。首次在受限工具环境执行 `npm test` 时，Electron 未能启动，随后出现清理阶段的 `electronApp.close()` 错误；该次没有验证业务断言。

2026-10-04 在允许桌面进程启动的环境复测 `npm test`：`2 passed (4.1s)`。通过的是上述两个现有用例，不扩展为导航、崩溃、签名或自动更新已验证。新克隆安装和 Forge 打包没有在本轮重新执行。

2026-10-06 使用 Node.js 22.23.2 运行 `npm test`：受限环境首先报 `Process failed to launch`，未执行到业务断言；允许桌面进程启动后复测为 `3 passed (6.2s)`。新增用例验证 A 写入/B 读取、B 删除/A 读取为空、不同 webContents 共享同一个内存 Session；原有两个用例也通过。新增 JavaScript 的语法检查和 `git diff --check` 通过。随后用户确认第一轮已手测；跨 partition 隔离及重启持久化尚未验证。

2026-10-06 第二轮改动后再次执行 `npm test`：`4 passed (8.5s)`（macOS、Node.js 22.23.2、开发态 Electron）。新增隔离用例验证 B 读取不到 A 的 Cookie、双方写入互不覆盖、A 删除不影响 B；原有三个用例也通过。本次未验证跨模式提示弹窗、重启持久化或打包产物。

2026-10-07 窗口布局与共享样式调整后执行 `npm test`：`4 passed (12.7s)`。新增断言确认主窗口最大化，A、B 不重叠、等高且位于显示器可用区域内；Cookie 对照仍通过。已查看测试生成的 Session 页面截图，按钮和 JSON 展示正常；其他操作系统、多显示器切换尚未实测。

2026-10-07 界面迁移后，在 macOS、Node.js 22.23.2 执行 `npm test`：`5 passed (17.6s)`。覆盖原有四项实验，增加计数器菜单/重载及 Settings 导航回归。首次新增导航检查曾因菜单尚未就绪和等待被取消导航而失败；明确等待就绪、拒绝导航使用 `noWaitAfter` 并从 Main 核对真实 URL/页面后通过，未修改导航策略。已查看主窗口和 Settings 截图。`npm run package` 成功，ASAR 内四个 HTML 和 JS/CSS 资源存在；没有启动该打包产物，也未发布 Release。source map 路径核对通过，VS Code 断点仍待用户手测。

2026-10-07 Session 状态界面优化后执行 `npm test`：`5 passed (18.5s)`。新增断言验证摘要与原始值一致、关闭 A 后 B 显示无对照窗口且 Cookie 保留、模拟 IPC 读取失败时保留旧快照并恢复按钮、随后删除成功可清除错误。模拟错误仅在测试中注入，未修改业务 IPC handler。已查看隔离模式页面截图。最终 `npm run package` 在受限环境因 GitHub DNS 失败；允许联网后重试成功，产物为 macOS arm64，未启动打包产物或发布 Release。

## 如何维护

每次完成一个问题，更新对应记录中的环境、操作、证据和边界。学习路线只维护主题进度，不重复粘贴实验结果。已提交的历史结论可引用具体 commit 文件链接；当前操作说明使用相对文件链接。

临时日志和性能原始文件按 `.gitignore` 留在本地；公开文档只摘录必要且脱敏的证据。方法复盘与私人学习安排不作为此处实验完成的证据。
