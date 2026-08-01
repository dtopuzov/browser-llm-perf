# Benchmark report: claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error

- Task: `github-login-error`
- Agent: `claude` (`2.1.220 (Claude Code)`)
- Model: `claude-haiku-4-5-20251001`
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
| craftdriver | 3/3 | 39.97s | 43.69s | 24.22s | n/a | $0.0517 | 214,536 | 202,291 | 12,245 | 1,527 | 216,074 | 5.0 | 5.0 | 14.06s | 3,649 B |
| playwright | 3/3 | 53.77s | 54.66s | 32.34s | n/a | $0.0705 | 331,452 | 316,059 | 15,393 | 1,790 | 333,165 | 8.0 | 8.0 | 20.48s | 5,274 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -25.7% |
| Input tokens | -35.3% |
| Uncached input tokens | -20.5% |
| Output tokens | -14.7% |
| Total tokens | -35.1% |
| AI Credits | n/a |
| Reported USD cost | -26.7% |
| Browser-command time | -31.4% |
| Model API time | -25.1% |
| Browser output bytes | -30.8% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-claude-craftdriver | claude | craftdriver | yes | 39.97s | n/a | $0.0936 | 245,480 | 212,749 | 32,731 | 1,527 | 6 | 6 | 0 |
| 001-claude-playwright | claude | playwright | yes | 51.45s | n/a | $0.0702 | 331,452 | 316,059 | 15,393 | 1,713 | 8 | 8 | 0 |
| 002-claude-playwright | claude | playwright | yes | 53.77s | n/a | $0.0705 | 331,097 | 315,741 | 15,356 | 1,790 | 8 | 8 | 0 |
| 002-claude-craftdriver | claude | craftdriver | yes | 43.69s | n/a | $0.0517 | 214,536 | 202,291 | 12,245 | 1,538 | 5 | 5 | 0 |
| 003-claude-craftdriver | claude | craftdriver | yes | 39.15s | n/a | $0.0513 | 214,218 | 202,127 | 12,091 | 1,525 | 5 | 5 | 0 |
| 003-claude-playwright | claude | playwright | yes | 54.66s | n/a | $0.0711 | 332,180 | 316,700 | 15,480 | 1,840 | 8 | 8 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-claude-craftdriver | 6.12s | 1,280 B | `npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 003-claude-craftdriver | 6.00s | 1,280 B | `npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 001-claude-craftdriver | 5.54s | 1,280 B | `npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 002-claude-craftdriver | 2.63s | 1,631 B | `npx --no-install craftdriver fill ref=e9 "not-a-real-password-9f4c2a7b" --submit --observe=delta` |
| 003-claude-craftdriver | 2.55s | 1,631 B | `npx --no-install craftdriver fill ref=e9 "not-a-real-password-9f4c2a7b" --submit --observe=delta` |
| 001-claude-craftdriver | 2.25s | 1,425 B | `npx --no-install craftdriver click ref=e11 --observe=delta` |
| 003-claude-craftdriver | 2.04s | 182 B | `npx --no-install craftdriver screenshot -o final-screenshot.png` |
| 002-claude-craftdriver | 2.02s | 542 B | `npx --no-install craftdriver fill ref=e7 "llm-perf-e2e-9f4c2a7b-nouser" --observe=delta` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-claude-playwright | 6.20s | 212 B | `npx --no-install playwright cli open https://github.com/login` |
| 003-claude-playwright | 6.17s | 212 B | `npx --no-install playwright cli open https://github.com/login` |
| 002-claude-playwright | 6.07s | 212 B | `npx --no-install playwright cli open https://github.com/login --browser=chrome` |
| 001-claude-playwright | 3.04s | 169 B | `npx --no-install playwright cli click e31` |
| 003-claude-playwright | 3.03s | 169 B | `npx --no-install playwright cli click e31` |
| 002-claude-playwright | 2.98s | 169 B | `npx --no-install playwright cli click e31` |
| 001-claude-playwright | 1.98s | 61 B | `npx --no-install playwright cli screenshot --filename=final-screenshot.png` |
| 002-claude-playwright | 1.94s | 24 B | `npx --no-install playwright cli close` |

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
