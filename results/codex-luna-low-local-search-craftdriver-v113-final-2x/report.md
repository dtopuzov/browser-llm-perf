# Benchmark report: codex-luna-low-local-search-craftdriver-v113-final-2x

- Task: `local-search-telerik`
- Agent: `codex` (`codex-cli 0.146.0`)
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
| craftdriver | 2/2 | 41.51s | 42.15s | n/a | n/a | n/a | 70,532 | 32,128 | 38,404 | 722 | 71,254 | 3.0 | 6.0 | 13.44s | 1,603 B |
| playwright | 2/2 | 78.40s | 80.59s | n/a | n/a | n/a | 183,219 | 142,336 | 40,883 | 1,373 | 184,591 | 10.0 | 10.0 | 24.59s | 2,961 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -47.1% |
| Input tokens | -61.5% |
| Uncached input tokens | -6.1% |
| Output tokens | -47.4% |
| Total tokens | -61.4% |
| AI Credits | n/a |
| Reported USD cost | n/a |
| Browser-command time | -45.4% |
| Model API time | n/a |
| Browser output bytes | -45.9% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-codex-playwright | codex | playwright | yes | 76.21s | n/a | n/a | 182,169 | 142,848 | 39,321 | 1,320 | 10 | 10 | 0 |
| 001-codex-craftdriver | codex | craftdriver | yes | 42.15s | n/a | n/a | 70,259 | 39,168 | 31,091 | 647 | 3 | 6 | 0 |
| 002-codex-craftdriver | codex | craftdriver | yes | 40.86s | n/a | n/a | 70,804 | 25,088 | 45,716 | 797 | 3 | 6 | 0 |
| 002-codex-playwright | codex | playwright | yes | 80.59s | n/a | n/a | 184,268 | 141,824 | 42,444 | 1,425 | 10 | 10 | 1 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-codex-craftdriver | 6.38s | 490 B | `/bin/bash -lc 'npx --no-install craftdriver click ref=e8 --observe=page && npx --no-install craftdriver text h1 && npx --no-install craftdriver screenshot -o final-screenshot.png &` |
| 002-codex-craftdriver | 6.23s | 490 B | `/bin/bash -lc 'npx --no-install craftdriver click ref=e8 --observe=page && npx --no-install craftdriver text h1 && npx --no-install craftdriver screenshot -o final-screenshot.png &` |
| 001-codex-craftdriver | 5.56s | 403 B | `/bin/bash -lc 'npx --no-install craftdriver go http://127.0.0.1:65059/ --browser chrome --headless --observe=delta'` |
| 002-codex-craftdriver | 5.27s | 403 B | `/bin/bash -lc 'npx --no-install craftdriver go http://127.0.0.1:65059/ --browser chrome --headless --observe=delta'` |
| 001-codex-craftdriver | 1.74s | 710 B | `/bin/bash -lc 'npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta'` |
| 002-codex-craftdriver | 1.69s | 710 B | `/bin/bash -lc 'npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta'` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-codex-playwright | 5.85s | 158 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome'` |
| 001-codex-playwright | 5.79s | 158 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome'` |
| 002-codex-playwright | 2.64s | 168 B | `/bin/bash -lc 'npx --no-install playwright cli click e12'` |
| 001-codex-playwright | 2.63s | 168 B | `/bin/bash -lc 'npx --no-install playwright cli click e12'` |
| 001-codex-playwright | 2.44s | 188 B | `/bin/bash -lc 'npx --no-install playwright cli click e7'` |
| 002-codex-playwright | 2.42s | 188 B | `/bin/bash -lc 'npx --no-install playwright cli fill e6 "Telerik" --submit'` |
| 001-codex-playwright | 2.09s | 281 B | `/bin/bash -lc 'npx --no-install playwright cli goto http://127.0.0.1:65059/'` |
| 002-codex-playwright | 2.06s | 281 B | `/bin/bash -lc 'npx --no-install playwright cli goto http://127.0.0.1:65059/'` |

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
