function finiteExitCode(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

/** Extract a shell completion code even when an agent nests it in tool-result content. */
export function shellExitCodeFromEvent(event) {
  const direct = [event?.item?.exit_code, event?.item?.exitCode, event?.data?.exit_code, event?.data?.exitCode, event?.exit_code, event?.exitCode, event?.tool_use_result?.exit_code, event?.tool_use_result?.exitCode].map(finiteExitCode).find(value => value !== null);
  if (direct !== undefined) return direct;

  const contents = event?.data?.result?.contents ?? event?.result?.contents ?? [];
  if (Array.isArray(contents)) {
    for (const item of [...contents].reverse()) {
      if (item?.type !== 'shell_exit') continue;
      const code = finiteExitCode(item.exitCode ?? item.exit_code);
      if (code !== null) return code;
    }
  }
  return null;
}

function containsOkFalse(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  if (value.ok === false) return true;
  if (Array.isArray(value)) return value.some(item => containsOkFalse(item, seen));
  return Object.values(value).some(item => containsOkFalse(item, seen));
}

/** Count structured CLI responses which explicitly report `{ "ok": false }`. */
export function structuredFailureCount(output) {
  if (typeof output !== 'string' || !output) return 0;
  let failures = 0;
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) continue;
    try {
      if (containsOkFalse(JSON.parse(trimmed))) failures += 1;
    } catch {
      // Pretty/non-JSON command output is accounted for by its shell code.
    }
  }
  return failures;
}

/** Count explicit Playwright CLI error records even when the CLI exits zero. */
export function playwrightFailureCount(output) {
  if (typeof output !== 'string' || !output) return 0;
  return [...output.matchAll(/^### Error\s*$/gm)].length;
}

function exitCodeFromOutput(output) {
  if (typeof output !== 'string') return null;
  const matches = [...output.matchAll(/<shellId:[^>]*\bexit code (-?\d+)>/g)];
  return matches.length ? finiteExitCode(matches.at(-1)[1]) : null;
}

/** Add failure facts to one agent shell/tool turn without losing its raw fields. */
export function classifyCommandCompletion(command) {
  const exitCode = finiteExitCode(command.exitCode) ?? exitCodeFromOutput(command.output);
  const structuredFailures = structuredFailureCount(command.output);
  const playwrightFailures = playwrightFailureCount(command.output);
  const shellFailed = command.status === 'failed' || (exitCode !== null && exitCode !== 0);
  const explicitFailures = structuredFailures + playwrightFailures;
  const failedInvocations = Math.max(explicitFailures, shellFailed ? 1 : 0);
  return {
    ...command,
    exitCode,
    structuredFailures,
    playwrightFailures,
    failedInvocations,
    failed: failedInvocations > 0,
  };
}
