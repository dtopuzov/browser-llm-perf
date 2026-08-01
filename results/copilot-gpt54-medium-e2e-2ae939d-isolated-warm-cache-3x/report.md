# E2E benchmark suite: copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x

- Suite: `e2e`
- Agent: `copilot`
- Model: `gpt-5.4`
- Reasoning: `medium`
- Scenarios: `wikipedia-telerik`, `github-login-error`
- Runs: 3 per driver, per scenario
- Execution: sequential, with the base driver-order seed rotated between scenarios
- Headline aggregation: arithmetic mean of each scenario median, with equal weight per scenario
- Provenance: consistent across scenarios

## Scenario-weighted results

| Driver | Scenarios | Correct runs | Avg wall | Avg model API | Avg cost | Avg AI Credits | Avg input | Avg uncached | Avg output | Avg browser tool turns | Avg CLI calls | Failed CLI calls | Avg CLI time | Avg CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | 2/2 | 6/6 | 44.60s | 17.71s | n/a | 10.9937 | n/a | n/a | 1,402 | 4.0 | 5.5 | 0.0 | 16.14s | 4,716 B |
| Playwright | 2/2 | 6/6 | 64.37s | 21.42s | n/a | 12.9247 | n/a | n/a | 2,076 | 2.5 | 10.5 | 0.5 | 31.37s | 4,242 B |

## Relative to Playwright

Positive values mean the driver used more time, tokens, cost, calls, or output than Playwright.

| Driver | Wall | Model API | Cost | AI Credits | Input | Uncached | Output | CLI calls | CLI time | CLI output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CraftDriver | -30.7% | -17.3% | n/a | -14.9% | n/a | n/a | -32.5% | -47.6% | -48.5% | +11.2% |

## Scenario breakdown

| Scenario | Driver | Correct runs | Wall median | Cost median | Input median | Output median | CLI calls median |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [wikipedia-telerik](../copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | Playwright | 3/3 | 57.49s | n/a | n/a | 2,086 | 8.0 |
| [wikipedia-telerik](../copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik/report.md) | CraftDriver | 3/3 | 42.17s | n/a | n/a | 1,465 | 6.0 |
| [github-login-error](../copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | CraftDriver | 3/3 | 47.03s | n/a | n/a | 1,338 | 5.0 |
| [github-login-error](../copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md) | Playwright | 3/3 | 71.25s | n/a | n/a | 2,066 | 13.0 |

## Interpretation notes

- The headline first computes each driver metric median within each scenario, then averages those medians. Every scenario therefore has equal influence even if run counts differ later.
- A missing provider metric is excluded only from that metric’s mean. `aggregate.json` records the contributing scenario count and scenario medians; unavailable values are never estimated.
- Correctness remains an auditable successful-run count rather than an averaged score. A run requires the expected structured answer and a final screenshot.
- These are live-site realism checks. Network latency, rate limiting, authentication defenses, and markup changes add uncontrolled variance; use deterministic local tasks for primary latency claims.
- Each linked scenario report preserves its run-level metrics, raw agent streams, stderr, command transcripts, screenshots, workspaces, browser versions, and preflight evidence.
