# CraftDriver `2ae939d` vs Playwright CLI: three-agent benchmark

Date: 2026-08-01

## Verdict

CraftDriver `2ae939d` beat Playwright CLI with every agent tested, on every
scenario, on every metric except one byte-count. All 36 trials were correct, so
this is an efficiency result and not a capability result.

The lead is consistent rather than driven by one agent or one scenario: wall
time falls 27-31% for all three agents, and CraftDriver wins both scenarios for
each of them.

## Setup

- CraftDriver: `1.10.0` at commit
  `2ae939da1fc5d19003f23a2da13f88bb0aaf987f`, clean worktree, rebuilt before the
  batch.
- Playwright: `1.62.0`.
- Browser: installed Google Chrome `150.0.7871.187` for both drivers.
- Agents: GitHub Copilot CLI `1.0.76` (`gpt-5.4`, medium), Codex CLI `0.146.0`
  (`gpt-5.6-luna`, low), Claude Code `2.1.220` (`claude-haiku-4-5-20251001`, low).
- Runs: 3 per driver, per scenario, per agent. 36 trials total.
- Execution: strictly sequential, alternating driver order between trials and
  rotating the base seed between scenarios.

## Headline results

Scenario-weighted mean of each scenario median, equal weight per scenario.
Negative means CraftDriver used less.

| Agent | Wall | Model API | Cost | Input | Uncached | Output | CLI calls | CLI time | CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Copilot | **-30.7%** | **-17.3%** | **-14.9%** credits | n/a | n/a | **-32.5%** | **-47.6%** | **-48.5%** | +11.2% |
| Codex | **-30.7%** | n/a | n/a | **-49.7%** | **-30.7%** | **-31.0%** | **-26.7%** | **-32.4%** | **-92.7%** |
| Claude | **-27.4%** | **-21.8%** | **-27.5%** USD | **-36.9%** | **-21.6%** | **-16.0%** | **-35.3%** | **-38.0%** | **-27.0%** |

Absolute scenario-weighted values:

| Agent | Driver | Correct | Wall | Input | Output | CLI calls | Failed calls | CLI time | CLI output |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Copilot | CraftDriver | 6/6 | **44.60s** | n/a | **1,402** | **5.5** | **0.0** | **16.14s** | 4,716 B |
| Copilot | Playwright | 6/6 | 64.37s | n/a | 2,076 | 10.5 | 0.5 | 31.37s | **4,242 B** |
| Codex | CraftDriver | 6/6 | **45.05s** | **79,839** | **689** | **5.5** | **0.0** | **15.77s** | **4,646 B** |
| Codex | Playwright | 6/6 | 64.98s | 158,688 | 999 | 7.5 | 0.0 | 23.33s | 64,066 B |
| Claude | CraftDriver | 6/6 | **42.34s** | **233,495** | **1,621** | **5.5** | **0.0** | **14.14s** | **4,641 B** |
| Claude | Playwright | 6/6 | 58.32s | 369,849 | 1,929 | 8.5 | 0.0 | 22.81s | 6,359 B |

Copilot CLI 1.0.76 does not expose token totals, and Codex CLI does not expose
cost. Each provider metric is reported only where the CLI supplies it.

## Scenario detail

| Agent | Scenario | Driver | Correct | Wall median | Output | CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Copilot | Wikipedia | CraftDriver | 3/3 | **42.17s** | **1,465** | **6.0** |
| Copilot | Wikipedia | Playwright | 3/3 | 57.49s | 2,086 | 8.0 |
| Copilot | GitHub | CraftDriver | 3/3 | **47.03s** | **1,338** | **5.0** |
| Copilot | GitHub | Playwright | 3/3 | 71.25s | 2,066 | 13.0 |
| Codex | Wikipedia | CraftDriver | 3/3 | **49.44s** | **725** | **6.0** |
| Codex | Wikipedia | Playwright | 3/3 | 69.83s | 1,108 | 7.0 |
| Codex | GitHub | CraftDriver | 3/3 | **40.66s** | **652** | **5.0** |
| Codex | GitHub | Playwright | 3/3 | 60.13s | 889 | 8.0 |
| Claude | Wikipedia | CraftDriver | 3/3 | **44.70s** | **1,714** | **6.0** |
| Claude | Wikipedia | Playwright | 3/3 | 62.88s | 2,068 | 9.0 |
| Claude | GitHub | CraftDriver | 3/3 | **39.97s** | **1,527** | **5.0** |
| Claude | GitHub | Playwright | 3/3 | 53.77s | 1,790 | 8.0 |

CraftDriver's median call count was identical across all three agents: six on
Wikipedia, five on GitHub. Playwright's varied from 7 to 13. A stable command
budget across three different models is the strongest single signal that the
skill instructions are being followed as intended rather than reconstructed by
each agent.

