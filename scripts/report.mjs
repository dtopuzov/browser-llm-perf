import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let batch;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--batch') batch = argv[++index];
    else if (argv[index] === '--help') {
      console.log('Usage: npm run report -- [--batch BATCH_ID]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return { batch };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function numeric(rows, getter) {
  return rows.map(getter).filter(value => Number.isFinite(value));
}

function stats(rows, getter) {
  const values = numeric(rows, getter);
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    p95: percentile(values, 0.95),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

function formatNumber(value, digits = 0) {
  if (value == null) return 'n/a';
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatSeconds(value) {
  return value == null ? 'n/a' : `${(value / 1000).toFixed(2)}s`;
}

function formatPercent(value) {
  return value == null ? 'n/a' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatUsd(value) {
  return value == null ? 'n/a' : `$${Number(value).toFixed(4)}`;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function latestBatch() {
  const entries = await fs.readdir(path.join(root, 'results'), { withFileTypes: true });
  const batches = [];
  for (const entry of entries.filter(value => value.isDirectory())) {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(root, 'results', entry.name, 'manifest.json'), 'utf8'));
      if (manifest.type !== 'direct-cli' && manifest.task?.id && Array.isArray(manifest.runs)) {
        batches.push({ name: entry.name, createdAt: manifest.createdAt ?? '' });
      }
    } catch {
      // Ignore incomplete and non-agent benchmark directories.
    }
  }
  batches.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!batches.length) throw new Error('No benchmark result batches found');
  return batches.at(-1).name;
}

function aggregateDriver(rows) {
  return {
    runs: rows.length,
    successful: rows.filter(row => row.successful).length,
    successRate: rows.length ? rows.filter(row => row.successful).length / rows.length : 0,
    wallTimeMs: stats(rows, row => row.timing?.wallTimeMs),
    firstBrowserCommandMs: stats(rows, row => row.timing?.firstBrowserCommandMs),
    browserCommandDurationMs: stats(rows, row => row.timing?.browserCommandDurationMs),
    agentApiDurationMs: stats(rows, row => row.timing?.agentApiDurationMs),
    inputTokens: stats(rows, row => row.usage?.inputTokens),
    cachedInputTokens: stats(rows, row => row.usage?.cachedInputTokens),
    cacheCreationInputTokens: stats(rows, row => row.usage?.cacheCreationInputTokens),
    uncachedInputTokens: stats(rows, row => row.usage?.uncachedInputTokens),
    outputTokens: stats(rows, row => row.usage?.outputTokens),
    reasoningOutputTokens: stats(rows, row => row.usage?.reasoningOutputTokens),
    totalTokens: stats(rows, row => row.usage?.totalTokens),
    aiCredits: stats(rows, row => row.usage?.aiCredits),
    premiumRequests: stats(rows, row => row.usage?.premiumRequests),
    costUsd: stats(rows, row => row.usage?.costUsd),
    agentToolTurns: stats(rows, row => row.commands?.agentToolTurns ?? row.commands?.total),
    browserToolTurns: stats(rows, row => row.commands?.browserToolTurns),
    browserCalls: stats(rows, row => row.commands?.browserInvocations ?? row.commands?.browser),
    failedBrowserInvocations: stats(rows, row => row.commands?.failedBrowserInvocations ?? row.commands?.failed),
    failedCommands: stats(rows, row => row.commands?.failedBrowserInvocations ?? row.commands?.failed),
    browserOutputBytes: stats(rows, row => row.commands?.browserOutputBytes),
  };
}

function comparisons(aggregates) {
  const playwright = aggregates.playwright;
  if (!playwright) return {};
  const delta = (value, base) => base ? ((value / base) - 1) * 100 : null;
  return Object.fromEntries(Object.entries(aggregates)
    .filter(([driver]) => driver !== 'playwright')
    .map(([driver, value]) => [driver, {
      wallTimeMedianPercent: delta(value.wallTimeMs.median, playwright.wallTimeMs.median),
      inputTokensMedianPercent: delta(value.inputTokens.median, playwright.inputTokens.median),
      uncachedInputTokensMedianPercent: delta(value.uncachedInputTokens.median, playwright.uncachedInputTokens.median),
      outputTokensMedianPercent: delta(value.outputTokens.median, playwright.outputTokens.median),
      totalTokensMedianPercent: delta(value.totalTokens.median, playwright.totalTokens.median),
      aiCreditsMedianPercent: delta(value.aiCredits.median, playwright.aiCredits.median),
      costUsdMedianPercent: delta(value.costUsd.median, playwright.costUsd.median),
      browserCommandDurationMedianPercent: delta(value.browserCommandDurationMs.median, playwright.browserCommandDurationMs.median),
      agentApiDurationMedianPercent: delta(value.agentApiDurationMs.median, playwright.agentApiDurationMs.median),
      browserOutputBytesMedianPercent: delta(value.browserOutputBytes.median, playwright.browserOutputBytes.median),
    }]));
}

async function slowestCommands(batchDir, rows) {
  const byDriver = {};
  for (const row of rows) {
    try {
      const commands = JSON.parse(await fs.readFile(path.join(batchDir, 'runs', row.runId, 'commands.json'), 'utf8'));
      for (const command of commands.filter(item => item.browserCommand && Number.isFinite(item.durationMs))) {
        (byDriver[row.driver] ??= []).push({ runId: row.runId, ...command });
      }
    } catch {
      // Infrastructure failures can legitimately have no command transcript.
    }
  }
  for (const driver of Object.keys(byDriver)) {
    byDriver[driver] = byDriver[driver].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8);
  }
  return byDriver;
}

