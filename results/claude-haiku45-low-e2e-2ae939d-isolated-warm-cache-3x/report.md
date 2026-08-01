# E2E benchmark suite: claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x

- Suite: `e2e`
- Agent: `claude`
- Model: `claude-haiku-4-5-20251001`
- Reasoning: `low`
- Scenarios: `wikipedia-telerik`, `github-login-error`
- Runs: 3 per driver, per scenario
- Execution: sequential, with the base driver-order seed rotated between scenarios
- Headline aggregation: arithmetic mean of each scenario median, with equal weight per scenario
- Provenance: consistent across scenarios

## Scenario-weighted results

| Driver | Scenarios | Correct runs | Avg wall | Avg model API | Avg cost | Avg AI Credits | Avg input | Avg uncached | Avg output | Avg browser tool turns | Avg CLI calls | Failed CLI calls | Avg CLI time | Avg CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | 2/2 | 6/6 | 42.34s | 26.81s | $0.0554 | n/a | 233,495 | 12,729 | 1,621 | 5.5 | 5.5 | 0.0 | 14.14s | 4,641 B |
| Playwright | 2/2 | 6/6 | 58.32s | 34.29s | $0.0764 | n/a | 369,849 | 16,236 | 1,929 | 8.5 | 8.5 | 0.0 | 22.81s | 6,359 B |

## Relative to Playwright

Positive values mean the driver used more time, tokens, cost, calls, or output than Playwright.

| Driver | Wall | Model API | Cost | AI Credits | Input | Uncached | Output | CLI calls | CLI time | CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | -27.4% | -21.8% | -27.5% | n/a | -36.9% | -21.6% | -16.0% | -35.3% | -38.0% | -27.0% |

## Scenario breakdown

| Scenario | Driver | Correct runs | Wall median | Cost median | Input median | Output median | CLI calls median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [wikipedia-telerik](../claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | Playwright | 3/3 | 62.88s | $0.0823 | 408,245 | 2,068 | 9.0 |
| [wikipedia-telerik](../claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | CraftDriver | 3/3 | 44.70s | $0.0592 | 252,454 | 1,714 | 6.0 |
| [github-login-error](../claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | CraftDriver | 3/3 | 39.97s | $0.0517 | 214,536 | 1,527 | 5.0 |
| [github-login-error](../claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | Playwright | 3/3 | 53.77s | $0.0705 | 331,452 | 1,790 | 8.0 |

## Interpretation notes

- The headline first computes each driver metric median within each scenario, then averages those medians. Every scenario therefore has equal influence even if run counts differ later.
- A missing provider metric is excluded only from that metric’s mean. `aggregate.json` records the contributing scenario count and scenario medians; unavailable values are never estimated.
- Correctness remains an auditable successful-run count rather than an averaged score. A run requires the expected structured answer and a final screenshot.
- These are live-site realism checks. Network latency, rate limiting, authentication defenses, and markup changes add uncontrolled variance; use deterministic local tasks for primary latency claims.
- Each linked scenario report preserves its run-level metrics, raw agent streams, stderr, command transcripts, screenshots, workspaces, browser versions, and preflight evidence.
