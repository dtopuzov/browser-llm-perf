import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { installedChromeInfo, prepareVibiumRuntime, prepareVibiumSupport } from './vibium-runtime.mjs';
import { classifyCommandCompletion, shellExitCodeFromEvent } from './command-metrics.mjs';
import { recordCraftDriverChromeProvenance } from './chrome-driver-provenance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharedCraftDriverCache = process.env.CRAFTDRIVER_CACHE_DIR
  ?? path.join(os.homedir(), '.cache', 'craftdriver');
const driverDefinitions = {
  playwright: {
    label: 'Playwright',
    skill: 'playwright-cli',
    template: path.join(root, 'drivers', 'playwright'),
    commandPattern: /\bnpx\s+(?:--no-install\s+)?playwright\s+cli\b|node_modules\/\.bin\/playwright\s+cli\b/gi,
  },
  craftdriver: {
    label: 'CraftDriver',
    skill: 'craftdriver',
    template: path.join(root, 'drivers', 'craftdriver'),
    commandPattern: /\bnpx\s+(?:--no-install\s+)?craftdriver\b|node_modules\/\.bin\/craftdriver\b/gi,
  },
  vibium: {
    label: 'Vibium',
    skill: 'vibe-check',
    template: path.join(root, 'drivers', 'vibium'),
    commandPattern: /\bnpx\s+(?:--no-install\s+)?vibium\b|node_modules\/\.bin\/vibium\b/gi,
  },
};
const agentDefinitions = {
  codex: { label: 'Codex CLI', binary: process.env.CODEX_BIN ?? 'codex' },
  claude: { label: 'Claude Code CLI', binary: process.env.CLAUDE_BIN ?? 'claude' },
  copilot: { label: 'GitHub Copilot CLI', binary: process.env.COPILOT_BIN ?? 'copilot' },
};

