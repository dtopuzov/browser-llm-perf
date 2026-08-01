import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metricKeys = [
  'wallTimeMs',
  'agentApiDurationMs',
  'costUsd',
  'aiCredits',
  'inputTokens',
  'cachedInputTokens',
  'cacheCreationInputTokens',
  'uncachedInputTokens',
  'outputTokens',
  'totalTokens',
  'browserToolTurns',
  'browserCalls',
  'failedBrowserInvocations',
  'browserCommandDurationMs',
  'browserOutputBytes',
];

function parseArgs(argv) {
  let batch;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--batch') batch = argv[++index];
    else if (argv[index] === '--help') {
      console.log('Usage: npm run report:suite -- --batch BATCH_ID');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!batch) throw new Error('--batch is required');
  if (!/^[a-zA-Z0-9._-]+$/.test(batch)) throw new Error('Unsafe batch id');
  return { batch };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatNumber(value, digits = 0) {
  return value == null ? 'n/a' : Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatSeconds(value) {
  return value == null ? 'n/a' : `${(value / 1000).toFixed(2)}s`;
}

function formatUsd(value) {
  return value == null ? 'n/a' : `$${Number(value).toFixed(4)}`;
}

function formatPercent(value) {
  return value == null ? 'n/a' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function driverLabel(driver) {
  if (driver === 'playwright') return 'Playwright';
  if (driver === 'craftdriver') return 'CraftDriver';
  if (driver === 'vibium') return 'Vibium';
  return driver;
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

function scenarioMetric(driverAggregate, key) {
  const value = driverAggregate?.[key]?.median;
  return Number.isFinite(value) ? value : null;
}

function aggregateDriver(rows, expectedScenarios) {
  const aggregate = {
    scenarioCount: expectedScenarios,
    completeScenarios: rows.length,
    runs: rows.reduce((sum, row) => sum + row.runs, 0),
    successful: rows.reduce((sum, row) => sum + row.successful, 0),
  };
  aggregate.successRate = aggregate.runs ? aggregate.successful / aggregate.runs : 0;
  for (const key of metricKeys) {
    const available = rows.filter(row => Number.isFinite(row.metrics[key]));
    aggregate[key] = {
      count: available.length,
      mean: mean(available.map(row => row.metrics[key])),
      scenarioMedians: Object.fromEntries(available.map(row => [row.taskId, row.metrics[key]])),
    };
  }
  return aggregate;
}

function comparisons(aggregates) {
  const playwright = aggregates.playwright;
  if (!playwright) return {};
  const delta = (value, base) => Number.isFinite(value) && Number.isFinite(base) && base !== 0
    ? ((value / base) - 1) * 100
    : null;
  return Object.fromEntries(Object.entries(aggregates)
    .filter(([driver]) => driver !== 'playwright')
    .map(([driver, aggregate]) => [driver, Object.fromEntries(metricKeys.map(key => [
      key,
      delta(aggregate[key].mean, playwright[key].mean),
    ]))]));
}

function provenanceSnapshot(childManifest) {
  const drivers = childManifest.options?.drivers ?? [];
  const versions = childManifest.versions ?? {};
  const snapshot = {
    agent: childManifest.options?.agent,
    agentVersion: versions.agent,
    model: childManifest.options?.model,
    reasoning: childManifest.options?.reasoning,
    drivers,
    runs: childManifest.options?.runs,
    headed: childManifest.options?.headed,
    yolo: childManifest.options?.yolo,
  };
  if (drivers.includes('playwright')) {
    snapshot.playwright = versions.playwright;
    snapshot.playwrightChrome = versions.chrome?.numericVersion ?? versions.chrome?.version;
  }
  if (drivers.includes('craftdriver')) {
    snapshot.craftdriver = versions.craftdriver;
    snapshot.craftdriverGitSha = versions.craftdriverGitSha;
    snapshot.craftdriverGitDirty = versions.craftdriverGitDirty;
    snapshot.craftdriverWorktreeDiffSha256 = versions.craftdriverWorktreeDiffSha256;
    snapshot.craftdriverSkillManifest = versions.craftdriverSkillManifest;
    snapshot.craftdriverChrome = versions.chrome?.numericVersion ?? versions.chrome?.version;
  }
  if (drivers.includes('vibium')) {
    snapshot.vibium = versions.vibium;
    snapshot.vibiumSkillSha256 = versions.vibiumSkill?.sha256;
    snapshot.vibiumChrome = versions.vibiumBrowser?.chrome?.version;
    snapshot.vibiumChromeDriver = versions.vibiumBrowser?.chromedriver?.version;
  }
  return snapshot;
}

function compareProvenance(rows) {
  if (!rows.length) return { consistent: false, baselineTaskId: null, snapshots: {}, mismatches: ['No scenario provenance was available'] };
  const snapshots = Object.fromEntries(rows.map(row => [row.taskId, provenanceSnapshot(row.manifest)]));
  const [baseline, ...rest] = rows;
  const expected = snapshots[baseline.taskId];
  const mismatches = rest.flatMap(row => {
    const actual = snapshots[row.taskId];
    const changed = [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
      .filter(key => JSON.stringify(actual[key]) !== JSON.stringify(expected[key]));
    return changed.length ? [`${row.taskId} differs from ${baseline.taskId}: ${changed.join(', ')}`] : [];
  });
  return { consistent: mismatches.length === 0, baselineTaskId: baseline.taskId, snapshots, mismatches };
}

function buildMarkdown({ batchId, manifest, scenarioRows, aggregates, relative, provenance }) {
  const scenarioLinks = Object.fromEntries(manifest.scenarioBatches.map(row => [row.taskId, `../${row.batchId}/report.md`]));
  const lines = [
    `# E2E benchmark suite: ${batchId}`,
    '',
    `- Suite: \`${manifest.suite.id}\``,
    `- Agent: \`${manifest.options.agent}\``,
    `- Model: \`${manifest.options.model}\``,
    `- Reasoning: \`${manifest.options.reasoning}\``,
    `- Scenarios: ${manifest.suite.tasks.map(task => `\`${task}\``).join(', ')}`,
    `- Runs: ${manifest.options.runs} per driver, per scenario`,
    '- Execution: sequential, with the base driver-order seed rotated between scenarios',
    '- Headline aggregation: arithmetic mean of each scenario median, with equal weight per scenario',
    `- Provenance: ${provenance.consistent ? 'consistent across scenarios' : '**INVALID: agent, model, driver, or browser provenance changed between scenarios**'}`,
    '',
    ...(!provenance.consistent ? [
      '## Provenance warning',
      '',
      'Do not use this suite aggregate for a comparison. At least one scenario used different benchmark provenance:',
      '',
      ...provenance.mismatches.map(value => `- ${value}`),
      '',
      'The child artifacts remain available for diagnosis. Rerun the suite after all selected driver checkouts and browser installations are stable.',
      '',
    ] : []),
    '## Scenario-weighted results',
    '',
    '| Driver | Scenarios | Correct runs | Avg wall | Avg model API | Avg cost | Avg AI Credits | Avg input | Avg uncached | Avg output | Avg browser tool turns | Avg CLI calls | Failed CLI calls | Avg CLI time | Avg CLI output |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const [driver, value] of Object.entries(aggregates).sort()) {
    lines.push(`| ${driverLabel(driver)} | ${value.completeScenarios}/${value.scenarioCount} | ${value.successful}/${value.runs} | ${formatSeconds(value.wallTimeMs.mean)} | ${formatSeconds(value.agentApiDurationMs.mean)} | ${formatUsd(value.costUsd.mean)} | ${formatNumber(value.aiCredits.mean, 4)} | ${formatNumber(value.inputTokens.mean)} | ${formatNumber(value.uncachedInputTokens.mean)} | ${formatNumber(value.outputTokens.mean)} | ${formatNumber(value.browserToolTurns.mean, 1)} | ${formatNumber(value.browserCalls.mean, 1)} | ${formatNumber(value.failedBrowserInvocations.mean, 1)} | ${formatSeconds(value.browserCommandDurationMs.mean)} | ${formatNumber(value.browserOutputBytes.mean)} B |`);
  }

  if (Object.keys(relative).length) {
    lines.push('', '## Relative to Playwright', '', 'Positive values mean the driver used more time, tokens, cost, calls, or output than Playwright.', '',
      '| Driver | Wall | Model API | Cost | AI Credits | Input | Uncached | Output | CLI calls | CLI time | CLI output |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [driver, value] of Object.entries(relative).sort()) {
      lines.push(`| ${driverLabel(driver)} | ${formatPercent(value.wallTimeMs)} | ${formatPercent(value.agentApiDurationMs)} | ${formatPercent(value.costUsd)} | ${formatPercent(value.aiCredits)} | ${formatPercent(value.inputTokens)} | ${formatPercent(value.uncachedInputTokens)} | ${formatPercent(value.outputTokens)} | ${formatPercent(value.browserCalls)} | ${formatPercent(value.browserCommandDurationMs)} | ${formatPercent(value.browserOutputBytes)} |`);
    }
  }

  lines.push('', '## Scenario breakdown', '',
    '| Scenario | Driver | Correct runs | Wall median | Cost median | Input median | Output median | CLI calls median |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of scenarioRows) {
    const link = scenarioLinks[row.taskId];
    lines.push(`| [${row.taskId}](${link}) | ${driverLabel(row.driver)} | ${row.successful}/${row.runs} | ${formatSeconds(row.metrics.wallTimeMs)} | ${formatUsd(row.metrics.costUsd)} | ${formatNumber(row.metrics.inputTokens)} | ${formatNumber(row.metrics.outputTokens)} | ${formatNumber(row.metrics.browserCalls, 1)} |`);
  }

  lines.push('', '## Interpretation notes', '',
    '- The headline first computes each driver metric median within each scenario, then averages those medians. Every scenario therefore has equal influence even if run counts differ later.',
    '- A missing provider metric is excluded only from that metric’s mean. `aggregate.json` records the contributing scenario count and scenario medians; unavailable values are never estimated.',
    '- Correctness remains an auditable successful-run count rather than an averaged score. A run requires the expected structured answer and a final screenshot.',
    '- These are live-site realism checks. Network latency, rate limiting, authentication defenses, and markup changes add uncontrolled variance; use deterministic local tasks for primary latency claims.',
    '- Each linked scenario report preserves its run-level metrics, raw agent streams, stderr, command transcripts, screenshots, workspaces, browser versions, and preflight evidence.',
    '');
  return lines.join('\n');
}

async function main() {
  const { batch: batchId } = parseArgs(process.argv.slice(2));
  const batchDir = path.join(root, 'results', batchId);
  const manifest = await readJson(path.join(batchDir, 'manifest.json'));
  if (manifest.type !== 'agent-suite' || !Array.isArray(manifest.scenarioBatches)) {
    throw new Error(`${batchId} is not an agent suite batch`);
  }

  const scenarioRows = [];
  const childProvenance = [];
  const missingBatches = [];
  const recordedTaskIds = manifest.scenarioBatches.map(row => row.taskId);
  for (const taskId of manifest.suite.tasks) {
    if (!recordedTaskIds.includes(taskId)) missingBatches.push({ taskId, batchId: null, error: 'No scenario batch was recorded' });
  }
  for (const taskId of new Set(recordedTaskIds)) {
    if (recordedTaskIds.filter(value => value === taskId).length > 1) {
      missingBatches.push({ taskId, batchId: null, error: 'Multiple scenario batches were recorded' });
    }
  }
  for (const scenario of manifest.scenarioBatches) {
    try {
      const childDir = path.join(root, 'results', scenario.batchId);
      const [childManifest, childAggregate] = await Promise.all([
        readJson(path.join(childDir, 'manifest.json')),
        readJson(path.join(childDir, 'aggregate.json')),
      ]);
      if (childManifest.task?.id !== scenario.taskId || childAggregate.task !== scenario.taskId) {
        throw new Error(`Scenario task mismatch in ${scenario.batchId}`);
      }
      childProvenance.push({ taskId: scenario.taskId, manifest: childManifest });
      for (const [driver, driverAggregate] of Object.entries(childAggregate.aggregates ?? {})) {
        scenarioRows.push({
          taskId: scenario.taskId,
          batchId: scenario.batchId,
          driver,
          runs: driverAggregate.runs,
          successful: driverAggregate.successful,
          agent: childManifest.options?.agent,
          model: childManifest.options?.model,
          metrics: Object.fromEntries(metricKeys.map(key => [key, scenarioMetric(driverAggregate, key)])),
        });
      }
    } catch (error) {
      missingBatches.push({ taskId: scenario.taskId, batchId: scenario.batchId, error: error.message });
    }
  }

  const expectedDrivers = manifest.options.drivers.split(',');
  for (const taskId of manifest.suite.tasks) {
    for (const driver of expectedDrivers) {
      if (!scenarioRows.some(row => row.taskId === taskId && row.driver === driver)) {
        missingBatches.push({ taskId, batchId: null, driver, error: 'Driver aggregate is missing' });
      }
    }
  }

  const grouped = {};
  for (const row of scenarioRows) (grouped[row.driver] ??= []).push(row);
  const aggregates = Object.fromEntries(Object.entries(grouped).map(([driver, rows]) => [
    driver,
    aggregateDriver(rows, manifest.suite.tasks.length),
  ]));
  const relativeToPlaywright = comparisons(aggregates);
  const provenance = compareProvenance(childProvenance);
  const aggregate = {
    type: 'agent-suite-aggregate',
    batchId,
    suite: manifest.suite.id,
    tasks: manifest.suite.tasks,
    aggregation: manifest.aggregation,
    provenance,
    missingBatches,
    scenarioRows,
    aggregates,
    relativeToPlaywright,
  };
  await fs.writeFile(path.join(batchDir, 'aggregate.json'), `${JSON.stringify(aggregate, null, 2)}\n`);

  const headers = [
    'taskId', 'batchId', 'driver', 'successful', 'runs',
    ...metricKeys.map(key => `${key}Median`),
  ];
  const rows = scenarioRows.map(row => [
    row.taskId, row.batchId, row.driver, row.successful, row.runs,
    ...metricKeys.map(key => row.metrics[key]),
  ]);
  await fs.writeFile(path.join(batchDir, 'scenarios.csv'), `${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}\n`);

  const markdown = buildMarkdown({ batchId, manifest, scenarioRows, aggregates, relative: relativeToPlaywright, provenance });
  await fs.writeFile(path.join(batchDir, 'report.md'), `${markdown.trimEnd()}\n`);
  console.log(markdown);
  console.log(`\nSuite report written to ${path.join(batchDir, 'report.md')}`);
  if (missingBatches.length) {
    console.error(`Missing or incomplete scenario batches: ${missingBatches.map(row => row.taskId).join(', ')}`);
    process.exitCode = 1;
  }
  if (!provenance.consistent) {
    console.error(`Inconsistent suite provenance: ${provenance.mismatches.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