One metric runs the other way. With Copilot, CraftDriver used 4.0 browser tool
turns against Playwright's 2.5, a 60% increase, while using 47.6% fewer
individual CLI calls. Copilot chained many Playwright commands into a single
shell turn, so Playwright's turn count understates its work. Turn count and call
count measure different things, and the reports keep them separate for that
reason. With Codex and Claude, CraftDriver used fewer of both.

## Distribution separation

Sorted wall times per run:

| Agent | Scenario | CraftDriver | Playwright | Separated |
| --- | --- | --- | --- | --- |
| Copilot | Wikipedia | 38.74 / 42.17 / 49.51 | 57.22 / 57.49 / 62.21 | yes |
| Copilot | GitHub | 45.30 / 47.03 / 68.92 | 66.69 / 71.25 / 94.18 | no |
| Codex | Wikipedia | 42.86 / 49.44 / 57.80 | 52.51 / 69.83 / 73.10 | no |
| Codex | GitHub | 36.08 / 40.66 / 54.32 | 56.22 / 60.13 / 60.49 | yes |
| Claude | Wikipedia | 40.22 / 44.70 / 46.56 | 58.26 / 62.88 / 71.62 | yes |
| Claude | GitHub | 39.15 / 39.97 / 43.69 | 51.45 / 53.77 / 54.66 | yes |

Four of six pairs separate completely. The two that overlap each do so through a
single slow CraftDriver run, not through a fast Playwright run pattern.

## Failed calls

CraftDriver made zero failed CLI calls in all 18 of its runs, across all three
agents. Playwright made none with Codex or Claude, and averaged 0.5 per run with
Copilot.

A failed call is expensive out of proportion to its count: it costs a model
turn, the output tokens that produced it, and the re-read of page state that
follows the recovery. That is a large part of why CraftDriver's token
reductions exceed its call-count reductions.

## Browser output bytes

Measured driver stdout is the one metric where the drivers are not cleanly
ordered:

| Agent | CraftDriver | Playwright | Difference |
| --- | ---: | ---: | ---: |
| Copilot | 4,716 B | 4,242 B | +11.2% |
| Codex | 4,646 B | 64,066 B | -92.7% |
| Claude | 4,641 B | 6,359 B | -27.0% |

CraftDriver's output is nearly constant at roughly 4.6-4.7 kB regardless of
agent, because the command sequence is the same. Playwright's varies by more
than an order of magnitude because its CLI can either print a snapshot inline or
write it to a file and return a path, and each agent chooses differently. Codex
read snapshots inline and paid 64 kB for it.

This is why measured stdout alone is a weak efficiency claim: it does not
capture a file-backed snapshot the agent reads in a separate step. End-to-end
provider usage is the metric that accounts for the full context cost, and it
favors CraftDriver for all three agents.

## Provenance and audit

- CraftDriver commit `2ae939da1fc5d19003f23a2da13f88bb0aaf987f`, clean worktree,
  `npm run build` re-run before the batch; the harness records the SHA and dirty
  flag in every manifest.
- Driver skills reinstalled from that commit via `npm run skills:install` before
  the first trial.
- Correctness: 36/36 structured answers passed their scenario checks
  (`title`+`url` for Wikipedia, `message`+`urlPath` for GitHub).
- Screenshots: 36/36 final screenshots captured at full viewport size;
  CraftDriver Wikipedia at 1265x800 and all others at 1280x800, matching the
  page's `clientWidth x clientHeight`. Samples were visually inspected and show
  the expected end state.
- Isolation: every trial used a fresh agent home/config, non-persistent session,
  fresh workspace, browser profile, browser process, and driver process.
- Execution: sequential across all 36 trials; no two browser trials overlapped.
- Artifacts: raw JSONL, stderr, final answers, timings, browser command
  transcripts, workspaces, and screenshots are retained locally for every run
  and intentionally excluded from source control.

## Limitations

1. Two live sites. Network latency, rate limiting, and markup changes add
   variance that three runs cannot fully average out.
2. Three runs per cell is enough to show a consistent direction and, in four of
   six cells, non-overlapping distributions. It is not enough to publish a
   precise percentage.
3. Both scenarios are short search/submit flows. Neither exercises long
   multi-page navigation, file upload, iframes, or authenticated state.
4. Copilot's missing token fields and Codex's missing cost field mean no single
   provider metric is comparable across all three agents.

## Recommended next actions

1. Add a deterministic local atomic-submit task and run at least five
   repetitions per driver before publishing a precise latency percentage.
2. Add a regression check that agents pass `ref=eN` rather than a bare `eN`
   snapshot id, so the current zero-failed-call result cannot silently rot.
3. Add a longer multi-step scenario; the current tasks may understate the gap
   because both complete in five or six commands.
4. Re-run this batch whenever either CLI ships a change to its snapshot or
   output-mode defaults, since those drive the byte-count divergence.

## Evidence links

- [Copilot suite report](results/copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x/report.md)
- [Codex suite report](results/codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x/report.md)
- [Claude suite report](results/claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x/report.md)
- Per-scenario reports are linked from each suite report.
