# Benchmark report: codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error

- Task: `github-login-error`
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
| craftdriver | 3/3 | 40.66s | 54.32s | n/a | n/a | n/a | 70,810 | 40,192 | 31,642 | 652 | 71,462 | 3.0 | 5.0 | 12.90s | 3,653 B |
| playwright | 3/3 | 60.13s | 60.49s | n/a | n/a | n/a | 106,246 | 71,424 | 34,826 | 889 | 107,135 | 5.0 | 8.0 | 19.19s | 5,220 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -32.4% |
| Input tokens | -33.4% |
| Uncached input tokens | -9.1% |
| Output tokens | -26.7% |
| Total tokens | -33.3% |
| AI Credits | n/a |
| Reported USD cost | n/a |
| Browser-command time | -32.8% |
| Model API time | n/a |
| Browser output bytes | -30.0% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-codex-craftdriver | codex | craftdriver | yes | 54.32s | n/a | n/a | 85,067 | 40,192 | 44,875 | 896 | 3 | 5 | 0 |
| 001-codex-playwright | codex | playwright | yes | 56.22s | n/a | n/a | 106,197 | 86,528 | 19,669 | 870 | 5 | 8 | 0 |
| 002-codex-playwright | codex | playwright | yes | 60.49s | n/a | n/a | 106,246 | 70,400 | 35,846 | 889 | 5 | 8 | 0 |
| 002-codex-craftdriver | codex | craftdriver | yes | 40.66s | n/a | n/a | 70,810 | 39,168 | 31,642 | 652 | 3 | 5 | 0 |
| 003-codex-craftdriver | codex | craftdriver | yes | 36.08s | n/a | n/a | 70,421 | 62,208 | 8,213 | 636 | 3 | 5 | 0 |
| 003-codex-playwright | codex | playwright | yes | 60.13s | n/a | n/a | 106,250 | 71,424 | 34,826 | 890 | 5 | 8 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-codex-craftdriver | 11.13s | 1,471 B | `/bin/bash -lc 'npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta'` |
| 001-codex-craftdriver | 10.15s | 1,921 B | `/bin/bash -lc "npx --no-install craftdriver fill ref=e7 'llm-perf-e2e-9f4c2a7b-nouser' --observe=delta && npx --no-install craftdriver fill ref=e9 'not-a-real-password-9f4c2a7b' --` |
| 002-codex-craftdriver | 5.23s | 1,281 B | `/bin/bash -lc 'npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta'` |
| 003-codex-craftdriver | 4.99s | 1,281 B | `/bin/bash -lc 'npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta'` |
| 001-codex-craftdriver | 4.68s | 197 B | `/bin/bash -lc 'npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop'` |
| 002-codex-craftdriver | 4.42s | 2,175 B | `/bin/bash -lc "npx --no-install craftdriver fill ref=e7 'llm-perf-e2e-9f4c2a7b-nouser' --observe=delta && npx --no-install craftdriver fill ref=e9 'not-a-real-password-9f4c2a7b' --` |
| 003-codex-craftdriver | 4.10s | 2,175 B | `/bin/bash -lc "npx --no-install craftdriver fill ref=e7 'llm-perf-e2e-9f4c2a7b-nouser' --observe=delta && npx --no-install craftdriver fill ref=e9 'not-a-real-password-9f4c2a7b' --` |
| 002-codex-craftdriver | 3.25s | 197 B | `/bin/bash -lc 'npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop'` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-codex-playwright | 7.00s | 172 B | `/bin/bash -lc 'npx --no-install playwright cli fill e25 "llm-perf-e2e-9f4c2a7b-nouser" && npx --no-install playwright cli fill e28 "not-a-real-password-9f4c2a7b" && npx --no-instal` |
| 002-codex-playwright | 6.41s | 172 B | `/bin/bash -lc 'npx --no-install playwright cli fill e25 "llm-perf-e2e-9f4c2a7b-nouser" && npx --no-install playwright cli fill e28 "not-a-real-password-9f4c2a7b" && npx --no-instal` |
| 003-codex-playwright | 6.28s | 172 B | `/bin/bash -lc 'npx --no-install playwright cli fill e25 "llm-perf-e2e-9f4c2a7b-nouser" && npx --no-install playwright cli fill e28 "not-a-real-password-9f4c2a7b" && npx --no-instal` |
| 001-codex-playwright | 6.16s | 212 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome https://github.com/login'` |
| 003-codex-playwright | 5.59s | 212 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome https://github.com/login'` |
| 002-codex-playwright | 5.45s | 212 B | `/bin/bash -lc 'npx --no-install playwright cli open --browser=chrome https://github.com/login'` |
| 003-codex-playwright | 3.78s | 88 B | `/bin/bash -lc 'npx --no-install playwright cli screenshot --filename=final-screenshot.png && npx --no-install playwright cli close'` |
| 001-codex-playwright | 3.73s | 88 B | `/bin/bash -lc 'npx --no-install playwright cli screenshot --filename=final-screenshot.png && npx --no-install playwright cli close'` |

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
