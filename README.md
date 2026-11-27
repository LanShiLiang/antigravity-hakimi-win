# antigravity-hakimi-win

为 Windows x64 构建的独立 Antigravity 客户端。当前开发版可以从 Google Antigravity App 2.35.2 的官方安装器构建便携目录，程序入口为 `Hakimi.exe`。它使用独立的 Electron 应用名称，并在原生菜单中提供“新建窗口”（Ctrl+Shift+N）。

后台自检覆盖便携 EXE 的菜单、快捷键、ASAR 完整性，以及登录页切换授权码表单的行为。真实账号登录与官方客户端共存仍待人工验收。Token 用量面板见[项目进度](WINDOWS-X64.md)。

## 浏览器授权后仍在转圈

0.1.1 在个人账户的 Google 登录按钮旁提供 **使用授权码登录**。如果已经开始普通登录，也可以在转圈时点击 **Trouble signing in? Enter authorization code**。两条入口都会切换到 Antigravity 自带的授权码流程。

在切换后新打开的浏览器页面完成 Google 授权，把页面显示的授权码填入 HakimiWin 的 **Authorization code** 输入框并提交。如果浏览器出现两个标签页，使用切换后新开的那一个。如果浏览器未自动打开，在客户端进入授权码模式后用 **Copy sign-in link** 复制本次链接并自行打开。

## 构建与运行

需要 Windows x64、Node.js 22.12 或更新版本、PowerShell 和 Windows 自带的 tar.exe。当前支持的底包是 [Google Antigravity App 2.35.2 Windows x64](https://storage.googleapis.com/antigravity-public/antigravity-hub/2.35.2-4585983447007232/windows-x64/Antigravity-x64.exe)。在仓库根目录运行以下命令，将第一条构建命令的安装器路径替换为本机路径。

```powershell
npm ci --ignore-scripts
.\scripts\stage-windows-x64.ps1 -Installer 'D:\Downloads\Antigravity-x64.exe'
npm run build:win
npm test
npm run check:win
```

成品位于 `.stage\Hakimi-win32-x64-0.1.1\Hakimi.exe`。保留整个同级目录，准备好体验时手动启动 EXE。首次构建需要下载 Electron 44.9.1。已存在的同版本底包可跳过提取；再次构建时，先把已有成品目录移走。开发版使用本地构建更新。

仓库发布构建工具和项目源码。Google 的应用文件由开发者从官方安装器在本地提取。许可证及上游来源见 [MIT License](LICENSE) 和[第三方说明](THIRD-PARTY-NOTICES.md)。
