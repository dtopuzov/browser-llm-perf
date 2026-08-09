export function craftdriverRefFromSnapshot(stdout, role, name) {
  for (const line of stdout.trim().split(/\r?\n/).reverse()) {
    try {
      const payload = JSON.parse(line);
      const snapshotLines = payload?.result?.lines ?? [];
      const match = snapshotLines
        .find((value) => value.includes(`: ${role} "${name}`))
        ?.match(/^\s*(e\d+):/);
      if (match) return match[1];
    } catch {
      // Keep scanning JSONL and ignore daemon lifecycle text.
    }
  }
  return null;
}
