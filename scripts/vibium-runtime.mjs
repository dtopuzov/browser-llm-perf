import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vibiumBinary = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vibium.cmd' : 'vibium');

function commandOutput(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${path.basename(command)} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function numericVersion(value, label) {
  const match = value?.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (!match) throw new Error(`Cannot determine ${label} version from: ${value ?? 'no output'}`);
  return match[1];
}

function parsePaths(output) {
  const chrome = output.match(/^Chrome:\s+(.+)$/m)?.[1];
  const chromedriver = output.match(/^Chromedriver:\s+(.+)$/m)?.[1];
  if (!chrome || chrome === 'not found' || !chromedriver || chromedriver === 'not found') {
    throw new Error(`Vibium browser installation is incomplete:\n${output}`);
  }
  return { chrome, chromedriver };
}

export function installedChromeInfo() {
  const candidates = [
    process.env.CHROME_BIN,
    process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : null,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'linux' ? 'google-chrome' : null,
  ].filter(Boolean);
  for (const executable of candidates) {
    const result = spawnSync(executable, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) {
      const version = result.stdout.trim();
      return { executable, version, numericVersion: numericVersion(version, 'Google Chrome') };
    }
  }
  throw new Error('Google Chrome is required. Set CHROME_BIN if it is not in the standard location.');
}

export async function prepareVibiumSupport() {
  const version = commandOutput(vibiumBinary, ['version']);
  const paths = parsePaths(commandOutput(vibiumBinary, ['paths']));
  const chromeVersion = commandOutput(paths.chrome, ['--version']);
  const chromedriverVersion = commandOutput(paths.chromedriver, ['--version']);
  const sourceVersionDir = path.dirname(paths.chromedriver);
  await fs.access(paths.chrome);
  await fs.access(paths.chromedriver);
  return {
    version,
    chrome: { executable: paths.chrome, version: chromeVersion, numericVersion: numericVersion(chromeVersion, 'Vibium Chrome') },
    chromedriver: { executable: paths.chromedriver, version: numericVersion(chromedriverVersion, 'Vibium ChromeDriver') },
    sourceVersionDir,
    browserSource: 'Vibium-managed Chrome for Testing',
  };
}

export async function prepareVibiumRuntime(tempRoot, support) {
  const socketRoot = process.platform === 'win32' ? tempRoot : '/tmp';
  const cacheDir = await fs.mkdtemp(path.join(socketRoot, 'llm-perf-vibium-'));
  const versionsDir = path.join(cacheDir, 'chrome-for-testing');
  const isolatedVersionDir = path.join(versionsDir, path.basename(support.sourceVersionDir));
  await fs.mkdir(isolatedVersionDir, { recursive: true });
  const chromeRelative = path.relative(support.sourceVersionDir, support.chrome.executable);
  const chromeTopLevel = chromeRelative.split(path.sep)[0];
  const sourceChromeEntry = path.join(support.sourceVersionDir, chromeTopLevel);
  const targetChromeEntry = path.join(isolatedVersionDir, chromeTopLevel);
  await fs.symlink(sourceChromeEntry, targetChromeEntry, chromeRelative.includes(path.sep) ? 'dir' : 'file');
  const driverName = path.basename(support.chromedriver.executable);
  await fs.symlink(support.chromedriver.executable, path.join(isolatedVersionDir, driverName), 'file');
  return {
    cacheDir,
    env: {
      VIBIUM_CACHE_DIR: cacheDir,
      VIBIUM_SKIP_BROWSER_DOWNLOAD: '1',
    },
    metadata: {
      browserSource: support.browserSource,
      chromeExecutable: support.chrome.executable,
      chromeVersion: support.chrome.version,
      chromedriverVersion: support.chromedriver.version,
    },
  };
}
