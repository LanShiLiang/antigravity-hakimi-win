'use strict';

const { app, Menu, BrowserWindow } = require('electron');
app.setAppUserModelId('org.antigravity-hakimi.win');

if (process.argv.includes('--hakimi-check-menu')) {
  // Exercise the bundled menu using Electron's native Menu, without starting
  // the language server, registering a protocol, or creating a visible window.
  app.disableHardwareAcceleration();
  app.whenReady().then(() => {
    require('./dist/menu').setupApplicationMenu('https://127.0.0.1');
    const item = Menu.getApplicationMenu()?.items.flatMap(parent => parent.submenu?.items || []).find(entry => entry.label === '新建窗口');
    if (app.getName() !== 'Antigravity Hakimi Win' || !item || item.accelerator !== 'CmdOrCtrl+Shift+N' ||
        BrowserWindow.getAllWindows().length !== 0) throw new Error('Native menu verification failed');
    const updater = require('./dist/updater');
    updater.initAutoUpdater();
    if (updater.getLastState().type !== 'disabled' || updater.applyHostUpdate() !== false) {
      throw new Error('Portable build must report disabled installer updates');
    }
    console.log(JSON.stringify({ name: app.getName(), menu: item.label, accelerator: item.accelerator,
      profile: app.getPath('userData'), visibleWindows: 0 }));
    app.exit(0);
  }).catch(error => { console.error(error); app.exit(1); });
} else {
  require('./dist/main');
}
