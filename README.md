# antigravity-hakimi-win

为 Windows x64 构建的独立 Antigravity 客户端。当前开发版可以从 Google Antigravity App 2.35.2 的官方安装器构建便携目录，程序入口为 `Hakimi.exe`。它使用独立的 Electron 应用名称，并在原生菜单中提供“新建窗口”（Ctrl+Shift+N）。

已在 Windows 上以零可见窗口启动实际 EXE，核对其默认菜单、快捷键和 ASAR 完整性设置。主窗口显示、真实点击、登录及与官方客户端同时运行仍待人工验收。Token 用量面板见[项目进度](WINDOWS-X64.md)。

## 构建与运行

需要 Windows x64、Node.js 22.12 或更新版本、PowerShell 和 Windows 自带的 tar.exe。当前支持的底包是 [Google Antigravity App 2.35.2 Windows x64](https://storage.googleapis.com/antigravity-public/antigravity-hub/2.35.2-4585983447007232/windows-x64/Antigravity-x64.exe)。在仓库根目录运行以下命令，将第一条构建命令的安装器路径替换为本机路径。

```powershell
npm ci --ignore-scripts
.\scripts\stage-windows-x64.ps1 -Installer 'D:\Downloads\Antigravity-x64.exe'
npm run build:win
npm test
npm run check:win
```

成品位于 `.stage\Hakimi-win32-x64\Hakimi.exe`。保留整个同级目录，准备好体验时手动启动 EXE。首次构建需要下载 Electron 44.9.1。已存在的同版本底包可跳过提取；再次构建时，先把已有成品目录移走。开发版使用本地构建更新。

仓库发布构建工具和项目源码。Google 的应用文件由开发者从官方安装器在本地提取。许可证及上游来源见 [MIT License](LICENSE) 和[第三方说明](THIRD-PARTY-NOTICES.md)。
