import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';
import engine from '../payload/dist/asar-engine.js';
import codeLogin from '../client/code-login.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const stage = path.join(root, '.stage');
const base = path.join(stage, 'windows-x64', '2.35.2', 'resources');
const destination = path.join(stage, 'Hakimi-win32-x64-0.1.1');
const asarDigest = 'e057115571cf5085406d20f2427a5afac272b712ec84332c7157da0113d4b2d0';
const backendDigest = 'fcdf7454007c6edc8162e601628c28cc1e6f575be849f329bb864c41ba6e6b02';

async function verifyFile(file, expected) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  if (!expected || hash.digest('hex') !== expected) {
    throw new Error('Source hash mismatch: ' + file);
  }
}

async function prepareApp(job) {
  const dir = path.join(job, 'app');
  const archive = path.join(job, 'base.asar');
  fs.copyFileSync(path.join(base, 'app.asar'), archive);
  await verifyFile(archive, asarDigest);
  // Trust only entries named by the verified archive, including its unpacked files.
  const { header } = engine.readAsarHeader(archive);
  async function copyEntries(entries, prefix) {
    for (const [name, entry] of Object.entries(entries)) {
      const rel = path.posix.join(prefix, name);
      const out = path.join(dir, rel);
      if (entry.files) {
        fs.mkdirSync(out);
        await copyEntries(entry.files, rel);
      } else if (entry.unpacked) {
        fs.copyFileSync(path.join(base, 'app.asar.unpacked', rel), out);
        await verifyFile(out, entry.integrity?.hash);
      } else {
        if (entry.link) throw new Error('Unsupported linked archive entry: ' + rel);
        fs.writeFileSync(out, engine.builtinAsar.extractFile(archive, rel));
      }
    }
  }
  fs.mkdirSync(dir);
  await copyEntries(header.files, '');
  const bin = path.join(job, 'bin');
  fs.mkdirSync(bin);
  const backend = path.join(bin, 'language_server.exe');
  fs.copyFileSync(path.join(base, 'bin', 'language_server.exe'), backend);
  await verifyFile(backend, backendDigest);

  const manifestFile = path.join(dir, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  manifest.name = 'antigravity-hakimi-win';
  manifest.productName = 'Antigravity Hakimi Win';
  manifest.main = 'hakimi-main.cjs';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  // The supplied preload runs sandboxed and cannot require local modules.
  const preloadFile = path.join(dir, 'dist', 'preload.js');
  const preload = fs.readFileSync(preloadFile, 'utf8');
  if (!preload.includes('const isRemoteWindow = process.argv')) throw new Error('Unsupported Hub preload');
  fs.appendFileSync(preloadFile, '\n;if (process.isMainFrame && !isRemoteWindow) (' +
    codeLogin.installCodeLogin.toString() + ')(window);\n');
  const menu = path.join(dir, 'dist', 'menu.js');
  const source = fs.readFileSync(menu, 'utf8');
  const label = "label: 'New Window',";
  const chinese = JSON.parse(fs.readFileSync(path.join(root, 'payload/dist/i18n/zh-CN.json'))).exact['New Window'];
  if (!chinese || source.split(label).length !== 2) throw new Error('Unsupported New Window menu definition');
  const parentMatch = 'item.label === submenuLabel';
  if (source.split(parentMatch).length !== 2) throw new Error('Unsupported native menu structure');
  // On localized Windows installations Electron may translate the parent File menu.
  const localized = source.replace(label, 'label: ' + JSON.stringify(chinese) + ',')
    .replace(parentMatch, "(item.role?.toLowerCase() === 'filemenu' && submenuLabel === 'File') || item.label === submenuLabel");
  fs.writeFileSync(menu, localized);
  fs.copyFileSync(path.join(root, 'client/main.cjs'), path.join(dir, manifest.main));
  fs.copyFileSync(path.join(root, 'test/packaged-login-check.cjs'), path.join(dir, 'hakimi-check-login.cjs'));
  // The portable build has no installer feed of its own.
  fs.renameSync(path.join(dir, 'dist/updater.js'), path.join(dir, 'dist/google-updater.js'));
  fs.copyFileSync(path.join(root, 'client/portable-updater.cjs'), path.join(dir, 'dist/updater.js'));
  return { dir, bin };
}

async function build() {
  if (process.platform !== 'win32' || os.arch() !== 'x64') throw new Error('Windows x64 is required.');
  engine.assertNotOfficialAntigravityApp(stage, 'build');
  if (fs.realpathSync(stage).toLowerCase() !== stage.toLowerCase()) throw new Error('Staging through a junction is not supported.');
  if (fs.existsSync(destination)) throw new Error('Build already exists: ' + destination);
  const job = fs.mkdtempSync(path.join(stage, 'build-'));
  try {
    const { dir, bin } = await prepareApp(job);
    const [built] = await packager({
      dir, out: path.join(job, 'out'), platform: 'win32', arch: 'x64',
      electronVersion: '44.9.1', name: 'Hakimi', executableName: 'Hakimi',
      appVersion: '0.1.1', win32metadata: { CompanyName: 'antigravity-hakimi-win contributors', ProductName: 'Antigravity Hakimi Win' },
      asar: { unpackDir: 'node_modules/chrome-devtools-mcp' }, prune: false, extraResource: [bin],
    });
    await flipFuses(path.join(built, 'Hakimi.exe'), {
      version: FuseVersion.V1,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    });
    const builtAsar = path.join(built, 'resources', 'app.asar');
    const check = engine.readAsarHeader(builtAsar).header;
    const sample = check.files.node_modules.files['chrome-devtools-mcp'].files.LICENSE;
    if (!sample.unpacked || !fs.existsSync(path.join(builtAsar + '.unpacked', 'node_modules/chrome-devtools-mcp/LICENSE'))) {
      throw new Error('The external MCP runtime was not packaged correctly.');
    }
    await verifyFile(path.join(built, 'resources/bin/language_server.exe'), backendDigest);
    fs.renameSync(built, destination);
    console.log(path.join(destination, 'Hakimi.exe'));
  } finally {
    if (path.dirname(fs.realpathSync(job)).toLowerCase() === stage.toLowerCase()) {
      fs.rmSync(job, { recursive: true, force: true });
    }
  }
}
build().catch(error => { console.error(error); process.exitCode = 1; });
