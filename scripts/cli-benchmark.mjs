import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { installedChromeInfo, prepareVibiumRuntime, prepareVibiumSupport } from './vibium-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'node_modules', '.bin');
const drivers = ['playwright', 'craftdriver', 'vibium'];

function parseArgs(argv) {
  const options = { drivers: [...drivers], runs: 10, seed: 42, batchId: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      return value;
    };
    if (arg === '--runs') options.runs = Number(next());
    else if (arg === '--driver') {
      const selected = next();
      options.drivers = selected === 'all' ? [...drivers] : selected.split(',');
    }
    else if (arg === '--seed') options.seed = Number(next());
    else if (arg === '--batch-id') options.batchId = next();
    else if (arg === '--help') {
      console.log('Usage: npm run bench:cli -- [--driver all|playwright|craftdriver|vibium] [--runs 10] [--seed 42] [--batch-id ID]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  for (const driver of options.drivers) {
    if (!drivers.includes(driver)) throw new Error(`Unknown driver: ${driver}`);
  }
  options.drivers = [...new Set(options.drivers)];
  if (options.batchId && !/^[a-zA-Z0-9._-]+$/.test(options.batchId)) throw new Error('Unsafe batch id');
  return options;
}

function output(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function startServer() {
  const fixtureRoot = path.join(root, 'fixtures', 'search');
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = path.resolve(fixtureRoot, relative);
      if (file !== fixtureRoot && !file.startsWith(`${fixtureRoot}${path.sep}`)) throw new Error('invalid path');
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

function run(command, args, timeoutMs = 90000, extraEnv = {}) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...extraEnv, CI: '1', NO_COLOR: '1', HEADLESS: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      const force = setTimeout(() => child.kill('SIGKILL'), 5000);
      force.unref();
    }, timeoutMs);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code, signal, timedOut, stdout, stderr,
        wallTimeMs: Math.round(performance.now() - started),
        stdoutBytes: Buffer.byteLength(stdout),
        stderrBytes: Buffer.byteLength(stderr),
      });
    });
  });
}

function refFromSnapshot(driver, stdout, role, name) {
  if (driver === 'playwright') {
    const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return stdout.match(new RegExp(`${escapedRole} "${escapedName}"[^\\n]*\\[ref=(e\\d+)\\]`))?.[1] ?? null;
  }
  if (driver === 'vibium') {
    for (const line of stdout.trim().split(/\r?\n/).reverse()) {
      try {
        const mapped = JSON.parse(line)?.result;
        if (typeof mapped !== 'string') continue;
        const elementPattern = role === 'searchbox'
          ? /(@e\d+) \[input type="search"\]/
          : new RegExp(`(@e\\d+) \\[${role === 'link' ? 'a' : 'button'}[^\\]]*\\] "${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
        return mapped.match(elementPattern)?.[1] ?? null;
      } catch {
        // Keep scanning JSONL.
      }
    }
    return null;
  }
  for (const line of stdout.trim().split(/\r?\n/).reverse()) {
    try {
      const payload = JSON.parse(line);
      const snapshotLines = payload?.result?.lines ?? [];
      const match = snapshotLines.find(value => value.includes(`: ${role} "${name}`))?.match(/^(e\d+):/);
      if (match) return match[1];
    } catch {
      // Keep scanning JSONL.
    }
  }
  return null;
}

function vibiumResult(stdout) {
  for (const line of stdout.trim().split(/\r?\n/).reverse()) {
    try {
      const payload = JSON.parse(line);
      if (payload?.ok && typeof payload.result === 'string') return payload.result.trim();
    } catch {
      // Keep scanning JSONL.
    }
  }
  return null;
}

function finalResult(driver, stdout) {
  if (driver === 'playwright') {
    return {
      title: stdout.match(/heading "([^"]+)" \[level=1\]/)?.[1] ?? null,
      url: stdout.match(/Page URL: (\S+)/)?.[1] ?? null,
    };
  }
  for (const line of stdout.trim().split(/\r?\n/).reverse()) {
    try {
      const payload = JSON.parse(line);
      const heading = payload?.result?.lines?.find(value => value.includes(': heading "'))?.match(/: heading "([^"]+)"/)?.[1];
      if (heading) return { title: heading, url: payload.result.url ?? null };
    } catch {
      // Keep scanning JSONL.
    }
  }
  return { title: null, url: null };
}