function parseArgs(argv) {
  const options = {
    agent: process.env.LLM_BENCH_AGENT ?? 'codex',
    drivers: ['playwright', 'craftdriver', 'vibium'],
    task: 'local-search-telerik',
    runs: 3,
    model: process.env.LLM_BENCH_MODEL ?? process.env.CODEX_BENCH_MODEL,
    reasoning: process.env.CODEX_BENCH_REASONING ?? 'medium',
    seed: 42,
    timeoutMs: 10 * 60 * 1000,
    batchId: undefined,
    yolo: true,
    headed: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${arg} requires a value`);
      index += 1;
      return next;
    };
    if (arg === '--agent') options.agent = value();
    else if (arg === '--driver') {
      const selected = value();
      options.drivers = selected === 'all' ? ['playwright', 'craftdriver', 'vibium'] : selected.split(',');
    } else if (arg === '--task') options.task = value();
    else if (arg === '--runs') options.runs = Number(value());
    else if (arg === '--model') options.model = value();
    else if (arg === '--reasoning') options.reasoning = value();
    else if (arg === '--seed') options.seed = Number(value());
    else if (arg === '--timeout-ms') options.timeoutMs = Number(value());
    else if (arg === '--batch-id') options.batchId = value();
    else if (arg === '--safe') options.yolo = false;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--headless') options.headed = false;
    else if (arg === '--help') {
      console.log(`Usage: npm run bench -- --model MODEL [options]

Options:
  --agent codex|claude|copilot      Agent CLI to run (default: codex)
  --driver all|playwright|craftdriver|vibium  Drivers to run (default: all)
  --task ID                           Task id (default: local-search-telerik)
  --runs N                            Trials per driver (default: 3)
  --model MODEL                       Required agent model; or LLM_BENCH_MODEL
  --reasoning LEVEL                   minimal|low|medium|high|xhigh (default: medium)
  --seed N                            Controls which driver runs first (default: 42)
  --timeout-ms N                      Timeout per trial (default: 600000)
  --batch-id ID                       Optional result directory name
  --headed                             Show the browser window (default: headless)
  --safe                              Disable the default agent YOLO mode`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.model) {
    throw new Error('Pin the model with --model or LLM_BENCH_MODEL; an implicit default would make comparisons untrustworthy.');
  }
  if (!agentDefinitions[options.agent]) throw new Error(`Unknown agent: ${options.agent}`);
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) throw new Error('--timeout-ms must be at least 1000');
  if (!['minimal', 'low', 'medium', 'high', 'xhigh'].includes(options.reasoning)) throw new Error('Unsupported reasoning level');
  for (const driver of options.drivers) {
    if (!driverDefinitions[driver]) throw new Error(`Unknown driver: ${driver}`);
  }
  options.drivers = [...new Set(options.drivers)];
  return options;
}

function safeId(value) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error(`Unsafe id: ${value}`);
  return value;
}

function rotatedDriverOrder(drivers, trial, seed) {
  if (drivers.length < 2) return [...drivers];
  const offset = ((trial - 1 + seed) % drivers.length + drivers.length) % drivers.length;
  return [...drivers.slice(offset), ...drivers.slice(0, offset)];
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function commandOutput(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function packageVersion(name) {
  const packagePath = path.join(root, 'node_modules', name, 'package.json');
  const result = spawnSync(process.execPath, ['-e', `process.stdout.write(require(${JSON.stringify(packagePath)}).version)`], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`Cannot read installed version for ${name}: ${result.stderr}`);
  return result.stdout.trim();
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

async function startFixtureServer(fixture) {
  if (!fixture) return null;
  const fixtureRoot = path.resolve(root, 'fixtures', safeId(fixture));
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const file = path.resolve(fixtureRoot, relative);
      if (file !== fixtureRoot && !file.startsWith(`${fixtureRoot}${path.sep}`)) throw new Error('invalid path');
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}

async function runProcess(command, args, { cwd, env, timeoutMs = 30000 }) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let spawnError = null;
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { spawnError = error; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      const forceTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      forceTimer.unref();
    }, timeoutMs);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, spawnError, stdout, stderr, wallTimeMs: Math.round(performance.now() - started) });
    });
  });
}

async function prepareWorkspace(driver, tempRoot, { headed = false } = {}) {
  const workspace = path.join(tempRoot, 'workspace');
  await fs.cp(driverDefinitions[driver].template, workspace, { recursive: true });
  if (headed) {
    const instructionsPath = path.join(workspace, 'AGENTS.md');
    let instructions = await fs.readFile(instructionsPath, 'utf8');
    if (driver === 'playwright') {
      instructions = instructions.replace(
        '- Use only the configured Google Chrome channel.',
        '- Use only the configured Google Chrome channel. Launch the first `open` command with `--headed`.',
      );
    } else if (driver === 'craftdriver') {
      instructions = instructions.replaceAll('--browser chrome --headless', '--browser chrome --headed');
    } else {
      instructions = instructions.replace(
        '- The first browser command must include `--headless`; later commands must reuse that single daemon-backed browser session.',
        '- Vibium is headed by default. The first browser command must omit `--headless`; later commands must reuse that single daemon-backed browser session.',
      );
    }
    await fs.writeFile(instructionsPath, instructions);
  }
  await fs.symlink(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  const gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1' };
  const commands = [
    ['git', ['init', '-q', '-b', 'main']],
    ['git', ['add', '.']],
    ['git', ['-c', 'user.name=llm-perf', '-c', 'user.email=llm-perf@example.invalid', 'commit', '-qm', 'benchmark fixture']],
  ];
  for (const [command, args] of commands) {
    const result = await runProcess(command, args, { cwd: workspace, env: gitEnv });
    if (result.code !== 0) throw new Error(`Failed to prepare trial git repository: ${result.stderr}`);
  }
  return workspace;
}

async function prepareCodexHome(codexHome) {
  await fs.mkdir(codexHome, { recursive: true, mode: 0o700 });
  const sourceHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
  const authPath = path.join(sourceHome, 'auth.json');
  try {
    await fs.access(authPath);
    await fs.symlink(authPath, path.join(codexHome, 'auth.json'));
  } catch {
    if (!process.env.CODEX_API_KEY && !process.env.CODEX_ACCESS_TOKEN) {
      throw new Error(`No Codex auth found at ${authPath}; run codex login or provide a per-command credential.`);
    }
  }
  return codexHome;
}

function claudeOAuthToken() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { token: process.env.CLAUDE_CODE_OAUTH_TOKEN, source: 'environment' };
  }
  if (process.platform !== 'darwin') return null;
  const result = spawnSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  try {
    const credential = JSON.parse(result.stdout);
    const token = credential.claudeAiOauth?.accessToken;
    return token ? { token, source: 'macOS keychain' } : null;
  } catch {
    return null;
  }
}

function renderPrompt(task, driver, baseUrl, { headed = false } = {}) {
  const definition = driverDefinitions[driver];
  return task.promptTemplate
    .replaceAll('{{DRIVER_SKILL}}', definition.skill)
    .replaceAll('{{DRIVER_LABEL}}', definition.label)
    .replaceAll('{{BASE_URL}}', baseUrl ?? '')
    .replaceAll('{{BROWSER_MODE}}', headed ? 'headed' : 'headless');
}

async function runCodex({ command = process.env.CODEX_BIN ?? 'codex', args, cwd, env, timeoutMs, liveLogs }) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let lineBuffer = '';
    let timedOut = false;
    let spawnError = null;
    const events = [];
    const stdoutLog = liveLogs?.stdout ? createWriteStream(liveLogs.stdout) : null;
    const stderrLog = liveLogs?.stderr ? createWriteStream(liveLogs.stderr) : null;
    const timedLog = liveLogs?.timed ? createWriteStream(liveLogs.timed) : null;

    function acceptLine(line) {
      if (!line.trim()) return;
      try {
        const row = { elapsedMs: Math.round(performance.now() - started), event: JSON.parse(line) };
        events.push(row);
        timedLog?.write(`${JSON.stringify(row)}\n`);
      } catch (error) {
        const row = { elapsedMs: Math.round(performance.now() - started), parseError: error.message, line };
        events.push(row);
        timedLog?.write(`${JSON.stringify(row)}\n`);
      }
    }

    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      stdoutLog?.write(chunk);
      lineBuffer += text;
      for (;;) {
        const newline = lineBuffer.indexOf('\n');
        if (newline < 0) break;
        acceptLine(lineBuffer.slice(0, newline));
        lineBuffer = lineBuffer.slice(newline + 1);
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk; stderrLog?.write(chunk); });
    child.once('error', error => { spawnError = error; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      const forceTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
      forceTimer.unref();
    }, timeoutMs);
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      acceptLine(lineBuffer);
      for (const stream of [stdoutLog, stderrLog, timedLog]) stream?.end();
      const streams = [stdoutLog, stderrLog, timedLog].filter(Boolean);
      Promise.all(streams.map(stream => new Promise(done => stream.once('finish', done)))).then(() => {
        resolve({
          code,
          signal,
          timedOut,
          spawnError,
          stdout,
          stderr,
          events,
          wallTimeMs: Math.round(performance.now() - started),
        });
      });
    });
  });
}

function commandText(item) {
  if (typeof item?.command === 'string') return item.command;
  if (Array.isArray(item?.command)) return item.command.join(' ');
  return '';
}

function commandOutputText(item) {
  for (const key of ['aggregated_output', 'output', 'text']) {
    if (typeof item?.[key] === 'string') return item[key];
  }
  return '';
}

function copilotCommand(event) {
  let args = event?.data?.arguments ?? event?.arguments;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { /* Some tools use a plain command string. */ }
  }
  if (typeof args === 'string') return args;
  return args?.command ?? args?.cmd ?? event?.data?.command ?? event?.command ?? '';
}

function copilotCommandOutput(event) {
  const value = event?.data?.result ?? event?.data?.output ?? event?.result ?? event?.output ?? '';
  if (typeof value === 'string') return value;
  if (typeof value?.content === 'string') return value.content;
  if (Array.isArray(value?.content)) {
    return value.content.map(item => item?.text ?? item?.content ?? '').filter(Boolean).join('\n');
  }
  try { return value ? JSON.stringify(value) : ''; } catch { return String(value); }
}

function usageNumber(object, ...keys) {
  for (const key of keys) {
    if (Number.isFinite(object?.[key])) return object[key];
  }
  return 0;
}

function analyzeEvents(timedEvents, driver, agent) {
  const usage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    aiCreditNanoUnits: 0,
    aiCredits: 0,
    premiumRequests: 0,
    costUsd: null,
    modelUsage: null,
  };
  let usageObserved = false;
  let copilotAssistantUsageObserved = false;
  let copilotOutputObserved = false;
  let copilotMessageOutputTokens = 0;
  let aiCreditsObserved = false;
  let premiumRequestsObserved = false;
  let claudeCostObserved = false;
  let agentApiDurationMs = null;
  let agentReportedSessionDurationMs = null;
  const startedCommands = new Map();
  const startedCopilotCommands = new Map();
  const startedClaudeCommands = new Map();
  const commands = [];
  const pattern = driverDefinitions[driver].commandPattern;
  const driverCallCount = command => [...command.matchAll(new RegExp(pattern.source, pattern.flags))].length;

  for (const row of timedEvents) {
    const event = row.event;
    if (!event) continue;
    if (agent === 'codex' && event.type === 'turn.completed' && event.usage) {
      usageObserved = true;
      usage.inputTokens += event.usage.input_tokens ?? 0;
      usage.cachedInputTokens += event.usage.cached_input_tokens ?? 0;
      usage.outputTokens += event.usage.output_tokens ?? 0;
      usage.reasoningOutputTokens += event.usage.reasoning_output_tokens ?? 0;
    }
    if (agent === 'codex' && event.type === 'item.started' && event.item?.type === 'command_execution') {
      startedCommands.set(event.item.id, row.elapsedMs);
    }
    if (agent === 'codex' && event.type === 'item.completed' && event.item?.type === 'command_execution') {
      const command = commandText(event.item);
      const output = commandOutputText(event.item);
      const startedMs = startedCommands.get(event.item.id);
      commands.push({
        id: event.item.id,
        command,
        browserCommand: driverCallCount(command) > 0,
        driverCalls: driverCallCount(command),
        startedMs: startedMs ?? null,
        completedMs: row.elapsedMs,
        durationMs: startedMs == null ? null : row.elapsedMs - startedMs,
        status: event.item.status ?? null,
        exitCode: shellExitCodeFromEvent(event),
        outputBytes: Buffer.byteLength(output),
        output,
      });
    }
    if (agent === 'copilot' && event.type === 'assistant.usage') {
      copilotAssistantUsageObserved = true;
      const data = event.data ?? event;
      const rawInput = usageNumber(data, 'inputTokens', 'input_tokens');
      const cacheRead = usageNumber(data, 'cacheReadTokens', 'cache_read_input_tokens');
      const cacheWrite = usageNumber(data, 'cacheWriteTokens', 'cache_creation_input_tokens');
      const output = usageNumber(data, 'outputTokens', 'output_tokens');
      const reasoning = usageNumber(data, 'reasoningTokens', 'reasoning_output_tokens');
      if ([rawInput, cacheRead, cacheWrite, output, reasoning].some(value => value > 0)) usageObserved = true;
      // Copilot reports uncached, cache-read, and cache-write input separately.
      // Keep the harness convention that inputTokens includes all input classes.
      usage.inputTokens += rawInput + cacheRead + cacheWrite;
      usage.cachedInputTokens += cacheRead;
      usage.cacheCreationInputTokens += cacheWrite;
      usage.outputTokens += output;
      if (Number.isFinite(data.outputTokens) || Number.isFinite(data.output_tokens)) copilotOutputObserved = true;
      usage.reasoningOutputTokens += reasoning;

      const nanoUnits = usageNumber(data.copilotUsage, 'totalNanoAiu', 'total_nano_aiu');
      if (nanoUnits > 0) {
        aiCreditsObserved = true;
        usage.aiCreditNanoUnits += nanoUnits;
      }
      const premiumRequests = usageNumber(data.copilotUsage,
        'premiumRequestCost', 'totalPremiumRequestCost', 'premiumRequests');
      if (premiumRequests > 0) {
        premiumRequestsObserved = true;
        usage.premiumRequests += premiumRequests;
      }
    }
    if (agent === 'copilot' && event.type === 'assistant.message' && Number.isFinite(event.data?.outputTokens)) {
      copilotMessageOutputTokens += event.data.outputTokens;
      copilotOutputObserved = true;
    }
    if (agent === 'copilot' && event.type === 'session.usage_checkpoint') {
      const nanoUnits = usageNumber(event.data, 'totalNanoAiu', 'total_nano_aiu');
      if (nanoUnits > 0) {
        aiCreditsObserved = true;
        // Checkpoints are cumulative, so retain the largest observation.
        usage.aiCreditNanoUnits = Math.max(usage.aiCreditNanoUnits, nanoUnits);
      }
      const premiumRequests = usageNumber(event.data, 'totalPremiumRequests', 'total_premium_requests');
      if (premiumRequests > 0) {
        premiumRequestsObserved = true;
        usage.premiumRequests = Math.max(usage.premiumRequests, premiumRequests);
      }
    }
    if (agent === 'copilot' && event.type === 'result') {
      const premiumRequests = usageNumber(event.usage, 'premiumRequests', 'premium_requests');
      if (premiumRequests > 0) {
        premiumRequestsObserved = true;
        usage.premiumRequests = Math.max(usage.premiumRequests, premiumRequests);
      }
      const apiDuration = usageNumber(event.usage, 'totalApiDurationMs', 'total_api_duration_ms');
      const sessionDuration = usageNumber(event.usage, 'sessionDurationMs', 'session_duration_ms');
      if (apiDuration > 0) agentApiDurationMs = Math.max(agentApiDurationMs ?? 0, apiDuration);
      if (sessionDuration > 0) agentReportedSessionDurationMs = Math.max(agentReportedSessionDurationMs ?? 0, sessionDuration);
    }
    if (agent === 'copilot' && event.type === 'tool.execution_start') {
      const id = event.data?.toolCallId ?? event.toolCallId ?? event.id;
      const command = copilotCommand(event);
      if (id && command) startedCopilotCommands.set(id, { command, startedMs: row.elapsedMs });
    }
    if (agent === 'copilot' && event.type === 'tool.execution_complete') {
      const id = event.data?.toolCallId ?? event.toolCallId ?? event.id;
      const started = startedCopilotCommands.get(id);
      if (started) {
        const output = copilotCommandOutput(event);
        const success = event.data?.success ?? event.success;
        commands.push({
          id,
          command: started.command,
          browserCommand: driverCallCount(started.command) > 0,
          driverCalls: driverCallCount(started.command),
          startedMs: started.startedMs,
          completedMs: row.elapsedMs,
          durationMs: row.elapsedMs - started.startedMs,
          status: success === false ? 'failed' : 'completed',
          exitCode: shellExitCodeFromEvent(event),
          outputBytes: Buffer.byteLength(output),
          output,
        });
        startedCopilotCommands.delete(id);
      }
    }
    if (agent === 'claude' && event.type === 'assistant' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block?.type !== 'tool_use' || block.name !== 'Bash' || typeof block.input?.command !== 'string') continue;
        if (!startedClaudeCommands.has(block.id)) {
          startedClaudeCommands.set(block.id, { command: block.input.command, startedMs: row.elapsedMs });
        }
      }
    }
    if (agent === 'claude' && event.type === 'user' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block?.type !== 'tool_result') continue;
        const started = startedClaudeCommands.get(block.tool_use_id);
        if (!started) continue;
        const result = event.tool_use_result;
        const output = typeof block.content === 'string'
          ? block.content
          : [result?.stdout, result?.stderr].filter(value => typeof value === 'string' && value).join('\n');
        const failed = block.is_error === true || result?.interrupted === true;
        commands.push({
          id: block.tool_use_id,
          command: started.command,
          browserCommand: driverCallCount(started.command) > 0,
          driverCalls: driverCallCount(started.command),
          startedMs: started.startedMs,
          completedMs: row.elapsedMs,
          durationMs: row.elapsedMs - started.startedMs,
          status: failed ? 'failed' : 'completed',
          exitCode: shellExitCodeFromEvent(event) ?? (failed ? 1 : 0),
          outputBytes: Buffer.byteLength(output),
          output,
        });
        startedClaudeCommands.delete(block.tool_use_id);
      }
    }
  }

  if (agent === 'claude') {
    // Claude exposes cumulative usage. Prefer the largest cumulative
    // observation so streamed intermediate events are not double counted.
    for (const row of timedEvents) {
      const event = row.event;
      const candidates = [event?.usage, event?.modelUsage, event?.data?.usage, event?.metrics?.usage].filter(Boolean);
      for (const candidate of candidates) {
        const rawInput = usageNumber(candidate, 'input_tokens', 'inputTokens', 'total_input_tokens');
        const cacheRead = usageNumber(candidate, 'cache_read_input_tokens', 'cached_input_tokens', 'cachedInputTokens');
        const cacheCreation = usageNumber(candidate, 'cache_creation_input_tokens', 'cacheCreationInputTokens');
        const output = usageNumber(candidate, 'output_tokens', 'outputTokens', 'total_output_tokens');
        if (rawInput || cacheRead || cacheCreation || output) usageObserved = true;
        usage.inputTokens = Math.max(usage.inputTokens, rawInput + cacheRead + cacheCreation);
        usage.cachedInputTokens = Math.max(usage.cachedInputTokens,
          cacheRead);
        usage.cacheCreationInputTokens = Math.max(usage.cacheCreationInputTokens, cacheCreation);
        usage.outputTokens = Math.max(usage.outputTokens, output);
        usage.reasoningOutputTokens = Math.max(usage.reasoningOutputTokens,
          usageNumber(candidate, 'reasoning_output_tokens', 'reasoningOutputTokens'));
      }

      if (event?.modelUsage && typeof event.modelUsage === 'object') {
        const modelRows = Object.values(event.modelUsage);
        const rawInput = modelRows.reduce((sum, value) => sum + usageNumber(value, 'inputTokens', 'input_tokens'), 0);
        const cacheRead = modelRows.reduce((sum, value) => sum + usageNumber(value, 'cacheReadInputTokens', 'cache_read_input_tokens'), 0);
        const cacheCreation = modelRows.reduce((sum, value) => sum + usageNumber(value, 'cacheCreationInputTokens', 'cache_creation_input_tokens'), 0);
        const output = modelRows.reduce((sum, value) => sum + usageNumber(value, 'outputTokens', 'output_tokens'), 0);
        if (rawInput || cacheRead || cacheCreation || output) usageObserved = true;
        usage.inputTokens = Math.max(usage.inputTokens, rawInput + cacheRead + cacheCreation);
        usage.cachedInputTokens = Math.max(usage.cachedInputTokens, cacheRead);
        usage.cacheCreationInputTokens = Math.max(usage.cacheCreationInputTokens, cacheCreation);
        usage.outputTokens = Math.max(usage.outputTokens, output);
        usage.modelUsage = event.modelUsage;
      }

      if (event?.type === 'result') {
        if (Number.isFinite(event.total_cost_usd)) {
          claudeCostObserved = true;
          usage.costUsd = Math.max(usage.costUsd ?? 0, event.total_cost_usd);
        }
        if (Number.isFinite(event.duration_api_ms)) {
          agentApiDurationMs = Math.max(agentApiDurationMs ?? 0, event.duration_api_ms);
        }
        if (Number.isFinite(event.duration_ms)) {
          agentReportedSessionDurationMs = Math.max(agentReportedSessionDurationMs ?? 0, event.duration_ms);
        }
      }
    }
  }

  const classifiedCommands = commands.map(classifyCommandCompletion);
  const browserCommands = classifiedCommands.filter(command => command.browserCommand);
  if (agent === 'copilot' && !copilotAssistantUsageObserved && copilotOutputObserved) {
    usage.outputTokens = copilotMessageOutputTokens;
    usageObserved = true;
  }
  usage.aiCredits = aiCreditsObserved ? usage.aiCreditNanoUnits / 1_000_000_000 : null;
  if (!aiCreditsObserved) usage.aiCreditNanoUnits = null;
  if (!premiumRequestsObserved) usage.premiumRequests = null;
  if (!claudeCostObserved) usage.costUsd = null;
  if (usageObserved) {
    if (agent === 'copilot' && !copilotAssistantUsageObserved) {
      usage.inputTokens = null;
      usage.cachedInputTokens = null;
      usage.cacheCreationInputTokens = null;
      usage.uncachedInputTokens = null;
      usage.totalTokens = null;
    } else {
      usage.uncachedInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
      usage.totalTokens = usage.inputTokens + usage.outputTokens;
    }
  } else {
    for (const key of ['inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'outputTokens', 'reasoningOutputTokens']) {
      usage[key] = null;
    }
    usage.uncachedInputTokens = null;
    usage.totalTokens = null;
  }
  return {
    usage,
    commands: classifiedCommands,
    summary: {
      agentToolTurns: classifiedCommands.length,
      browserToolTurns: browserCommands.length,
      browserInvocations: browserCommands.reduce((sum, command) => sum + (command.driverCalls ?? 1), 0),
      failedToolTurns: classifiedCommands.filter(command => command.failed).length,
      failedBrowserInvocations: browserCommands.reduce(
        (sum, command) => sum + command.failedInvocations,
        0,
      ),
      // Backward-compatible aliases retained for existing report consumers.
      total: classifiedCommands.length,
      browser: browserCommands.reduce((sum, command) => sum + (command.driverCalls ?? 1), 0),
      failed: classifiedCommands.reduce((sum, command) => sum + command.failedInvocations, 0),
      browserDurationMs: browserCommands.reduce((sum, command) => sum + (command.durationMs ?? 0), 0),
      browserOutputBytes: browserCommands.reduce((sum, command) => sum + command.outputBytes, 0),
      allOutputBytes: classifiedCommands.reduce((sum, command) => sum + command.outputBytes, 0),
      firstBrowserCommandMs: browserCommands[0]?.startedMs ?? null,
      agentApiDurationMs,
      agentReportedSessionDurationMs,
    },
  };
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return value?.trim?.() ?? '';
  }
}

function evaluateAnswer(answer, expected) {
  const checks = {};
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'urlPath') {
      try { checks.urlPath = new URL(answer?.url).pathname === value; } catch { checks.urlPath = false; }
    } else if (key === 'url') {
      checks.url = typeof answer?.url === 'string' && normalizeUrl(answer.url) === normalizeUrl(value);
    } else {
      checks[key] = typeof answer?.[key] === 'string'
        && answer[key].trim().toLowerCase() === String(value).trim().toLowerCase();
    }
  }
  return { passed: Object.values(checks).every(Boolean), checks };
}

async function cleanupDriver(driver, workspace, env) {
  const binDir = path.join(root, 'node_modules', '.bin');
  const attempts = driver === 'playwright'
    ? [[path.join(binDir, 'playwright'), ['cli', 'close-all']], [path.join(binDir, 'playwright'), ['cli', 'kill-all']]]
    : driver === 'craftdriver'
      ? [[path.join(binDir, 'craftdriver'), ['daemon', 'stop']]]
      : [[path.join(binDir, 'vibium'), ['daemon', 'stop']]];
  const rows = [];
  for (const [command, args] of attempts) {
    const result = await runProcess(command, args, { cwd: workspace, env, timeoutMs: 30000 });
    rows.push({ command: [command, ...args], ...result, spawnError: result.spawnError?.message ?? null });
  }
  return rows;
}

async function preserveFinalScreenshot(workspace, runDir, externalSource) {
  const filename = 'final-screenshot.png';
  const source = externalSource ?? path.join(workspace, filename);
  const destination = path.join(runDir, filename);
  try {
    const stat = await fs.stat(source);
    if (!stat.isFile()) throw new Error('not a regular file');
    await fs.copyFile(source, destination);
    if (externalSource) await fs.rm(source, { force: true });
    return { filename, captured: true, bytes: stat.size, source: externalSource ? 'Vibium screenshot directory' : 'trial workspace' };
  } catch (error) {
    return { filename, captured: false, error: error.code === 'ENOENT' ? 'not found' : error.message };
  }
}

async function preflightDriver({ driver, baseUrl, batchDir, vibiumSupport }) {
  const preflightDir = path.join(batchDir, 'preflight');
  await fs.mkdir(preflightDir, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `llm-perf-preflight-${driver}-`));
  let workspace;
  let vibiumRuntime;
  let env = { ...process.env, CI: '1', NO_COLOR: '1', HEADLESS: 'true' };
  const rows = [];
  const session = `llm-perf-preflight-${process.pid}`;
  try {
    workspace = await prepareWorkspace(driver, tempRoot);
    const binDir = path.join(root, 'node_modules', '.bin');
    if (driver === 'vibium') {
      vibiumRuntime = await prepareVibiumRuntime(tempRoot, vibiumSupport);
      env = { ...env, ...vibiumRuntime.env };
    }
    const invocations = driver === 'playwright'
      ? [
          [path.join(binDir, 'playwright'), ['cli', `-s=${session}`, 'open', baseUrl]],
          [path.join(binDir, 'playwright'), ['cli', `-s=${session}`, 'snapshot']],
          [path.join(binDir, 'playwright'), ['cli', `-s=${session}`, 'close']],
        ]
      : driver === 'craftdriver' ? [
          [path.join(binDir, 'craftdriver'), ['go', baseUrl, '--browser', 'chrome', '--headless', '--session', session]],
          [path.join(binDir, 'craftdriver'), ['snapshot', '--session', session]],
          [path.join(binDir, 'craftdriver'), ['session', 'close', session]],
        ] : [
          [path.join(binDir, 'vibium'), ['go', baseUrl, '--headless', '--json']],
          [path.join(binDir, 'vibium'), ['map', '--json']],
          [path.join(binDir, 'vibium'), ['eval', 'navigator.userAgent', '--json']],
          [path.join(binDir, 'vibium'), ['stop', '--json']],
        ];
    for (const [command, args] of invocations) {
      const result = await runProcess(command, args, { cwd: workspace, env, timeoutMs: 90000 });
      rows.push({ command: [command, ...args], ...result, spawnError: result.spawnError?.message ?? null });
      if (result.code !== 0) throw new Error(`${driver} preflight failed: ${result.stderr || result.stdout}`);
    }
    return { passed: true, commands: rows };
  } finally {
    if (workspace) rows.push(...await cleanupDriver(driver, workspace, env));
    await fs.writeFile(path.join(preflightDir, `${driver}.json`), `${JSON.stringify(rows, null, 2)}\n`);
    if (vibiumRuntime) await fs.rm(vibiumRuntime.cacheDir, { recursive: true, force: true });
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function copyWorkspace(workspace, destination) {
  await fs.cp(workspace, destination, {
    recursive: true,
    filter(source) {
      const relative = path.relative(workspace, source);
      const first = relative.split(path.sep)[0];
      return first !== '.git' && first !== 'node_modules' && first !== '.tmp';
    },
  });
}

function parseJsonLines(text) {
  return text.split(/\r?\n/).filter(line => line.trim()).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function findStructuredAnswer(value, requiredKeys, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (requiredKeys.every(key => typeof value[key] === 'string')) {
    return Object.fromEntries(requiredKeys.map(key => [key, value[key]]));
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findStructuredAnswer(child, requiredKeys, seen);
    if (found) return found;
    if (typeof child === 'string') {
      try {
        const parsed = JSON.parse(child);
        const nested = findStructuredAnswer(parsed, requiredKeys, seen);
        if (nested) return nested;
      } catch {
        // Ordinary text is expected in agent event streams.
      }
    }
  }
  return null;
}

async function prepareAgent({ agent, agentHome }) {
  if (agent === 'codex') {
    const codexHome = await prepareCodexHome(agentHome);
    return {
      env: { HOME: codexHome, CODEX_HOME: codexHome },
      isolation: {
        freshAgentHome: true,
        freshAgentConfig: true,
        ignoresUserSettings: true,
        sessionPersistence: false,
        credentialSource: 'isolated auth link',
      },
    };
  }
  if (agent === 'claude') {
    const claudeConfig = path.join(agentHome, '.claude');
    await fs.mkdir(claudeConfig, { recursive: true, mode: 0o700 });
    const oauth = claudeOAuthToken();
    if (!oauth && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Claude isolation requires CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY, or Claude Code credentials in the macOS keychain.');
    }
    return {
      env: {
        HOME: agentHome,
        CLAUDE_CONFIG_DIR: claudeConfig,
        CLAUDE_CODE_SKIP_PROMPT_HISTORY: '1',
        ...(oauth ? { CLAUDE_CODE_OAUTH_TOKEN: oauth.token } : {}),
      },
      isolation: {
        freshAgentHome: true,
        freshAgentConfig: true,
        ignoresUserSettings: true,
        sessionPersistence: false,
        credentialSource: oauth?.source ?? 'Anthropic API key',
      },
    };
  }

  await fs.mkdir(agentHome, { recursive: true, mode: 0o700 });
  let token = process.env.COPILOT_GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) token = commandOutput('gh', ['auth', 'token']);
  if (!token) {
    throw new Error('Copilot isolation requires COPILOT_GITHUB_TOKEN, GH_TOKEN, GITHUB_TOKEN, or an authenticated gh CLI.');
  }
  return {
    env: { HOME: agentHome, COPILOT_HOME: agentHome, COPILOT_GITHUB_TOKEN: token },
    isolation: {
      freshAgentHome: true,
      freshAgentConfig: true,
      ignoresUserSettings: true,
      sessionPersistence: false,
      credentialSource: 'per-process token',
    },
  };
}

function buildAgentInvocation({ agent, model, reasoning, workspace, prompt, schemaText, schemaPath, temporaryFinal, runDir, yolo }) {
  if (agent === 'codex') {
    const args = [
      'exec', '--ephemeral', '--json', '--ignore-user-config', '--ignore-rules',
      ...(yolo ? ['--dangerously-bypass-approvals-and-sandbox'] : ['--sandbox', 'workspace-write']),
      '--cd', workspace,
      '--model', model,
      '--config', `model_reasoning_effort=${JSON.stringify(reasoning)}`,
      ...(!yolo ? ['--config', 'approval_policy="never"'] : []),
      '--output-schema', schemaPath,
      '--output-last-message', temporaryFinal,
      prompt,
    ];
    return { command: agentDefinitions.codex.binary, args, outputFormat: 'codex-jsonl' };
  }

  if (agent === 'claude') {
    const effort = reasoning === 'minimal' ? 'low' : reasoning;
    const claudeSchema = JSON.parse(schemaText);
    delete claudeSchema.$schema;
    const claudeSchemaText = JSON.stringify(claudeSchema);
    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--json-schema', claudeSchemaText,
      '--model', model,
      '--effort', effort,
      '--no-session-persistence',
      '--setting-sources', 'project',
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--no-chrome',
      ...(yolo ? ['--dangerously-skip-permissions'] : ['--permission-mode', 'dontAsk']),
    ];
    return { command: agentDefinitions.claude.binary, args, outputFormat: 'claude-jsonl' };
  }

  const args = [
    '-p', prompt,
    '--output-format=json',
    '--model', model,
    '--reasoning-effort', reasoning,
    '-C', workspace,
    '--no-ask-user', '--no-auto-update', '--no-remote', '--no-remote-export', '--no-experimental', '--no-color',
    '--log-dir', path.join(runDir, 'agent-logs'),
    ...(yolo ? ['--yolo'] : ['--allow-all-tools']),
  ];
  return { command: agentDefinitions.copilot.binary, args, outputFormat: 'copilot-jsonl' };
}

function answerFromAgent({ agent, stdout, timedEvents, temporaryFinal, requiredKeys }) {
  if (agent === 'codex') return fs.readFile(temporaryFinal, 'utf8');
  const parsed = parseJsonLines(stdout);
  try { parsed.push(JSON.parse(stdout)); } catch { /* JSONL is the normal alternative. */ }
  const events = timedEvents.map(row => row.event).filter(Boolean);
  const answer = findStructuredAnswer([...parsed].reverse(), requiredKeys)
    ?? findStructuredAnswer([...events].reverse(), requiredKeys);
  return Promise.resolve(answer ? JSON.stringify(answer) : '');
}

async function runTrial({ driver, task, baseUrl, options, batchDir, trialIndex, versions, vibiumSupport }) {
  const runId = `${String(trialIndex).padStart(3, '0')}-${options.agent}-${driver}`;
  const runDir = path.join(batchDir, 'runs', runId);
  await fs.mkdir(runDir, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `llm-perf-${runId}-`));
  // Keep HOME short as well as fresh. Unix-domain sockets on macOS have a
  // small path limit; nesting CraftDriver's project socket below os.tmpdir()
  // can exceed it and turn an isolation measure into a driver failure.
  const agentHome = await fs.mkdtemp('/tmp/llm-perf-agent-');
  const startedAt = new Date();
  let workspace;
  let cleanupEnv = process.env;
  let cleanupCompleted = false;

  try {
    workspace = await prepareWorkspace(driver, tempRoot, { headed: options.headed });
    const preparedAgent = await prepareAgent({ agent: options.agent, agentHome });
    const prompt = renderPrompt(task, driver, baseUrl, { headed: options.headed });
    const outputSchema = path.resolve(root, task.outputSchema);
    const schemaText = await fs.readFile(outputSchema, 'utf8');
    const temporaryFinal = path.join(tempRoot, 'final.json');
    const vibiumRuntime = driver === 'vibium' ? await prepareVibiumRuntime(tempRoot, vibiumSupport) : null;
    const vibiumScreenshotFilename = driver === 'vibium'
      ? `${path.basename(batchDir)}-${runId}-final-screenshot.png`
      : null;
    const vibiumScreenshotSource = vibiumScreenshotFilename
      ? path.join(os.homedir(), 'Pictures', 'Vibium', vibiumScreenshotFilename)
      : null;
    const env = {
      ...process.env,
      ...preparedAgent.env,
      ...vibiumRuntime?.env,
      CI: '1',
      NO_COLOR: '1',
      HEADLESS: options.headed ? 'false' : 'true',
      CRAFTDRIVER_AGENT_TIMEOUT: '5000',
      CRAFTDRIVER_CACHE_DIR: sharedCraftDriverCache,
      CRAFTDRIVER_OFFLINE: '1',
      ...(vibiumScreenshotFilename ? { LLM_BENCH_SCREENSHOT_FILE: vibiumScreenshotFilename } : {}),
    };
    cleanupEnv = env;

    await fs.writeFile(path.join(runDir, 'prompt.txt'), `${prompt}\n`);
    await fs.copyFile(outputSchema, path.join(runDir, 'output-schema.json'));
    const workspaceSchema = path.join(workspace, '.benchmark-output-schema.json');
    await fs.copyFile(outputSchema, workspaceSchema);
    const invocation = buildAgentInvocation({
      agent: options.agent,
      model: options.model,
      reasoning: options.reasoning,
      workspace,
      prompt,
      schemaText,
      schemaPath: workspaceSchema,
      temporaryFinal,
      runDir,
      yolo: options.yolo,
    });
    const result = await runCodex({
      command: invocation.command,
      args: invocation.args,
      cwd: workspace,
      env,
      timeoutMs: options.timeoutMs,
      liveLogs: {
        stdout: path.join(runDir, 'events.jsonl'),
        stderr: path.join(runDir, 'stderr.log'),
        timed: path.join(runDir, 'events.timed.jsonl'),
      },
    });
    const finalScreenshot = await preserveFinalScreenshot(workspace, runDir, vibiumScreenshotSource);
    const cleanup = await cleanupDriver(driver, workspace, env);
    cleanupCompleted = true;
    await fs.writeFile(path.join(runDir, 'events.jsonl'), result.stdout);
    await fs.writeFile(path.join(runDir, 'events.timed.jsonl'), `${result.events.map(row => JSON.stringify(row)).join('\n')}\n`);
    await fs.writeFile(path.join(runDir, 'stderr.log'), result.stderr);
    await fs.writeFile(path.join(runDir, 'cleanup.json'), `${JSON.stringify(cleanup, null, 2)}\n`);
    await fs.writeFile(path.join(runDir, 'screenshot.json'), `${JSON.stringify(finalScreenshot, null, 2)}\n`);

    let finalText = '';
    let answer = null;
    let answerParseError = null;
    try {
      const requiredKeys = Object.keys(JSON.parse(schemaText).properties ?? {});
      finalText = await answerFromAgent({
        agent: options.agent,
        stdout: result.stdout,
        timedEvents: result.events,
        temporaryFinal,
        requiredKeys,
      });
      answer = JSON.parse(finalText);
    } catch (error) {
      answerParseError = error.message;
    }
    await fs.writeFile(path.join(runDir, 'final.json'), finalText || '');

    const analysis = analyzeEvents(result.events, driver, options.agent);
    const correctness = evaluateAnswer(answer, task.expected);
    const endedAt = new Date();
    const metadata = {
      runId,
      batchId: path.basename(batchDir),
      trialIndex,
      driver,
      driverLabel: driverDefinitions[driver].label,
      agent: options.agent,
      agentLabel: agentDefinitions[options.agent].label,
      task: task.id,
      promptSha256: sha256(prompt),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      model: options.model,
      reasoning: options.reasoning,
      isolation: {
        agentEphemeral: options.agent === 'codex' || options.agent === 'claude',
        ignoreUserConfig: preparedAgent.isolation.ignoresUserSettings,
        freshAgentHome: preparedAgent.isolation.freshAgentHome,
        freshAgentConfig: preparedAgent.isolation.freshAgentConfig,
        sessionPersistence: preparedAgent.isolation.sessionPersistence,
        credentialSource: preparedAgent.isolation.credentialSource,
        freshGitWorkspace: true,
        freshBrowserSession: true,
        browserMode: options.headed ? 'headed' : 'headless',
        sharedHistory: false,
        browserBinaryCache: 'warm/shared',
      },
      versions,
      browserRuntime: vibiumRuntime?.metadata ?? { browserSource: 'installed Google Chrome' },
      platform: { platform: process.platform, arch: process.arch, node: process.version },
      artifacts: { finalScreenshot },
      agentProcess: {
        exitCode: result.code,
        signal: result.signal,
        timedOut: result.timedOut,
        spawnError: result.spawnError?.message ?? null,
        command: invocation.command,
        args: invocation.args.map((value, index) => value === prompt
          ? '<prompt>'
          : invocation.args[index - 1] === '--json-schema' ? '<schema>' : value),
        outputFormat: invocation.outputFormat,
        yolo: options.yolo,
      },
    };
    const metrics = {
      runId,
      agent: options.agent,
      driver,
      task: task.id,
      successful: result.code === 0 && !result.timedOut && correctness.passed && finalScreenshot.captured,
      infrastructure: {
        exitCode: result.code,
        timedOut: result.timedOut,
        answerParseError,
        screenshotCaptured: finalScreenshot.captured,
      },
      correctness,
      answer,
      timing: {
        wallTimeMs: result.wallTimeMs,
        firstBrowserCommandMs: analysis.summary.firstBrowserCommandMs,
        browserCommandDurationMs: analysis.summary.browserDurationMs,
        agentApiDurationMs: analysis.summary.agentApiDurationMs,
        agentReportedSessionDurationMs: analysis.summary.agentReportedSessionDurationMs,
      },
      usage: analysis.usage,
      commands: analysis.summary,
      bytes: {
        agentEvents: Buffer.byteLength(result.stdout),
        agentStderr: Buffer.byteLength(result.stderr),
      },
    };

    await fs.writeFile(path.join(runDir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    await fs.writeFile(path.join(runDir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
    await fs.writeFile(path.join(runDir, 'commands.json'), `${JSON.stringify(analysis.commands, null, 2)}\n`);
    await copyWorkspace(workspace, path.join(runDir, 'workspace'));
    return metrics;
  } catch (error) {
    await fs.writeFile(path.join(runDir, 'infrastructure-error.json'), `${JSON.stringify({ message: error.message, stack: error.stack }, null, 2)}\n`);
    return { runId, agent: options.agent, driver, task: task.id, successful: false, infrastructureError: error.message };
  } finally {
    if (workspace && !cleanupCompleted) {
      const cleanup = await cleanupDriver(driver, workspace, cleanupEnv);
      await fs.writeFile(path.join(runDir, 'cleanup.json'), `${JSON.stringify(cleanup, null, 2)}\n`);
    }
    if (driver === 'vibium') {
      const runtimeCache = cleanupEnv.VIBIUM_CACHE_DIR;
      if (runtimeCache?.startsWith('/tmp/llm-perf-vibium-')) {
        await fs.rm(runtimeCache, { recursive: true, force: true });
      }
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
    await fs.rm(agentHome, { recursive: true, force: true });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  safeId(options.task);
  const taskPath = path.join(root, 'benchmarks', 'tasks', `${options.task}.json`);
  const task = JSON.parse(await fs.readFile(taskPath, 'utf8'));
  if (task.id !== options.task) throw new Error(`Task id mismatch in ${taskPath}`);

  const agentDefinition = agentDefinitions[options.agent];
  const agentVersion = commandOutput(agentDefinition.binary, ['--version']);
  if (!agentVersion) throw new Error(`${agentDefinition.label} is not installed or not executable (${agentDefinition.binary})`);
  if (options.agent === 'codex' && commandOutput(agentDefinition.binary, ['login', 'status']) == null) {
    throw new Error('Codex CLI is not authenticated');
  }
  if (options.agent === 'claude' && commandOutput(agentDefinition.binary, ['auth', 'status']) == null) {
    throw new Error('Claude Code CLI is not authenticated');
  }
  for (const driver of options.drivers) {
    const skillRoot = options.agent === 'claude' ? '.claude' : '.agents';
    await fs.access(path.join(driverDefinitions[driver].template, skillRoot, 'skills'));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const batchId = safeId(options.batchId ?? `${task.id}-${timestamp}`);
  const batchDir = path.join(root, 'results', batchId);
  await fs.mkdir(path.join(batchDir, 'runs'), { recursive: true });
  await fs.mkdir(path.join(batchDir, 'preflight'), { recursive: true });
  const fixtureServer = await startFixtureServer(task.fixture);
  try {
    const vibiumSupport = options.drivers.includes('vibium') ? await prepareVibiumSupport() : null;
  const systemChrome = installedChromeInfo();
  const craftdriverBrowser = options.drivers.includes('craftdriver')
    ? await recordCraftDriverChromeProvenance(
        systemChrome,
        path.join(batchDir, 'preflight', 'craftdriver-browser-driver.json'),
      )
    : null;
  const versions = {
    agent: agentVersion,
    codex: options.agent === 'codex' ? agentVersion : commandOutput(process.env.CODEX_BIN ?? 'codex', ['--version']),
    playwright: packageVersion('playwright'),
    craftdriver: packageVersion('craftdriver'),
    craftdriverGitSha: commandOutput('git', ['rev-parse', 'HEAD'], path.resolve(root, '..', 'craftdriver')),
    craftdriverGitDirty: Boolean(commandOutput('git', ['status', '--porcelain'], path.resolve(root, '..', 'craftdriver'))),
    craftdriverWorktreeDiffSha256: (() => {
      const diff = commandOutput('git', ['diff', '--binary', 'HEAD'], path.resolve(root, '..', 'craftdriver'));
      return diff ? sha256(diff) : null;
    })(),
    craftdriverSkillManifest: JSON.parse(await fs.readFile(path.join(
      root,
      'drivers',
      'craftdriver',
      '.agents',
      'skills',
      'craftdriver',
      '.craftdriver-manifest.json',
    ), 'utf8')),
    vibium: packageVersion('vibium'),
    vibiumSkill: {
      name: 'vibe-check',
      source: 'https://github.com/VibiumDev/vibium/tree/b0f372ccd3ec895c4bf78d43ac9fb8eaba767a67/skills/vibe-check',
      sourceCommit: 'b0f372ccd3ec895c4bf78d43ac9fb8eaba767a67',
      sha256: sha256(await fs.readFile(path.join(root, 'drivers', 'vibium', '.agents', 'skills', 'vibe-check', 'SKILL.md'))),
    },
    chrome: systemChrome,
    craftdriverBrowser,
    vibiumBrowser: vibiumSupport ? {
      source: vibiumSupport.browserSource,
      chrome: vibiumSupport.chrome,
      chromedriver: vibiumSupport.chromedriver,
    } : null,
  };
  const preflight = {};
  for (const driver of options.drivers) {
    preflight[driver] = await preflightDriver({
      driver,
      baseUrl: fixtureServer?.baseUrl ?? 'data:text/html,<title>llm-perf preflight</title><h1>Ready</h1>',
      batchDir,
      vibiumSupport,
    });
  }
  const schedule = [];
  for (let trial = 1; trial <= options.runs; trial += 1) {
    const order = rotatedDriverOrder(options.drivers, trial, options.seed);
    for (const driver of order) schedule.push({ trial, driver });
  }
  const manifest = {
    batchId,
    createdAt: new Date().toISOString(),
    options: { ...options, batchId },
    task,
    fixtureBaseUrl: fixtureServer?.baseUrl ?? null,
    versions,
    preflight,
    schedule,
    runs: [],
  };
  await fs.writeFile(path.join(batchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Batch: ${batchId}`);
  console.log(`Task: ${task.id}`);
  console.log(`Agent: ${options.agent} (${agentVersion})`);
  console.log(`Model: ${options.model} (${options.reasoning})`);
  console.log(`Schedule: ${schedule.map(row => `${row.driver}#${row.trial}`).join(', ')}`);

  for (let index = 0; index < schedule.length; index += 1) {
    const row = schedule[index];
    console.log(`\n[${index + 1}/${schedule.length}] ${row.driver}, trial ${row.trial}`);
    const metrics = await runTrial({
        driver: row.driver,
        task,
        baseUrl: fixtureServer?.baseUrl,
        options,
        batchDir,
        trialIndex: row.trial,
        versions,
        vibiumSupport,
    });
    manifest.runs.push(metrics);
    await fs.writeFile(path.join(batchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (metrics.timing && metrics.usage) {
      console.log(`${metrics.successful ? 'PASS' : 'FAIL'} wall=${(metrics.timing.wallTimeMs / 1000).toFixed(2)}s input=${metrics.usage.inputTokens} output=${metrics.usage.outputTokens} aiCredits=${metrics.usage.aiCredits ?? 'n/a'} browserCalls=${metrics.commands.browser}`);
    } else console.log(`ERROR ${metrics.infrastructureError ?? 'unknown failure'}`);
  }

  const report = await runProcess(process.execPath, [path.join(root, 'scripts', 'report.mjs'), '--batch', batchId], {
    cwd: root,
    env: process.env,
    timeoutMs: 30000,
  });
  process.stdout.write(`\n${report.stdout}`);
  if (report.code !== 0) process.stderr.write(report.stderr);
  } finally {
    await fixtureServer?.close();
  }
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
