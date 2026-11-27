'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { assertX64Executable } = require('../scripts/windows-base');
const { isOfficialAntigravityPath } = require('../payload/dist/asar-engine');

test('Windows staging accepts AMD64 PE32+ and rejects ARM64, x86 and truncated files', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hakimi-pe-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'sample.exe');
  const data = Buffer.alloc(160);
  data.write('MZ');
  data.writeUInt32LE(96, 60);
  data.write('PE\0\0', 96);
  data.writeUInt16LE(0x20b, 120);
  for (const machine of [0x8664, 0xaa64, 0x14c]) {
    data.writeUInt16LE(machine, 100);
    fs.writeFileSync(file, data);
    if (machine === 0x8664) assert.doesNotThrow(() => assertX64Executable(file));
    else assert.throws(() => assertX64Executable(file), /x64/);
  }
  fs.writeFileSync(file, data.subarray(0, 66));
  assert.throws(() => assertX64Executable(file), /x64/);
});

test('standard Windows installations and sibling staging paths are distinguished', {
  skip: process.platform !== 'win32',
}, () => {
  for (const parent of [process.env.ProgramFiles, path.join(process.env.LOCALAPPDATA, 'Programs')]) {
    assert.equal(isOfficialAntigravityPath(path.join(parent, 'Antigravity')), true);
    assert.equal(isOfficialAntigravityPath(path.join(parent, 'ANTIGRAVITY', 'resources', 'app.asar')), true);
    assert.equal(isOfficialAntigravityPath(path.join(parent, 'Antigravity-Hakimi', 'resources', 'app.asar')), false);
  }
});
