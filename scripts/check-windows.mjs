import { execFile } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { getCurrentFuseWire, FuseState, FuseV1Options } from '@electron/fuses';

const stage = fileURLToPath(new URL('../.stage', import.meta.url));
const exe = path.join(stage, 'Hakimi-win32-x64', 'Hakimi.exe');
const wire = await getCurrentFuseWire(exe);
assert.equal(wire[FuseV1Options.OnlyLoadAppFromAsar], FuseState.ENABLE);
assert.equal(wire[FuseV1Options.EnableEmbeddedAsarIntegrityValidation], FuseState.ENABLE);
const temp = fs.mkdtempSync(path.join(stage, 'check-'));
const profile = path.join(temp, 'profile');
const roaming = path.join(temp, 'roaming');
const local = path.join(temp, 'local');
for (const dir of [profile, roaming, local]) fs.mkdirSync(dir);
try {
  const env = { ...process.env, USERPROFILE: temp, APPDATA: roaming, LOCALAPPDATA: local };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  const child = execFile(exe, ['--hakimi-check-menu', '--disable-gpu', '--user-data-dir=' + profile], {
    windowsHide: true, timeout: 25000, encoding: 'utf8',
    env,
  });
  os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8').on('data', part => stdout += part);
  child.stderr.setEncoding('utf8').on('data', part => stderr += part);
  const [code, signal] = await once(child, 'close');
  assert.equal(code, 0, 'Client exited: ' + (signal || code) + '\n' + stderr + '\n' + stdout);
  const result = stdout.trim().split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line)).at(-1);
  assert.equal(result?.menu, '新建窗口', 'Expected a native menu report. ' + stderr + stdout);
  assert.equal(path.resolve(result.profile).toLowerCase(), profile.toLowerCase());
  console.log(result.name + ' | ' + result.menu + ' | ' + result.accelerator + ' | visible windows: ' + result.visibleWindows);
} finally {
  if (path.dirname(fs.realpathSync(temp)).toLowerCase() === fs.realpathSync(stage).toLowerCase()) {
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
  }
}
