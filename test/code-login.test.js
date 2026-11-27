'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { installCodeLogin } = require('../client/code-login.cjs');

const option = '[data-hakimi-code-login]';
const nextRender = () => new Promise(resolve => setImmediate(resolve));

function startPage(t, url = 'https://127.0.0.1:34567/') {
  const dom = new JSDOM('<main></main>', { url });
  t.after(() => dom.window.close());
  const doc = dom.window.document;
  installCodeLogin(dom.window);
  return doc;
}

function renderPersonal(doc) {
  doc.querySelector('main').innerHTML = '<div class="entrance-auth-panel"><button title="Continue with Google">Continue with Google <span>Last Used</span></button></div>';
  return doc.querySelector('[title="Continue with Google"]');
}

function renderWaiting(doc, switchMode) {
  doc.querySelector('main').innerHTML = '<div class="entrance-auth-panel"><button disabled>Continue with Google</button><button data-testid="onboarding-switch-to-auth-code">Trouble signing in? Enter authorization code</button></div>';
  doc.querySelector('[data-testid="onboarding-switch-to-auth-code"]').onclick = switchMode;
}

test('explicit manual login survives the onboarding re-render and requests the native code flow just once', async t => {
  const doc = startPage(t);
  let starts = 0, switches = 0;
  const google = renderPersonal(doc);
  google.onclick = () => { starts++; google.disabled = true; };
  await nextRender();
  assert.equal(starts, 0);
  doc.querySelector(option).click();
  await nextRender();
  renderWaiting(doc, () => {
    switches++;
    const panel = doc.querySelector('.entrance-auth-panel');
    panel.innerHTML = '<div data-testid="onboarding-auth-code-panel"><input></div>';
  });
  await nextRender();
  assert.deepEqual([starts, switches], [1, 1]);
  assert.ok(doc.querySelector('[data-testid="onboarding-auth-code-panel"] input'));
  renderWaiting(doc, () => switches++);
  await nextRender();
  assert.equal(switches, 1);
});

test('ordinary sign-in leaves the upstream loopback choice alone', async t => {
  const doc = startPage(t);
  let switches = 0;
  const google = renderPersonal(doc);
  await nextRender();
  google.onclick = () => renderWaiting(doc, () => switches++);
  google.click();
  await nextRender();
  assert.equal(switches, 0);
  assert.match(doc.querySelector('[data-hakimi-callback-hint]').textContent, /授权码/);
  assert.equal(doc.querySelector(option), null);
});

test('only personal login on the local HTTPS Hub gets the option', async t => {
  for (const url of ['https://example.org/', 'http://127.0.0.1:12345/', 'https://127.0.0.1/']) {
    const foreign = startPage(t, url);
    renderPersonal(foreign);
    await nextRender();
    assert.equal(foreign.querySelector(option), null);
  }
  const local = startPage(t);
  local.querySelector('main').innerHTML = '<div class="entrance-auth-panel"><button>Continue with Google Cloud</button></div><button>Continue with Google</button>';
  await nextRender();
  assert.equal(local.querySelector(option), null);
});
