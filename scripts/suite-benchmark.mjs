import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validAgents = new Set(['codex', 'claude', 'copilot']);
const validDrivers = new Set(['playwright', 'craftdriver', 'vibium']);
const validReasoning = new Set(['minimal', 'low', 'medium', 'high', 'xhigh']);

function safeId(value) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error(`Unsafe id: ${value}`);
  return value;
}

function parseArgs(argv) {
  const options = {
    suite: 'e2e',
    agent: process.env.LLM_BENCH_AGENT ?? 'codex',
    drivers: 'all',
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
    if (arg === '--suite') options.suite = value();
    else if (arg === '--agent') options.agent = value();
    else if (arg === '--driver') options.drivers = value();
    else if (arg === '--runs') options.runs = Number(value());
    else if (arg === '--model') options.model = value();
    else if (arg === '--reasoning') options.reasoning = value();
    else if (arg === '--seed') options.seed = Number(value());
    else if (arg === '--timeout-ms') options.timeoutMs = Number(value());
    else if (arg === '--batch-id') options.batchId = value();
    else if (arg === '--safe') options.yolo = false;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--headless') options.headed = false;
    else if (arg === '--task') throw new Error('--task cannot be used with a suite; edit the suite task list instead');
    else if (arg === '--help') {
      console.log(`Usage: npm run bench:e2e -- --model MODEL [options]

Runs every task in the E2E suite sequentially and creates a suite report.

Options:
  --suite ID                           Suite id (default: e2e)
  --agent codex|claude|copilot         Agent CLI to run (default: codex)
  --driver all|LIST                    Drivers to run (default: all)
  --runs N                             Trials per driver, per scenario (default: 3)
  --model MODEL                        Required agent model; or LLM_BENCH_MODEL
  --reasoning LEVEL                    minimal|low|medium|high|xhigh (default: medium)
  --seed N                             Base driver-order rotation seed (default: 42)
  --timeout-ms N                       Timeout per trial (default: 600000)
  --batch-id ID                        Optional suite result directory name
  --headed                             Show browser windows (default: headless)
  --safe                               Disable the default agent YOLO mode`);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  safeId(options.suite);
  if (options.batchId) safeId(options.batchId);
  if (!options.model) throw new Error('Pin the model with --model or LLM_BENCH_MODEL; an implicit default would make comparisons untrustworthy.');
  if (!validAgents.has(options.agent)) throw new Error(`Unknown agent: ${options.agent}`);
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  if (!Number.isInteger(options.seed)) throw new Error('--seed must be an integer');
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1000) throw new Error('--timeout-ms must be at least 1000');
  if (!validReasoning.has(options.reasoning)) throw new Error(`Unsupported reasoning level: ${options.reasoning}`);
  const drivers = options.drivers === 'all' ? [...validDrivers] : options.drivers.split(',');
  if (!drivers.length || drivers.some(driver => !validDrivers.has(driver))) throw new Error(`Unknown driver selection: ${options.drivers}`);
  options.drivers = [...new Set(drivers)].join(',');
  return options;
}

function runProcess(command, args, cwd = root) {
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: 'inherit' });
    child.once('error', error => resolve({ exitCode: null, signal: null, error: error.message }));
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal, error: null }));
  });
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function pathExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function childArgs(options, taskId, batchId, seed) {
  return [
    path.join(root, 'scripts', 'benchmark.mjs'),
    '--agent', options.agent,
    '--driver', options.drivers,
    '--task', taskId,
    '--runs', String(options.runs),
    '--model', options.model,
    '--reasoning', options.reasoning,
    '--seed', String(seed),
    '--timeout-ms', String(options.timeoutMs),
    '--batch-id', batchId,
    options.yolo ? null : '--safe',
    options.headed ? '--headed' : '--headless',
  ].filter(Boolean);
}

async function summarizeChild(taskId, batchId, seed, processResult) {
  const manifestPath = path.join(root, 'results', batchId, 'manifest.json');
  let childManifest = null;
  try { childManifest = await readJson(manifestPath); } catch { /* A startup failure may have no manifest. */ }
  const runs = childManifest?.runs ?? [];
  return {
    taskId,
    batchId,
    seed,
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    processError: processResult.error,
    status: processResult.exitCode === 0 && childManifest ? 'completed' : 'failed',
    successfulRuns: runs.filter(run => run.successful).length,
    totalRuns: runs.length,
    report: path.join('..', batchId, 'report.md'),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const suitePath = path.join(root, 'benchmarks', 'suites', `${options.suite}.json`);
  const suite = await readJson(suitePath);
  if (suite.id !== options.suite) throw new Error(`Suite id mismatch in ${suitePath}`);
  if (suite.aggregation !== 'mean-of-scenario-medians') throw new Error(`Unsupported suite aggregation: ${suite.aggregation}`);
  if (!Array.isArray(suite.tasks) || !suite.tasks.length) throw new Error(`Suite ${suite.id} has no tasks`);
  if (new Set(suite.tasks).size !== suite.tasks.length) throw new Error(`Suite ${suite.id} contains duplicate tasks`);
  for (const taskId of suite.tasks) {
    safeId(taskId);
    const task = await readJson(path.join(root, 'benchmarks', 'tasks', `${taskId}.json`));
    if (task.id !== taskId) throw new Error(`Task id mismatch for ${taskId}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const batchId = safeId(options.batchId ?? `${suite.id}-${timestamp}`);
  const suiteDir = path.join(root, 'results', batchId);
  if (await pathExists(suiteDir)) throw new Error(`Suite result directory already exists: ${suiteDir}`);

  const childBatches = suite.tasks.map((taskId, index) => ({
    taskId,
    batchId: safeId(`${batchId}-${String(index + 1).padStart(2, '0')}-${taskId}`),
    seed: options.seed + index,
  }));
  for (const child of childBatches) {
    const childDir = path.join(root, 'results', child.batchId);
    if (await pathExists(childDir)) throw new Error(`Scenario result directory already exists: ${childDir}`);
  }

  await fs.mkdir(suiteDir, { recursive: false });
  const manifest = {
    type: 'agent-suite',
    batchId,
    createdAt: new Date().toISOString(),
    suite,
    options: { ...options, batchId },
    aggregation: {
      method: 'arithmetic mean of per-scenario medians',
      weighting: 'equal weight per scenario',
      missingValues: 'excluded from each metric mean and reported with a metric-specific count',
    },
    scenarioBatches: [],
  };
  const manifestPath = path.join(suiteDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Suite batch: ${batchId}`);
  console.log(`Suite: ${suite.id}`);
  console.log(`Scenarios: ${suite.tasks.join(', ')}`);
  console.log(`Runs: ${options.runs} per driver, per scenario`);
  console.log('Execution: sequential');

  let childFailed = false;
  for (let index = 0; index < childBatches.length; index += 1) {
    const child = childBatches[index];
    console.log(`\n=== Scenario ${index + 1}/${childBatches.length}: ${child.taskId} ===\n`);
    const result = await runProcess(process.execPath, childArgs(options, child.taskId, child.batchId, child.seed));
    const summary = await summarizeChild(child.taskId, child.batchId, child.seed, result);
    manifest.scenarioBatches.push(summary);
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    if (summary.status !== 'completed') childFailed = true;
  }

  console.log('\n=== E2E suite aggregate ===\n');
  const reportResult = await runProcess(process.execPath, [path.join(root, 'scripts', 'suite-report.mjs'), '--batch', batchId]);
  if (reportResult.exitCode !== 0) childFailed = true;
  if (childFailed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
