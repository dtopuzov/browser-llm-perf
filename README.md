# Browser LLM Perf

Which browser CLI helps an AI agent finish real browser work faster and with
fewer tokens?

This repository compares [CraftDriver](https://github.com/dtopuzov/craftdriver)
and [Playwright CLI](https://playwright.dev/) in isolated end-to-end runs with
Codex CLI and Claude Code.

**CraftDriver leads with both agents.** Each driver finished 12/12 trials
correctly, so the differences are efficiency, not capability.

## Results

Three runs per driver, per scenario, per agent, against CraftDriver `2ae939d`.
Wall time is the mean of the two scenario medians; token and cost figures use
the same aggregation. Diff is CraftDriver relative to Playwright, so negative
is better for CraftDriver.

The two CLIs expose different usage fields: Codex reports tokens but no cost,
Claude Code reports both. Missing values are never estimated, so each table
lists what its agent actually reports.

Both tables also carry **browser output**: the bytes each driver returned into
the conversation across a run, counted by the harness from the agent's own tool
results. That is the input the driver actually controls — everything else in the
prompt is the agent's own scaffolding. Each CLI surfaces tool results in its own
shape, so compare byte counts down a column, within one agent, not across the
two tables.

### Codex CLI `gpt-5.6-luna`, reasoning low

| Metric | CraftDriver | Playwright | Diff |
| --- | ---: | ---: | ---: |
| Wall time | **45.05s** | 64.98s | **-30.7%** |
| Wall time — Wikipedia | **49.44s** | 69.83s | **-29.2%** |
| Wall time — GitHub | **40.66s** | 60.13s | **-32.4%** |
| Browser-command time | **15.77s** | 23.33s | **-32.4%** |
| Browser output | **4,646 B** | 64,066 B | **-92.7%** |
| Input tokens | **79,839** | 158,688 | **-49.7%** |
| Output tokens | **689** | 999 | **-31.0%** |
| Total tokens | **80,528** | 159,686 | **-49.6%** |

### Claude Code `claude-haiku-4-5`, reasoning low

| Metric | CraftDriver | Playwright | Diff |
| --- | ---: | ---: | ---: |
| Wall time | **42.34s** | 58.32s | **-27.4%** |
| Wall time — Wikipedia | **44.70s** | 62.88s | **-28.9%** |
| Wall time — GitHub | **39.97s** | 53.77s | **-25.7%** |
| Browser-command time | **14.14s** | 22.81s | **-38.0%** |
| Browser output | **4,641 B** | 6,359 B | **-27.0%** |
| Input tokens | **233,495** | 369,849 | **-36.9%** |
| Output tokens | **1,621** | 1,929 | **-16.0%** |
| Total tokens | **235,121** | 371,681 | **-36.7%** |
| Cost | **$0.0554** | $0.0764 | **-27.5%** |

Input tokens are cumulative across turns, so a large early snapshot is re-sent
on every later turn. That is why a 1.7 KB difference in returned bytes lands as
a 136,000-token difference in billed input: with Codex the effect is larger
still, where Playwright's 122,912 B Wikipedia snapshot drives its input tokens
to twice CraftDriver's.

## Distribution

In three of the four agent/scenario pairs the distributions do not overlap at
all — CraftDriver's slowest run beat Playwright's fastest:

| Agent | Scenario | CraftDriver runs (s) | Playwright runs (s) |
| --- | --- | --- | --- |
| Codex | GitHub | 36.08 / 40.66 / 54.32 | 56.22 / 60.13 / 60.49 |
| Claude | Wikipedia | 40.22 / 44.70 / 46.56 | 58.26 / 62.88 / 71.62 |
| Claude | GitHub | 39.15 / 39.97 / 43.69 | 51.45 / 53.77 / 54.66 |

Codex on Wikipedia is the exception: CraftDriver ran 42.86 / 49.44 / 57.80
against Playwright's 52.51 / 69.83 / 73.10, so the slowest CraftDriver run lost
to the fastest Playwright run.

## Reliability

Neither driver made a failed CLI call in any of the 24 trials.

## Method

The suite contains two live E2E scenarios:

- Wikipedia: search for Telerik and verify the destination article.
- GitHub: submit synthetic invalid credentials and verify the authentication
  error.

Every measured trial starts a fresh agent session, home/config, workspace,
browser profile, browser process, and driver process. Trials run sequentially
with alternating driver order. Correctness requires the expected structured
answer and a final screenshot. The headline gives both scenarios equal weight
by averaging their medians.

Both drivers use installed Google Chrome 150.0.7871.187. Before preflight, the
harness resolves the exact ChromeDriver CraftDriver will launch, records both
executable paths and versions, and aborts on a Chrome/ChromeDriver major
mismatch. Browser binaries are warmed before measurement; browser state and
agent history are not reused. Raw streams, command logs, timings, and
screenshots remain local, while curated reports and machine-readable aggregates
are published.

All 24 trials passed their structured-answer checks and produced a final
screenshot. Live sites and three-run samples make the percentages directional
rather than definitive.

## Run it

Requirements: Node.js 20+, Google Chrome, authenticated agent CLIs, and a
CraftDriver checkout at `../craftdriver`.

```bash
npm ci
npm run skills:install

npm run bench:e2e -- \
  --agent codex \
  --model gpt-5.6-luna \
  --reasoning low \
  --driver playwright,craftdriver \
  --runs 3

npm run bench:e2e -- \
  --agent claude \
  --model claude-haiku-4-5-20251001 \
  --reasoning low \
  --driver playwright,craftdriver \
  --runs 3
```

For driver-only measurements without an LLM:

```bash
npm run bench:cli -- --runs 3
```

## More evidence

- [Full analysis](ANALYSIS.md)
- [Codex suite report](results/codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x/report.md)
  · [aggregate JSON](results/codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x/aggregate.json)
- [Claude suite report](results/claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x/report.md)
  · [aggregate JSON](results/claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x/aggregate.json)
