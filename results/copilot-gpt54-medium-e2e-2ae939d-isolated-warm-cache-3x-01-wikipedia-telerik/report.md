# Benchmark report: copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik

- Task: `wikipedia-telerik`
- Agent: `copilot` (`GitHub Copilot CLI 1.0.76.
Run 'copilot update' to check for updates.`)
- Model: `gpt-5.4`
- Reasoning: `medium`
- Playwright: `1.62.0`
- CraftDriver: `1.10.0` (2ae939da1fc5d19003f23a2da13f88bb0aaf987f)
- Vibium: `26.5.31`
- Vibium skill: `vibe-check` (b0f372ccd3ec895c4bf78d43ac9fb8eaba767a67)
- Installed Chrome (Playwright/CraftDriver): `Google Chrome 150.0.7871.187`
- Vibium-managed Chrome: `not selected`

## Aggregate results

| Driver | Correct | Wall median | Wall p95 | Model API time | AI Credits | Reported cost | Input median | Cached median | Uncached median | Output median | Total median | Browser tool turns | CLI calls | Driver time | Driver output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| craftdriver | 3/3 | 42.17s | 49.51s | 17.49s | 11.2928 | n/a | n/a | n/a | n/a | 1,465 | n/a | 5.0 | 6.0 | 15.55s | 5,835 B |
| playwright | 3/3 | 57.49s | 62.21s | 20.70s | 12.9801 | n/a | n/a | n/a | n/a | 2,086 | n/a | 3.0 | 8.0 | 25.51s | 1,488 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -26.7% |
| Input tokens | n/a |
| Uncached input tokens | n/a |
| Output tokens | -29.8% |
| Total tokens | n/a |
| AI Credits | -13.0% |
| Reported USD cost | n/a |
| Browser-command time | -39.0% |
| Model API time | -15.5% |
| Browser output bytes | +292.1% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-copilot-playwright | copilot | playwright | yes | 57.49s | 12.5313 | n/a | n/a | n/a | n/a | 1,634 | 3 | 8 | 0 |
| 001-copilot-craftdriver | copilot | craftdriver | yes | 38.74s | 9.3342 | n/a | n/a | n/a | n/a | 1,198 | 2 | 6 | 0 |
| 002-copilot-craftdriver | copilot | craftdriver | yes | 42.17s | 11.9892 | n/a | n/a | n/a | n/a | 1,465 | 5 | 6 | 0 |
| 002-copilot-playwright | copilot | playwright | yes | 57.22s | 18.5469 | n/a | n/a | n/a | n/a | 2,086 | 3 | 9 | 0 |
| 003-copilot-playwright | copilot | playwright | yes | 62.21s | 12.9801 | n/a | n/a | n/a | n/a | 2,561 | 3 | 8 | 0 |
| 003-copilot-craftdriver | copilot | craftdriver | yes | 49.51s | 11.2928 | n/a | n/a | n/a | n/a | 1,540 | 5 | 6 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-copilot-craftdriver | 9.59s | 670 B | `cd <trial-workspace> && npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page && printf '\n---H1---\n' && npx --no-install craftdriver text h1 && printf '\n---` |
| 003-copilot-craftdriver | 6.51s | 5,075 B | `cd <trial-workspace> && npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 001-copilot-craftdriver | 5.96s | 5,075 B | `cd <trial-workspace> && npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 002-copilot-craftdriver | 5.33s | 5,075 B | `cd <trial-workspace> && npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 003-copilot-craftdriver | 4.69s | 239 B | `cd <trial-workspace> && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop` |
| 003-copilot-craftdriver | 3.88s | 261 B | `cd <trial-workspace> && npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page` |
| 002-copilot-craftdriver | 3.66s | 239 B | `cd <trial-workspace> && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop` |
| 003-copilot-craftdriver | 3.40s | 107 B | `cd <trial-workspace> && npx --no-install craftdriver text h1` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 003-copilot-playwright | 13.30s | 1,081 B | `cd <trial-workspace> && npx --no-install playwright cli -s=wiki-telerik close >/dev/null 2>&1 \|\| true && npx --no-install playwright cli -s=wiki-telerik open --browser=chrome htt` |
| 001-copilot-playwright | 12.39s | 361 B | `cd <trial-workspace> && npx --no-install playwright cli -s=wiki-trial fill e23 "Telerik" --submit && npx --no-install playwright cli -s=wiki-trial --raw eval "document.querySelecto` |
| 002-copilot-playwright | 12.11s | 272 B | `cd <trial-workspace> && set -euo pipefail npx --no-install playwright cli -s=wiki fill e23 "Telerik" --submit heading=$(npx --no-install playwright cli -s=wiki --raw eval "document` |
| 002-copilot-playwright | 11.37s | 626 B | `cd <trial-workspace> && npx --no-install playwright --version && npx --no-install playwright cli close-all >/dev/null 2>&1 \|\| true && npx --no-install playwright cli -s=wiki open` |
| 003-copilot-playwright | 10.38s | 115 B | `cd <trial-workspace> && npx --no-install playwright cli -s=wiki-telerik fill e23 "Telerik" --submit >/dev/null && RESULT=$(npx --no-install playwright cli -s=wiki-telerik --raw eva` |
| 001-copilot-playwright | 8.10s | 931 B | `cd <trial-workspace> && npx --no-install playwright cli -s=wiki-trial open --browser=chrome https://en.wikipedia.org/wiki/Main_Page && npx --no-install playwright cli -s=wiki-trial` |
| 001-copilot-playwright | 2.54s | 808 B | `cd <trial-workspace> && npx --no-install playwright cli open --help` |
| 002-copilot-playwright | 2.03s | 69 B | `cd <trial-workspace> && test -f final-screenshot.png && echo screenshot-ok && npx --no-install playwright cli list` |

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
