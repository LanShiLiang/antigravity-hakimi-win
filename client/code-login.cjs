// Runs in the official local Hub preload's isolated world. The upstream page owns
// both OAuth flows, including opening the browser and accepting the authorization code.
function installCodeLogin(win) {
  if (win.top !== win || win.location.protocol !== 'https:' ||
      win.location.hostname !== '127.0.0.1' || !win.location.port) return;
  const doc = win.document;
  const panelSelector = '.entrance-auth-panel';
  const switchSelector = '[data-testid="onboarding-switch-to-auth-code"]';
  const intentButton = '[data-hakimi-code-login]';
  const hintSelector = '[data-hakimi-callback-hint]';
  let pendingTimer = null;
  let panel = null;

  function disarm() {
    if (pendingTimer !== null) win.clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  function personalButton() {
    return [...panel.querySelectorAll('button')].find(button =>
      button.title === 'Continue with Google' || button.textContent.trim() === 'Continue with Google');
  }

  function refresh() {
    if (!panel?.isConnected) return;
    const switchMode = panel.querySelector(switchSelector);
    const codePanel = panel.querySelector('[data-testid="onboarding-auth-code-panel"]');
    if (codePanel) disarm();
    if (pendingTimer !== null && switchMode && !switchMode.disabled && !codePanel) {
      disarm();
      switchMode.click();
      return;
    }
    // Keep recovery discoverable for users who already started the normal flow.
    const hint = panel.querySelector(hintSelector);
    if (switchMode && !codePanel && !hint) {
      const message = doc.createElement('p');
      message.dataset.hakimiCallbackHint = '';
      message.className = 'text-sm text-muted-foreground text-center';
      message.textContent = '浏览器已授权，但这里还在转圈？点击下方链接切换到授权码登录。';
      switchMode.before(message);
    } else if ((!switchMode || codePanel) && hint) {
      hint.remove();
    }
    const original = personalButton();
    const existing = panel.querySelector(intentButton);
    if (!original || original.disabled || switchMode || codePanel) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const option = doc.createElement('button');
    option.type = 'button';
    option.dataset.hakimiCodeLogin = '';
    option.className = 'text-sm text-secondary-foreground hover:text-foreground underline cursor-pointer';
    option.textContent = '使用授权码登录';
    option.title = '浏览器授权后无法返回时使用。请在显示授权码的页面完成登录。';
    option.addEventListener('click', () => {
      const start = personalButton();
      if (!start || start.disabled || pendingTimer !== null) return;
      pendingTimer = win.setTimeout(disarm, 300000);
      start.click();
      refresh();
    });
    original.after(option);
  }

  function observe() {
    panel = doc.querySelector(panelSelector);
    refresh();
    const observer = new win.MutationObserver(changes => {
      if (panel?.isConnected) {
        if (changes.some(change => panel.contains(change.target))) refresh();
        return;
      }
      panel = null;
      for (const change of changes) {
        for (const node of change.addedNodes) {
          if (node.nodeType !== 1 || !node.isConnected) continue;
          panel = node.matches(panelSelector) ? node : node.querySelector(panelSelector);
          if (panel) { refresh(); return; }
        }
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    doc.addEventListener('click', event => {
      // Cancel the requested switch if the user backs out or independently starts another attempt.
      if (pendingTimer !== null && event.isTrusted && event.target.closest?.('button')) disarm();
    }, true);
    win.addEventListener('pagehide', () => { disarm(); observer.disconnect(); }, { once: true });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
}

module.exports = { installCodeLogin };
