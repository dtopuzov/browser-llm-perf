import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCommandCompletion } from './command-metrics.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const batchIndex = process.argv.indexOf('--batch');
const batchId = batchIndex >= 0 ? process.argv[batchIndex + 1] : null;
if (!batchId || !/^[a-zA-Z0-9._-]+$/.test(batchId)) {
  throw new Error('Usage: node scripts/reprocess-copilot-usage.mjs --batch BATCH_ID');
}

const batchDir = path.join(root, 'results', batchId);
const manifestPath = path.join(batchDir, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (manifest.options?.agent !== 'copilot') throw new Error(`${batchId} is not a Copilot batch`);

for (const row of manifest.runs) {
  if (!row.runId) continue;
  const runDir = path.join(batchDir, 'runs', row.runId);
  const events = (await fs.readFile(path.join(runDir, 'events.jsonl'), 'utf8'))
    .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const completedTools = new Map(events
    .filter(event => event.type === 'tool.execution_complete' && event.data?.toolCallId)
    .map(event => [event.data.toolCallId, event]));
  let outputTokens = 0;
  let outputObserved = false;
  let nanoUnits = 0;
  let creditsObserved = false;
  let premiumRequests = 0;
  let premiumObserved = false;
  let apiDurationMs = null;
  let sessionDurationMs = null;

  for (const event of events) {
    if (event.type === 'assistant.message' && Number.isFinite(event.data?.outputTokens)) {
      outputTokens += event.data.outputTokens;
      outputObserved = true;
    }
    if (event.type === 'session.usage_checkpoint') {
      if (Number.isFinite(event.data?.totalNanoAiu)) {
        nanoUnits = Math.max(nanoUnits, event.data.totalNanoAiu);
        creditsObserved = true;
      }
      if (Number.isFinite(event.data?.totalPremiumRequests)) {
        premiumRequests = Math.max(premiumRequests, event.data.totalPremiumRequests);
        premiumObserved = true;
      }
    }
    if (event.type === 'result') {
      if (Number.isFinite(event.usage?.premiumRequests)) {
        premiumRequests = Math.max(premiumRequests, event.usage.premiumRequests);
        premiumObserved = true;
      }
      if (Number.isFinite(event.usage?.totalApiDurationMs)) apiDurationMs = event.usage.totalApiDurationMs;
      if (Number.isFinite(event.usage?.sessionDurationMs)) sessionDurationMs = event.usage.sessionDurationMs;
    }
  }

  const usage = {
    ...row.usage,
    inputTokens: null,
    cachedInputTokens: null,
    cacheCreationInputTokens: null,
    uncachedInputTokens: null,
    outputTokens: outputObserved ? outputTokens : null,
    reasoningOutputTokens: null,
    totalTokens: null,
    aiCreditNanoUnits: creditsObserved ? nanoUnits : null,
    aiCredits: creditsObserved ? nanoUnits / 1_000_000_000 : null,
    premiumRequests: premiumObserved ? premiumRequests : null,
  };
  const timing = {
    ...row.timing,
    agentApiDurationMs: apiDurationMs,
    agentReportedSessionDurationMs: sessionDurationMs,
  };
  const commandsPath = path.join(runDir, 'commands.json');
  const commands = JSON.parse(await fs.readFile(commandsPath, 'utf8'));
  for (const command of commands) {
    const value = completedTools.get(command.id)?.data?.result;
    let output = '';
    if (typeof value === 'string') output = value;
    else if (typeof value?.content === 'string') output = value.content;
    else if (Array.isArray(value?.content)) {
      output = value.content.map(item => item?.text ?? item?.content ?? '').filter(Boolean).join('\n');
    } else if (value) {
      try { output = JSON.stringify(value); } catch { output = String(value); }
    }
    command.output = output;
    command.outputBytes = Buffer.byteLength(output);
  }
  const classifiedCommands = commands.map(classifyCommandCompletion);
  const browserCommands = classifiedCommands.filter(command => command.browserCommand);
  const commandSummary = {
    ...row.commands,
    agentToolTurns: classifiedCommands.length,
    browserToolTurns: browserCommands.length,
    browserInvocations: browserCommands.reduce((sum, command) => sum + (command.driverCalls ?? 1), 0),
    failedToolTurns: classifiedCommands.filter(command => command.failed).length,
    failedBrowserInvocations: browserCommands.reduce((sum, command) => sum + command.failedInvocations, 0),
    total: classifiedCommands.length,
    browser: browserCommands.reduce((sum, command) => sum + (command.driverCalls ?? 1), 0),
    failed: classifiedCommands.reduce((sum, command) => sum + command.failedInvocations, 0),
    browserOutputBytes: browserCommands
      .reduce((sum, command) => sum + command.outputBytes, 0),
    allOutputBytes: classifiedCommands.reduce((sum, command) => sum + command.outputBytes, 0),
  };
  Object.assign(row, { usage, timing, commands: commandSummary });
  const metricsPath = path.join(runDir, 'metrics.json');
  const metrics = JSON.parse(await fs.readFile(metricsPath, 'utf8'));
  Object.assign(metrics, { usage, timing, commands: commandSummary });
  await fs.writeFile(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  await fs.writeFile(commandsPath, `${JSON.stringify(classifiedCommands, null, 2)}\n`);
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Reprocessed ${manifest.runs.length} Copilot runs in ${batchId}`);
