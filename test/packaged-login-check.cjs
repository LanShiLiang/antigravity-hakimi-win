'use strict';

const path = require('node:path');
const { BrowserWindow, ipcMain, session } = require('electron');

// Exercise the shipping preload in an isolated renderer. This session serves only
// the fixed onboarding fixture and is discarded when the self-check process exits.
module.exports = async function checkPackagedLogin() {
  const isolated = session.fromPartition('hakimi-login-self-check');
  const fixtureUrl = 'https://127.0.0.1:54321/hakimi-login-self-check';
  const html = `<!doctype html><meta charset="utf-8">
    <main class="entrance-auth-panel"><button title="Continue with Google">Continue with Google</button></main>
    <script>
      const panel = document.querySelector('main');
      panel.querySelector('button').onclick = () => {
        panel.querySelector('button').disabled = true;
        setTimeout(() => {
          const switchMode = document.createElement('button');
          switchMode.dataset.testid = 'onboarding-switch-to-auth-code';
          switchMode.onclick = () => {
            panel.innerHTML = '<div data-testid="onboarding-auth-code-panel"><input id="onboarding-auth-code-input"></div>';
          };
          panel.append(switchMode);
        }, 0);
      };
    </script>`;
  isolated.protocol.handle('https', request => request.url === fixtureUrl
    ? new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    : new Response(null, { status: 404 }));
  const win = new BrowserWindow({
    show: false, focusable: false, paintWhenInitiallyHidden: false,
    webPreferences: {
      session: isolated, preload: path.join(__dirname, 'dist', 'preload.js'),
      sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false,
    },
  });
  // The vendor preload synchronously requests initial settings on startup.
  const emptySettings = event => { event.returnValue = event.sender === win.webContents ? {} : null; };
  ipcMain.on('storage:get-items-sync', emptySettings);
  try {
    await win.loadURL(fixtureUrl);
    return await win.webContents.executeJavaScript(`(async () => {
      const option = document.querySelector('[data-hakimi-code-login]');
      if (!option) throw new Error('Packaged preload did not render the code sign-in option');
      option.click();
      for (let count = 0; count < 60; count++) {
        if (document.querySelector('[data-testid="onboarding-auth-code-panel"] input')) return 'native-code-form';
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('Packaged preload did not switch to the code form');
    })()`);
  } finally {
    ipcMain.removeListener('storage:get-items-sync', emptySettings);
    win.destroy();
    isolated.protocol.unhandle('https');
  }
};
