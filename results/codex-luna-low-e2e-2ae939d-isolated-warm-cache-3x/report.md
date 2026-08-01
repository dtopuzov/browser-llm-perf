# E2E benchmark suite: codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x

- Suite: `e2e`
- Agent: `codex`
- Model: `gpt-5.6-luna`
- Reasoning: `low`
- Scenarios: `wikipedia-telerik`, `github-login-error`
- Runs: 3 per driver, per scenario
- Execution: sequential, with the base driver-order seed rotated between scenarios
- Headline aggregation: arithmetic mean of each scenario median, with equal weight per scenario
- Provenance: consistent across scenarios

## Scenario-weighted results

| Driver | Scenarios | Correct runs | Avg wall | Avg model API | Avg cost | Avg AI Credits | Avg input | Avg uncached | Avg output | Avg browser tool turns | Avg CLI calls | Failed CLI calls | Avg CLI time | Avg CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | 2/2 | 6/6 | 45.05s | n/a | n/a | n/a | 79,839 | 25,055 | 689 | 3.5 | 5.5 | 0.0 | 15.77s | 4,646 B |
| Playwright | 2/2 | 6/6 | 64.98s | n/a | n/a | n/a | 158,688 | 36,171 | 999 | 6.0 | 7.5 | 0.0 | 23.33s | 64,066 B |

## Relative to Playwright

Positive values mean the driver used more time, tokens, cost, calls, or output than Playwright.

| Driver | Wall | Model API | Cost | AI Credits | Input | Uncached | Output | CLI calls | CLI time | CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | -30.7% | n/a | n/a | n/a | -49.7% | -30.7% | -31.0% | -26.7% | -32.4% | -92.7% |

## Scenario breakdown

| Scenario | Driver | Correct runs | Wall median | Cost median | Input median | Output median | CLI calls median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [wikipedia-telerik](../codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | Playwright | 3/3 | 69.83s | n/a | 211,129 | 1,108 | 7.0 |
| [wikipedia-telerik](../codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | CraftDriver | 3/3 | 49.44s | n/a | 88,868 | 725 | 6.0 |
| [github-login-error](../codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | CraftDriver | 3/3 | 40.66s | n/a | 70,810 | 652 | 5.0 |
| [github-login-error](../codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | Playwright | 3/3 | 60.13s | n/a | 106,246 | 889 | 8.0 |

## Interpretation notes

- The headline first computes each driver metric median within each scenario, then averages those medians. Every scenario therefore has equal influence even if run counts differ later.
- A missing provider metric is excluded only from that metric’s mean. `aggregate.json` records the contributing scenario count and scenario medians; unavailable values are never estimated.
- Correctness remains an auditable successful-run count rather than an averaged score. A run requires the expected structured answer and a final screenshot.
- These are live-site realism checks. Network latency, rate limiting, authentication defenses, and markup changes add uncontrolled variance; use deterministic local tasks for primary latency claims.
- Each linked scenario report preserves its run-level metrics, raw agent streams, stderr, command transcripts, screenshots, workspaces, browser versions, and preflight evidence.