async function cleanup(driver, env = {}) {
  if (driver === 'playwright') {
    await run(path.join(binDir, 'playwright'), ['cli', 'close-all'], 30000, env);
    await run(path.join(binDir, 'playwright'), ['cli', 'kill-all'], 30000, env);
  } else if (driver === 'craftdriver') {
    await run(path.join(binDir, 'craftdriver'), ['daemon', 'stop'], 30000, env);
  } else {
    await run(path.join(binDir, 'vibium'), ['daemon', 'stop'], 30000, env);
  }
}

async function measuredCommand(rows, driver, phase, command, args, env) {
  const result = await run(command, args, 90000, env);
  rows.push({ phase, command: [command, ...args], ...result });
  if (result.code !== 0) throw new Error(`${driver} ${phase} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

async function trial(driver, trialIndex, url, screenshotArtifact, vibiumSupport) {
  const session = `cli-${process.pid}-${trialIndex}-${driver}`;
  const command = path.join(binDir, driver === 'playwright' ? 'playwright' : driver);
  const temporary = driver === 'vibium' ? await fs.mkdtemp(path.join(os.tmpdir(), 'llm-perf-vibium-cli-')) : null;
  const vibiumRuntime = driver === 'vibium' ? await prepareVibiumRuntime(temporary, vibiumSupport) : null;
  const env = vibiumRuntime?.env ?? {};
  const args = driver === 'playwright'
    ? action => ['cli', `-s=${session}`, ...action]
    : driver === 'craftdriver'
      ? action => [...action, '--session', session, '--json']
      : action => [...action, '--json'];
  const target = ref => driver === 'craftdriver' ? `ref=${ref}` : ref;
  const snapshotAction = driver === 'vibium' ? ['map'] : ['snapshot'];
  const rows = [];
  const started = performance.now();
  let answer = { title: null, url: null };
  let error = null;
  let browserOpened = false;
  let screenshot = { path: screenshotArtifact.relativePath, captured: false, error: 'browser was not opened' };
  let screenshotTimeMs = 0;
  await cleanup(driver, env);
  try {
    const openAction = driver === 'playwright'
      ? ['open', url]
      : driver === 'craftdriver'
        ? ['go', url, '--browser', 'chrome', '--headless']
        : ['go', url, '--headless'];
    await measuredCommand(rows, driver, 'open', command, args(openAction), env);
    browserOpened = true;
    const initial = await measuredCommand(rows, driver, 'snapshot-initial', command, args(snapshotAction), env);
    const searchbox = refFromSnapshot(driver, initial, 'searchbox', 'Search the knowledge base');
    const search = refFromSnapshot(driver, initial, 'button', 'Search');
    if (!searchbox || !search) throw new Error(`Could not resolve initial refs (${searchbox}, ${search})`);
    await measuredCommand(rows, driver, 'fill', command, args(['fill', target(searchbox), 'Telerik']), env);
    await measuredCommand(rows, driver, 'submit', command, args(['click', target(search)]), env);
    const results = await measuredCommand(rows, driver, 'snapshot-results', command, args(snapshotAction), env);
    const firstResult = refFromSnapshot(driver, results, 'link', 'Telerik');
    if (!firstResult) throw new Error('Could not resolve the first result ref');
    await measuredCommand(rows, driver, 'open-result', command, args(['click', target(firstResult)]), env);
    if (driver === 'vibium') {
      const title = await measuredCommand(rows, driver, 'read-title', command, args(['text', 'h1']), env);
      const currentUrl = await measuredCommand(rows, driver, 'read-url', command, args(['url']), env);
      answer = { title: vibiumResult(title), url: vibiumResult(currentUrl) };
    } else {
      const final = await measuredCommand(rows, driver, 'snapshot-final', command, args(snapshotAction), env);
      answer = finalResult(driver, final);
    }
  } catch (caught) {
    error = caught.message;
  } finally {
    if (browserOpened) {
      const screenshotStarted = performance.now();
      const vibiumOutput = driver === 'vibium'
        ? path.join(os.homedir(), 'Pictures', 'Vibium', path.basename(screenshotArtifact.file))
        : null;
      const screenshotArgs = driver === 'playwright'
        ? args(['screenshot', `--filename=${screenshotArtifact.file}`])
        : args(['screenshot', '-o', driver === 'vibium' ? path.basename(screenshotArtifact.file) : screenshotArtifact.file]);
      const captured = await run(command, screenshotArgs, 30000, env);
      let preserveError = null;
      if (driver === 'vibium' && captured.code === 0 && !captured.timedOut) {
        try {
          await fs.copyFile(vibiumOutput, screenshotArtifact.file);
          await fs.rm(vibiumOutput, { force: true });
        } catch (caught) {
          preserveError = caught.message;
        }
      }
      screenshotTimeMs = Math.round(performance.now() - screenshotStarted);
      screenshot = {
        path: screenshotArtifact.relativePath,
        captured: captured.code === 0 && !captured.timedOut && !preserveError,
        exitCode: captured.code,
        timedOut: captured.timedOut,
        wallTimeMs: captured.wallTimeMs,
        stdout: captured.stdout,
        stderr: captured.stderr,
        ...(captured.code === 0 && !captured.timedOut && !preserveError
          ? {}
          : { error: preserveError || captured.stderr || captured.stdout || 'screenshot command failed' }),
      };
    }
    if (driver === 'playwright') await run(command, args(['close']), 30000, env);
    else if (driver === 'craftdriver') await run(command, args(['session', 'close', session]), 30000, env);
    else await run(command, args(['stop']), 30000, env);
    await cleanup(driver, env);
    if (vibiumRuntime) await fs.rm(vibiumRuntime.cacheDir, { recursive: true, force: true });
    if (temporary) await fs.rm(temporary, { recursive: true, force: true });
  }
  const passed = answer.title === 'Telerik' && new URL(answer.url, url).pathname === '/articles/telerik.html';
  return {
    trialIndex,
    driver,
    passed,
    error,
    answer,
    browserRuntime: vibiumRuntime?.metadata ?? { browserSource: 'installed Google Chrome' },
    wallTimeMs: Math.round(performance.now() - started) - screenshotTimeMs,
    measuredCommandTimeMs: rows.reduce((sum, row) => sum + row.wallTimeMs, 0),
    screenshot,
    stdoutBytes: rows.reduce((sum, row) => sum + row.stdoutBytes, 0),
    stderrBytes: rows.reduce((sum, row) => sum + row.stderrBytes, 0),
    commands: rows,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregate(rows) {
  const grouped = {};
  for (const row of rows) (grouped[row.driver] ??= []).push(row);
  return Object.fromEntries(Object.entries(grouped).map(([driver, values]) => [driver, {
    runs: values.length,
    passed: values.filter(value => value.passed).length,
    wallTimeMedianMs: median(values.map(value => value.wallTimeMs)),
    commandTimeMedianMs: median(values.map(value => value.measuredCommandTimeMs)),
    stdoutMedianBytes: median(values.map(value => value.stdoutBytes)),
    stderrMedianBytes: median(values.map(value => value.stderrBytes)),
  }]));
}

function rotatedDriverOrder(selectedDrivers, trial, seed) {
  const offset = ((trial - 1 + seed) % selectedDrivers.length + selectedDrivers.length) % selectedDrivers.length;
  return [...selectedDrivers.slice(offset), ...selectedDrivers.slice(0, offset)];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const server = await startServer();
  const systemChrome = installedChromeInfo();
  const vibiumSupport = await prepareVibiumSupport();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const batchId = options.batchId ?? `cli-local-search-${timestamp}`;
  const batchDir = path.join(root, 'results', batchId);
  await fs.mkdir(path.join(batchDir, 'runs'), { recursive: true });
  await fs.mkdir(path.join(batchDir, 'preflight'), { recursive: true });
  const manifest = {
    type: 'direct-cli',
    batchId,
    createdAt: new Date().toISOString(),
    options,
    task: 'local-search-telerik',
    browser: systemChrome.version,
    browsers: {
      playwright: { source: 'installed Google Chrome', version: systemChrome.version, executable: systemChrome.executable },
      craftdriver: { source: 'installed Google Chrome', version: systemChrome.version, executable: systemChrome.executable },
      vibium: { source: vibiumSupport.browserSource, version: vibiumSupport.chrome.version, executable: vibiumSupport.chrome.executable },
    },
    versions: {
      playwright: output(path.join(binDir, 'playwright'), ['--version']),
      craftdriver: output(path.join(binDir, 'craftdriver'), ['--version']),
      vibium: output(path.join(binDir, 'vibium'), ['version']),
    },
    preflight: {},
    runs: [],
  };
  try {
    for (const driver of options.drivers) {
      console.log(`[preflight] ${driver}`);
      const warmup = await trial(driver, 0, server.url, {
        file: path.join(batchDir, 'preflight', `${driver}-final-screenshot.png`),
        relativePath: path.join('preflight', `${driver}-final-screenshot.png`),
      }, vibiumSupport);
      manifest.preflight[driver] = warmup;
      if (!warmup.passed) throw new Error(`${driver} preflight failed: ${warmup.error ?? JSON.stringify(warmup.answer)}`);
    }
    await fs.writeFile(path.join(batchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    for (let index = 1; index <= options.runs; index += 1) {
      const order = rotatedDriverOrder(options.drivers, index, options.seed);
      for (const driver of order) {
        console.log(`[${index}/${options.runs}] ${driver}`);
        const filename = `${String(index).padStart(3, '0')}-${driver}-final-screenshot.png`;
        const result = await trial(driver, index, server.url, {
          file: path.join(batchDir, 'runs', filename),
          relativePath: path.join('runs', filename),
        }, vibiumSupport);
        manifest.runs.push(result);
        const runFile = path.join(batchDir, 'runs', `${String(index).padStart(3, '0')}-${driver}.json`);
        await fs.writeFile(runFile, `${JSON.stringify(result, null, 2)}\n`);
        await fs.writeFile(path.join(batchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
        console.log(`${result.passed ? 'PASS' : 'FAIL'} ${(result.wallTimeMs / 1000).toFixed(2)}s ${result.stdoutBytes} stdout bytes`);
      }
    }
  } finally {
    await server.close();
    for (const driver of options.drivers) await cleanup(driver);
  }
  const summary = aggregate(manifest.runs);
  await fs.writeFile(path.join(batchDir, 'aggregate.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const lines = [
    `# Direct CLI report: ${batchId}`,
    '',
    `Installed Chrome (Playwright/CraftDriver): ${manifest.browser ?? 'unknown'}`,
    `Vibium-managed Chrome: ${manifest.browsers.vibium.version ?? 'unknown'}`,
    '',
    '| Driver | Correct | Wall median | Measured commands | stdout median | stderr median |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...Object.entries(summary).map(([driver, value]) => `| ${driver} | ${value.passed}/${value.runs} | ${(value.wallTimeMedianMs / 1000).toFixed(2)}s | ${(value.commandTimeMedianMs / 1000).toFixed(2)}s | ${value.stdoutMedianBytes} B | ${value.stderrMedianBytes} B |`),
    '',
    'This measures the same scripted UI flow with fresh browser sessions. Vibium uses its officially managed Chrome for Testing; its recorded browser version may differ from installed Chrome. It does not invoke an LLM and therefore has no token metric.',
    '',
  ];
  await fs.writeFile(path.join(batchDir, 'report.md'), lines.join('\n'));
  console.log(`\n${lines.join('\n')}`);
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
