# Benchmark report: copilot-luna-low-local-search-craftdriver-v113-final-2x

- Task: `local-search-telerik`
- Agent: `copilot` (`GitHub Copilot CLI 1.0.76.
Run 'copilot update' to check for updates.`)
- Model: `gpt-5.6-luna`
- Reasoning: `low`
- Playwright: `1.62.0`
- CraftDriver: `1.13.0` (996e1f794ad7a74af67e002bd6c26e15e08b49c3)
- Vibium: `26.5.31`
- Vibium skill: `vibe-check` (b0f372ccd3ec895c4bf78d43ac9fb8eaba767a67)
- Installed Chrome (Playwright/CraftDriver): `Google Chrome 151.0.7922.108` (/Applications/Google Chrome.app/Contents/MacOS/Google Chrome)
- CraftDriver ChromeDriver: `151.0.7922.77` (/Users/admin/.cache/craftdriver/chromedriver/151.0.7922.108/mac-x64/chromedriver; major match: true)
- Vibium-managed Chrome: `not selected`

## Aggregate results

| Driver | Correct | Wall median | Wall p95 | Model API time | AI Credits | Reported cost | Input median | Cached median | Uncached median | Output median | Total median | Browser tool turns | CLI calls | Driver time | Driver output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| craftdriver | 2/2 | 40.26s | 41.99s | 13.20s | 0.6819 | n/a | n/a | n/a | n/a | 372 | n/a | 3.0 | 6.0 | 13.55s | 1,722 B |
| playwright | 2/2 | 54.91s | 59.38s | 19.17s | 0.9364 | n/a | n/a | n/a | n/a | 506 | n/a | 7.5 | 8.5 | 23.34s | 2,664 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -26.7% |
| Input tokens | n/a |
| Uncached input tokens | n/a |
| Output tokens | -26.5% |
| Total tokens | n/a |
| AI Credits | -27.2% |
| Reported USD cost | n/a |
| Browser-command time | -41.9% |
| Model API time | -31.2% |
| Browser output bytes | -35.4% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-copilot-playwright | copilot | playwright | yes | 59.38s | 0.9378 | n/a | n/a | n/a | n/a | 507 | 7 | 9 | 0 |
| 001-copilot-craftdriver | copilot | craftdriver | yes | 41.99s | 0.6822 | n/a | n/a | n/a | n/a | 375 | 3 | 6 | 0 |
| 002-copilot-craftdriver | copilot | craftdriver | yes | 38.53s | 0.6815 | n/a | n/a | n/a | n/a | 369 | 3 | 6 | 0 |
| 002-copilot-playwright | copilot | playwright | yes | 50.44s | 0.9350 | n/a | n/a | n/a | n/a | 505 | 8 | 8 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-copilot-craftdriver | 6.13s | 531 B | `npx --no-install craftdriver click ref=e8 --observe=page && npx --no-install craftdriver text h1 && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-inst` |
| 002-copilot-craftdriver | 6.04s | 531 B | `npx --no-install craftdriver click ref=e8 --observe=page && npx --no-install craftdriver text h1 && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-inst` |
| 001-copilot-craftdriver | 5.79s | 442 B | `npx --no-install craftdriver go http://127.0.0.1:49218/ --browser chrome --headless --observe=delta` |
| 002-copilot-craftdriver | 5.44s | 442 B | `npx --no-install craftdriver go http://127.0.0.1:49218/ --browser chrome --headless --observe=delta` |
| 001-copilot-craftdriver | 1.86s | 749 B | `npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta` |
| 002-copilot-craftdriver | 1.84s | 749 B | `npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-copilot-playwright | 5.82s | 365 B | `npx --no-install playwright cli open --browser=chrome http://127.0.0.1:49218/` |
| 002-copilot-playwright | 5.49s | 365 B | `npx --no-install playwright cli open --browser=chrome http://127.0.0.1:49218/` |
| 001-copilot-playwright | 4.41s | 126 B | `npx --no-install playwright cli screenshot --filename=final-screenshot.png && npx --no-install playwright cli close` |
| 001-copilot-playwright | 4.39s | 405 B | `npx --no-install playwright cli snapshot && npx --no-install playwright cli eval "JSON.stringify({heading: document.querySelector('h1')?.textContent?.trim(), url: location.href})"` |
| 002-copilot-playwright | 2.86s | 207 B | `npx --no-install playwright cli click e12` |
| 001-copilot-playwright | 2.77s | 207 B | `npx --no-install playwright cli click e12` |
| 002-copilot-playwright | 2.66s | 60 B | `npx --no-install playwright cli eval "document.querySelector('h1')?.textContent"` |
| 002-copilot-playwright | 2.65s | 101 B | `npx --no-install playwright cli screenshot --filename=final-screenshot.png` |

## Interpretation notes

- `inputTokens` includes cached input tokens. `uncachedInputTokens` is also retained in `aggregate.json` and every run’s `metrics.json`.
- Browser tool turns count agent shell/tool calls containing at least one driver invocation. CLI calls count the individual driver commands inside them; failed CLI calls include structured `{ "ok": false }` results and embedded non-zero shell completion codes.
- Copilot AI Credits use the CLI's cumulative `session.usage_checkpoint.data.totalNanoAiu` value when present, with per-call `assistant.usage` as a fallback; 1,000,000,000 nano-AIU equals 1 AI Credit.
- Copilot CLI 1.0.76 programmatic JSON exposes output tokens but not input/cache token totals. Those input fields remain `n/a` rather than being estimated.
- Claude reported cost is the CLI's `total_cost_usd` accounting value. With subscription authentication, it is useful for relative comparison but is not necessarily an additional amount billed to the user.
- Every trial receives a fresh temporary `HOME` and agent config root. Only authentication is handed into that home: an isolated Codex auth link, a Claude OAuth/API token, or a Copilot process token.
- Each agent also starts a non-resumed programmatic session. Codex uses `--ephemeral`; Claude uses `--no-session-persistence`; Copilot receives a fresh `COPILOT_HOME` and disables remote session import/export.
- Server-side prompt caching cannot currently be disabled by this harness. Alternating driver order and reporting cached tokens makes its effect visible.
- Browser binaries and driver downloads are warmed before measurement. CraftDriver receives the shared binary-only driver cache in offline mode; agent homes, CraftDriver project/session state, the LLM thread, workspace, browser process, browser profile, and driver daemon remain fresh per trial.
- Vibium uses its officially managed Chrome for Testing. The manifest records that version separately because it can differ from the installed Google Chrome used by Playwright and CraftDriver.
- Use the local fixture for primary latency claims. Live-site batches include uncontrolled network and markup variance.