function buildMarkdown({ batchId, manifest, rows, aggregates, deltas, slowest }) {
  const lines = [
    `# Benchmark report: ${batchId}`,
    '',
    `- Task: \`${manifest.task.id}\``,
    `- Agent: \`${manifest.options.agent}\` (\`${manifest.versions.agent}\`)`,
    `- Model: \`${manifest.options.model}\``,
    `- Reasoning: \`${manifest.options.reasoning}\``,
    `- Playwright: \`${manifest.versions.playwright}\``,
    `- CraftDriver: \`${manifest.versions.craftdriver}\` (${manifest.versions.craftdriverGitSha ?? 'no git SHA'})`,
    `- Vibium: \`${manifest.versions.vibium ?? 'not selected'}\``,
    `- Vibium skill: \`${manifest.versions.vibiumSkill?.name ?? 'not selected'}\` (${manifest.versions.vibiumSkill?.sourceCommit ?? 'unknown source'})`,
    `- Installed Chrome (Playwright/CraftDriver): \`${manifest.versions.chrome?.version ?? 'unknown'}\``,
    `- Vibium-managed Chrome: \`${manifest.versions.vibiumBrowser?.chrome?.version ?? 'not selected'}\``,
    '',
    '## Aggregate results',
    '',
    '| Driver | Correct | Wall median | Wall p95 | Model API time | AI Credits | Reported cost | Input median | Cached median | Uncached median | Output median | Total median | Browser tool turns | CLI calls | Driver time | Driver output |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const driver of Object.keys(aggregates).sort()) {
    const value = aggregates[driver];
    lines.push(`| ${driver} | ${value.successful}/${value.runs} | ${formatSeconds(value.wallTimeMs.median)} | ${formatSeconds(value.wallTimeMs.p95)} | ${formatSeconds(value.agentApiDurationMs.median)} | ${formatNumber(value.aiCredits.median, 4)} | ${formatUsd(value.costUsd.median)} | ${formatNumber(value.inputTokens.median)} | ${formatNumber(value.cachedInputTokens.median)} | ${formatNumber(value.uncachedInputTokens.median)} | ${formatNumber(value.outputTokens.median)} | ${formatNumber(value.totalTokens.median)} | ${formatNumber(value.browserToolTurns.median, 1)} | ${formatNumber(value.browserCalls.median, 1)} | ${formatSeconds(value.browserCommandDurationMs.median)} | ${formatNumber(value.browserOutputBytes.median)} B |`);
  }

  for (const [driver, values] of Object.entries(deltas)) {
    const label = driver === 'craftdriver' ? 'CraftDriver' : driver === 'vibium' ? 'Vibium' : driver;
    lines.push('', `## ${label} relative to Playwright`, '', `Positive values mean ${label} used more time, tokens, or output bytes.`, '');
    lines.push('| Metric | Median difference |', '| --- | ---: |');
    lines.push(`| End-to-end wall time | ${formatPercent(values.wallTimeMedianPercent)} |`);
    lines.push(`| Input tokens | ${formatPercent(values.inputTokensMedianPercent)} |`);
    lines.push(`| Uncached input tokens | ${formatPercent(values.uncachedInputTokensMedianPercent)} |`);
    lines.push(`| Output tokens | ${formatPercent(values.outputTokensMedianPercent)} |`);
    lines.push(`| Total tokens | ${formatPercent(values.totalTokensMedianPercent)} |`);
    lines.push(`| AI Credits | ${formatPercent(values.aiCreditsMedianPercent)} |`);
    lines.push(`| Reported USD cost | ${formatPercent(values.costUsdMedianPercent)} |`);
    lines.push(`| Browser-command time | ${formatPercent(values.browserCommandDurationMedianPercent)} |`);
    lines.push(`| Model API time | ${formatPercent(values.agentApiDurationMedianPercent)} |`);
    lines.push(`| Browser output bytes | ${formatPercent(values.browserOutputBytesMedianPercent)} |`);
  }

  lines.push('', '## Individual runs', '', '| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |', '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of rows) {
    lines.push(`| ${row.runId} | ${row.agent ?? manifest.options.agent} | ${row.driver} | ${row.successful ? 'yes' : 'no'} | ${formatSeconds(row.timing?.wallTimeMs)} | ${formatNumber(row.usage?.aiCredits, 4)} | ${formatUsd(row.usage?.costUsd)} | ${formatNumber(row.usage?.inputTokens)} | ${formatNumber(row.usage?.cachedInputTokens)} | ${formatNumber(row.usage?.uncachedInputTokens)} | ${formatNumber(row.usage?.outputTokens)} | ${formatNumber(row.commands?.browserToolTurns)} | ${formatNumber(row.commands?.browserInvocations ?? row.commands?.browser)} | ${formatNumber(row.commands?.failedBrowserInvocations ?? row.commands?.failed)} |`);
  }

  lines.push('', '## Slowest browser commands', '');
  for (const driver of Object.keys(slowest).sort()) {
    lines.push(`### ${driver}`, '', '| Run | Duration | Output | Command |', '| --- | ---: | ---: | --- |');
    for (const command of slowest[driver]) {
      const concise = command.command
        .replace(/\/(?:private\/)?var\/folders\/[^ ]+\/T\/llm-perf-[^/ ]+\/workspace/g, '<trial-workspace>')
        .replace(/\/tmp\/llm-perf-[^/ ]+\/workspace/g, '<trial-workspace>')
        .replaceAll('|', '\\|').replace(/\s+/g, ' ').slice(0, 180);
      lines.push(`| ${command.runId} | ${formatSeconds(command.durationMs)} | ${formatNumber(command.outputBytes)} B | \`${concise}\` |`);
    }
    lines.push('');
  }

  lines.push('## Interpretation notes', '',
    '- `inputTokens` includes cached input tokens. `uncachedInputTokens` is also retained in `aggregate.json` and every run’s `metrics.json`.',
    '- Browser tool turns count agent shell/tool calls containing at least one driver invocation. CLI calls count the individual driver commands inside them; failed CLI calls include structured `{ "ok": false }` results and embedded non-zero shell completion codes.',
    '- Copilot AI Credits use the CLI\'s cumulative `session.usage_checkpoint.data.totalNanoAiu` value when present, with per-call `assistant.usage` as a fallback; 1,000,000,000 nano-AIU equals 1 AI Credit.',
    '- Copilot CLI 1.0.76 programmatic JSON exposes output tokens but not input/cache token totals. Those input fields remain `n/a` rather than being estimated.',
    '- Claude reported cost is the CLI\'s `total_cost_usd` accounting value. With subscription authentication, it is useful for relative comparison but is not necessarily an additional amount billed to the user.',
    '- Every trial receives a fresh temporary `HOME` and agent config root. Only authentication is handed into that home: an isolated Codex auth link, a Claude OAuth/API token, or a Copilot process token.',
    '- Each agent also starts a non-resumed programmatic session. Codex uses `--ephemeral`; Claude uses `--no-session-persistence`; Copilot receives a fresh `COPILOT_HOME` and disables remote session import/export.',
    '- Server-side prompt caching cannot currently be disabled by this harness. Alternating driver order and reporting cached tokens makes its effect visible.',
    '- Browser binaries and driver downloads are warmed before measurement. CraftDriver receives the shared binary-only driver cache in offline mode; agent homes, CraftDriver project/session state, the LLM thread, workspace, browser process, browser profile, and driver daemon remain fresh per trial.',
    '- Vibium uses its officially managed Chrome for Testing. The manifest records that version separately because it can differ from the installed Google Chrome used by Playwright and CraftDriver.',
    '- Use the local fixture for primary latency claims. Live-site batches include uncontrolled network and markup variance.',
    '');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const batchId = options.batch ?? await latestBatch();
  if (!/^[a-zA-Z0-9._-]+$/.test(batchId)) throw new Error('Unsafe batch id');
  const batchDir = path.join(root, 'results', batchId);
  const manifest = JSON.parse(await fs.readFile(path.join(batchDir, 'manifest.json'), 'utf8'));
  const rows = manifest.runs;
  const grouped = {};
  for (const row of rows) (grouped[row.driver] ??= []).push(row);
  const aggregates = Object.fromEntries(Object.entries(grouped).map(([driver, driverRows]) => [driver, aggregateDriver(driverRows)]));
  const deltas = comparisons(aggregates);
  const slowest = await slowestCommands(batchDir, rows);
  const aggregate = {
    batchId,
    task: manifest.task.id,
    aggregates,
    relativeToPlaywright: deltas,
    craftdriverRelativeToPlaywright: deltas.craftdriver ?? null,
    vibiumRelativeToPlaywright: deltas.vibium ?? null,
  };
  await fs.writeFile(path.join(batchDir, 'aggregate.json'), `${JSON.stringify(aggregate, null, 2)}\n`);

  const headers = ['runId', 'agent', 'driver', 'successful', 'wallTimeMs', 'agentApiDurationMs', 'agentReportedSessionDurationMs', 'aiCredits', 'aiCreditNanoUnits', 'premiumRequests', 'costUsd', 'inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'uncachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens', 'agentToolTurns', 'browserToolTurns', 'browserCalls', 'browserCommandDurationMs', 'browserOutputBytes', 'failedCommands'];
  const csvRows = rows.map(row => [
    row.runId,
    row.agent ?? manifest.options.agent,
    row.driver,
    row.successful,
    row.timing?.wallTimeMs,
    row.timing?.agentApiDurationMs,
    row.timing?.agentReportedSessionDurationMs,
    row.usage?.aiCredits,
    row.usage?.aiCreditNanoUnits,
    row.usage?.premiumRequests,
    row.usage?.costUsd,
    row.usage?.inputTokens,
    row.usage?.cachedInputTokens,
    row.usage?.cacheCreationInputTokens,
    row.usage?.uncachedInputTokens,
    row.usage?.outputTokens,
    row.usage?.reasoningOutputTokens,
    row.usage?.totalTokens,
    row.commands?.agentToolTurns ?? row.commands?.total,
    row.commands?.browserToolTurns,
    row.commands?.browserInvocations ?? row.commands?.browser,
    row.timing?.browserCommandDurationMs,
    row.commands?.browserOutputBytes,
    row.commands?.failedBrowserInvocations ?? row.commands?.failed,
  ]);
  await fs.writeFile(path.join(batchDir, 'runs.csv'), `${[headers, ...csvRows].map(row => row.map(csvCell).join(',')).join('\n')}\n`);

  const markdown = buildMarkdown({ batchId, manifest, rows, aggregates, deltas, slowest });
  await fs.writeFile(path.join(batchDir, 'report.md'), `${markdown.trimEnd()}\n`);
  console.log(markdown);
  console.log(`\nReport written to ${path.join(batchDir, 'report.md')}`);
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
