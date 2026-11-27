# 哈基米 Windows x64 独立增强客户端立项书

2026-11-27 立项。立项基线来自 `windows-x64`，独立仓库在 `main` 开发，上游起点为 `3bf79d14e769c93dccd83d3e9fe67b6b5876460a`。

## 产品与交付

目标是在 Windows x64 上单独启动“哈基米”，在同一客户端窗口中使用中文菜单和用量面板。底座选用 Google Antigravity App。首个可用版本应能与官方客户端分别安装、分别启动，并且能单独卸载。界面验收使用隔离的测试配置；正式版登录态和会话数据是否共享，须在实现数据目录和单实例行为验证后决定。

## 里程碑

| 阶段 | 交付和通过条件 | 当前状态 |
| --- | --- | --- |
| M0 底包 | 在 Windows 离线提取 Google 签名有效的安装器，核验主程序为 x64 PE32+、版本与应用清单一致、ASAR 主入口存在；输出指纹；拒绝覆盖已有副本 | 已在 2.35.2 验证 |
| M1 首个中文菜单 | 产出有独立启动入口与运行身份的哈基米副本。确认 Windows 包的资源完整性要求，按自有产品身份构建。用隔离配置启动；在主窗口看到“新建窗口”，点击与原快捷键都能新建哈基米窗口。与原版共存时，两个入口各自打开正确进程 | 已构建便携 EXE；在零可见窗口下核验真实原生菜单与快捷键，前台点击、登录及共存待验收 |
| M2 用量面板 | 复用用量计算和渲染代码。在一条已知用量的真实会话中核对输入、输出、缓存与合计；覆盖无记录、重复刷新和重启，确认不重复计数 | 待开发 |
| M3 安装与卸载 | 提供 Windows x64 安装包、版本号和摘要。验证干净安装、并存、升级失败可恢复，以及单独卸载后官方客户端仍可用 | 待开发 |

原版的钥匙串多账号、双源自动升级、远端修改和 CLI 地区解锁均不计入上述验收。Windows 首版的优先顺序是独立启动、可见的汉化和可核对的用量。

## 当前底包与源码证据

- 官方来源为 [Antigravity 下载页](https://antigravity.google/download) 的 **Antigravity App → Windows x64**。本轮底包为 [2.35.2 安装器](https://storage.googleapis.com/antigravity-public/antigravity-hub/2.35.2-4585983447007232/windows-x64/Antigravity-x64.exe)。
- 安装器 170273968 字节，系统验签结果为 `Valid`，签名者为 `Google LLC`。SHA-256 为 `1C66F68FA45E9EBC55AEC5479617A9EEAA305BA8B16A1BEE8327B8BAD9D10258`。提取出的 `Antigravity.exe` 单文件检查结果为 `NotSigned`，来源由外层安装器签名核验。
- 官方 ASAR 清单的版本为 `2.35.2`，主入口为 `dist/main.js`。ASAR 头部 SHA-256 为 `51bed21d0cf02941b90ed0cd74d66fb31bc4f70ac24119362548216c791c55bb`。副本包含 `locales/zh-CN.pak`；它是 Chromium 语言资源，应用菜单需单独验证。
- 2.35.2 的 `dist/main.js` 调用 `setupApplicationMenu`。`dist/menu.js` 向 File 菜单添加 `New Window`，快捷键为 `CmdOrCtrl+Shift+N`。仓库的 `payload/dist/i18n/zh-CN.json` 已有“新建窗口”。同一模块还用英文标签定位父菜单；M1 首先处理子项显示，保留菜单查找、快捷键及点击行为。
- 官方底包保留在 `.stage/windows-x64/2.35.2`；独立开发版输出至 `.stage/Hakimi-win32-x64-0.1.1`。运行时采用 Electron 44.9.1，按独立产品身份打包、校验应用资源；便携版内置更新状态为 disabled。交互和发布安装包仍待验收。

## 本地复现

从仓库根目录打开 PowerShell，使用 Windows 自带的 tar.exe 以及 Node.js 22.12 或更高版本。将参数替换为从官方下载的安装器文件路径。

```powershell
.\scripts\stage-windows-x64.ps1 -Installer 'D:\Downloads\Antigravity-x64.exe'
node .\scripts\windows-base.js --inspect '.\.stage\windows-x64\2.35.2'
```

脚本固定提取到仓库的 `.stage/windows-x64/<版本>/`。它先验证签名和应用信息，在新临时目录提取并核验，再发布副本及 `windows-base.json`。同版本目录已存在时会退出，可使用上面的只读检查复核副本。运行构建步骤不会启动桌面应用。

前台验收按用户的工作区要求单独安排。后台先完成包结构、独立路径、完整性及自动化检查，再经允许核对真实窗口、中文菜单与交互。
