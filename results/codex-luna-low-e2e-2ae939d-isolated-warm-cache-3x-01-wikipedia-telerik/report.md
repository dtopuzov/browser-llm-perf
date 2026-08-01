# Benchmark report: codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik

- Task: `wikipedia-telerik`
- Agent: `codex` (`codex-cli 0.146.0`)
- Model: `gpt-5.6-luna`
- Reasoning: `low`
- Playwright: `1.62.0`
- CraftDriver: `1.10.0` (2ae939da1fc5d19003f23a2da13f88bb0aaf987f)
- Vibium: `26.5.31`
- Vibium skill: `vibe-check` (b0f372ccd3ec895c4bf78d43ac9fb8eaba767a67)
- Installed Chrome (Playwright/CraftDriver): `Google Chrome 150.0.7871.187`
- Vibium-managed Chrome: `not selected`

## Aggregate results

| Driver | Correct | Wall median | Wall p95 | Model API time | AI Credits | Reported cost | Input median | Cached median | Uncached median | Output median | Total median | Browser tool turns | CLI calls | Driver time | Driver output |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| craftdriver | 3/3 | 49.44s | 57.80s | n/a | n/a | n/a | 88,868 | 70,400 | 18,468 | 725 | 89,593 | 4.0 | 6.0 | 18.64s | 5,638 B |
| playwright | 3/3 | 69.83s | 73.10s | n/a | n/a | n/a | 211,129 | 184,064 | 37,515 | 1,108 | 212,237 | 7.0 | 7.0 | 27.46s | 122,912 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -29.2% |
| Input tokens | -57.9% |
| Uncached input tokens | -50.8% |
| Output tokens | -34.6% |
| Total tokens | -57.8% |
| AI Credits | n/a |
| Reported USD cost | n/a |
| Browser-command time | -32.1% |
| Model API time | n/a |
| Browser output bytes | -95.4% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-codex-playwright | codex | playwright | yes | 69.83s | n/a | n/a | 226,699 | 189,184 | 37,515 | 1,149 | 8 | 8 | 0 |
| 001-codex-craftdriver | codex | craftdriver | yes | 42.86s | n/a | n/a | 88,868 | 70,400 | 18,468 | 725 | 4 | 6 | 0 |
| 002-codex-craftdriver | codex | craftdriver | yes | 49.44s | n/a | n/a | 89,753 | 70,400 | 19,353 | 1,037 | 6 | 6 | 0 |
| 002-codex-playwright | codex | playwright | yes | 52.51s | n/a | n/a | 108,652 | 61,440 | 47,212 | 812 | 3 | 3 | 0 |
| 003-codex-playwright | codex | playwright | yes | 73.10s | n/a | n/a | 211,129 | 184,064 | 27,065 | 1,108 | 7 | 7 | 0 |
| 003-codex-craftdriver | codex | craftdriver | yes | 57.80s | n/a | n/a | 88,819 | 70,400 | 18,419 | 691 | 3 | 6 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 003-codex-craftdriver | 19.61s | 380 B | `/bin/bash -lc "npx --no-install craftdriver text h1 && npx --no-install craftdriver attr 'link[rel=\"canonical\"]' href && npx --no-install craftdriver screenshot -o final-screensh` |
| 003-codex-craftdriver | 9.12s | 5,036 B | `/bin/bash -lc 'npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta'` |
| 003-codex-craftdriver | 6.08s | 222 B | `/bin/bash -lc 'npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page'` |
| 001-codex-craftdriver | 5.44s | 5,036 B | `/bin/bash -lc 'npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta'` |
| 002-codex-craftdriver | 5.28s | 5,036 B | `/bin/bash -lc 'npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta'` |
| 002-codex-craftdriver | 3.92s | 15 B | `/bin/bash -lc 'npx --no-install craftdriver daemon stop'` |
| 001-codex-craftdriver | 3.89s | 198 B | `/bin/bash -lc 'npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop'` |
| 002-codex-craftdriver | 3.77s | 183 B | `/bin/bash -lc 'npx --no-install craftdriver screenshot -o final-screenshot.png'` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-codex-playwright | 8.98s | 188 B | `/bin/bash -lc 'npx --no-install playwright cli goto https://en.wikipedia.org/wiki/Main_Page'` |
| 003-codex-playwright | 8.61s | 233 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome https://en.wikipedia.org/wiki/Main_Page'` |
| 002-codex-playwright | 7.58s | 233 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome https://en.wikipedia.org/wiki/Main_Page'` |
| 001-codex-playwright | 4.92s | 158 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome'` |
| 003-codex-playwright | 4.51s | 173 B | `/bin/bash -lc 'npx --no-install playwright cli fill e23 "Telerik" --submit'` |
| 003-codex-playwright | 4.28s | 40 B | `/bin/bash -lc "npx --no-install playwright cli --raw eval \"document.querySelector('link[rel=canonical]')?.href\""` |
| 003-codex-playwright | 3.57s | 62 B | `/bin/bash -lc 'npx --no-install playwright cli screenshot --filename=final-screenshot.png'` |
| 003-codex-playwright | 3.30s | 62,220 B | `/bin/bash -lc 'npx --no-install playwright cli snapshot'` |

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
