'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { assertNotOfficialAntigravityApp, builtinAsar, computeAsarHeaderSha256 } = require('../payload/dist/asar-engine');

function assertX64Executable(filename) {
  const fd = fs.openSync(filename, 'r');
  try {
    const dos = Buffer.alloc(64);
    const pe = Buffer.alloc(26);
    if (fs.readSync(fd, dos, 0, dos.length, 0) !== dos.length || dos.readUInt16LE(0) !== 0x5a4d ||
        fs.readSync(fd, pe, 0, pe.length, dos.readUInt32LE(60)) !== pe.length ||
        pe.readUInt32LE(0) !== 0x4550 || pe.readUInt16LE(4) !== 0x8664 || pe.readUInt16LE(24) !== 0x20b) {
      throw new Error('Expected an x64 PE32+ executable.');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function inspectBase(root) {
  assertX64Executable(path.join(root, 'Antigravity.exe'));
  const asar = path.join(root, 'resources', 'app.asar');
  const manifest = JSON.parse(builtinAsar.extractFile(asar, 'package.json').toString('utf8'));
  const entries = new Set(builtinAsar.listPackage(asar));
  if (!manifest.main || !entries.has('/' + path.posix.normalize(manifest.main).replace(/^\.\//, ''))) {
    throw new Error('The main entry declared by the app is missing.');
  }
  return {
    architecture: 'x64', appVersion: manifest.version, main: manifest.main,
    asarHeaderSha256: computeAsarHeaderSha256(asar),
    chromiumChineseLocale: fs.existsSync(path.join(root, 'locales', 'zh-CN.pak')),
    uiStarted: false
  };
}

if (require.main === module) {
  const [action, root] = process.argv.slice(2);
  if (!root) throw new Error('Expected --guard <stage> or --inspect <base>.');
  if (action === '--guard') assertNotOfficialAntigravityApp(root, 'stage');
  else if (action === '--inspect') console.log(JSON.stringify(inspectBase(root)));
  else throw new Error('Unknown action: ' + action);
}

module.exports = { assertX64Executable, inspectBase };
