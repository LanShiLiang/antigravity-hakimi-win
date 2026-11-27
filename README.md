# antigravity-hakimi-win

基于 Google Antigravity App 的 Windows x64 独立增强客户端。首版目标是在独立窗口里使用中文菜单和 Token 用量面板。

目前已完成官方底包的离线提取和校验，在 Antigravity 2.35.2 上验证通过。独立启动、中文菜单和用量面板仍在开发中。各阶段验收条件见 [Windows x64 立项书](WINDOWS-X64.md)。

## 本地开发

使用 Windows x64、PowerShell、Windows 自带的 tar.exe 和 Node.js 22.4 或更高版本。下载 [Google 官方 Windows x64 安装器](https://antigravity.google/download)，然后从仓库根目录运行：

```powershell
.\scripts\stage-windows-x64.ps1 -Installer 'D:\Downloads\Antigravity-x64.exe'
npm test
```

提取后的开发副本和核验报告位于 `.stage/windows-x64/<版本>/`。

ASAR 工具和中文词典源自 [cli117/antigravity-hakimi](https://github.com/cli117/antigravity-hakimi/tree/3bf79d14e769c93dccd83d3e9fe67b6b5876460a)。本仓库从 Windows 移植基线 `8e7f082` 单独建库。
