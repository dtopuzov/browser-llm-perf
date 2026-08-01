# Benchmark report: claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-01-wikipedia-telerik

- Task: `wikipedia-telerik`
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
| craftdriver | 3/3 | 44.70s | 46.56s | 29.41s | n/a | $0.0592 | 252,454 | 239,343 | 13,213 | 1,714 | 254,168 | 6.0 | 6.0 | 14.23s | 5,633 B |
| playwright | 3/3 | 62.88s | 71.62s | 36.24s | n/a | $0.0823 | 408,245 | 391,167 | 17,078 | 2,068 | 410,196 | 9.0 | 9.0 | 25.13s | 7,443 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -28.9% |
| Input tokens | -38.2% |
| Uncached input tokens | -22.6% |
| Output tokens | -17.1% |
| Total tokens | -38.0% |
| AI Credits | n/a |
| Reported USD cost | -28.1% |
| Browser-command time | -43.4% |
| Model API time | -18.8% |
| Browser output bytes | -24.3% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-claude-playwright | claude | playwright | yes | 71.62s | n/a | $0.1695 | 469,826 | 410,763 | 59,063 | 2,201 | 9 | 9 | 0 |
| 001-claude-craftdriver | claude | craftdriver | yes | 44.70s | n/a | $0.0580 | 252,454 | 239,343 | 13,111 | 1,714 | 6 | 6 | 0 |
| 002-claude-craftdriver | claude | craftdriver | yes | 40.22s | n/a | $0.1182 | 251,957 | 207,037 | 44,920 | 1,678 | 6 | 6 | 0 |
| 002-claude-playwright | claude | playwright | yes | 58.26s | n/a | $0.0749 | 338,469 | 321,953 | 16,516 | 2,068 | 8 | 8 | 0 |
| 003-claude-playwright | claude | playwright | yes | 62.88s | n/a | $0.0823 | 408,245 | 391,167 | 17,078 | 1,951 | 10 | 10 | 0 |
| 003-claude-craftdriver | claude | craftdriver | yes | 46.56s | n/a | $0.0592 | 252,556 | 239,343 | 13,213 | 1,898 | 6 | 6 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-claude-craftdriver | 5.73s | 5,035 B | `npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 003-claude-craftdriver | 5.67s | 5,035 B | `npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 002-claude-craftdriver | 5.55s | 5,035 B | `npx --no-install craftdriver go https://en.wikipedia.org/wiki/Main_Page --browser chrome --headless --observe=delta` |
| 003-claude-craftdriver | 2.43s | 221 B | `npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page` |
| 002-claude-craftdriver | 2.40s | 221 B | `npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page` |
| 001-claude-craftdriver | 2.16s | 221 B | `npx --no-install craftdriver fill ref=e9 "Telerik" --submit --observe=page` |
| 002-claude-craftdriver | 1.98s | 183 B | `npx --no-install craftdriver screenshot -o final-screenshot.png` |
| 001-claude-craftdriver | 1.93s | 183 B | `npx --no-install craftdriver screenshot -o final-screenshot.png` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-claude-playwright | 6.02s | 231 B | `npx --no-install playwright cli open https://en.wikipedia.org/wiki/Main_Page --browser=chrome` |
| 003-claude-playwright | 6.00s | 231 B | `npx --no-install playwright cli open https://en.wikipedia.org/wiki/Main_Page` |
| 001-claude-playwright | 5.63s | 156 B | `npx --no-install playwright cli open --browser=chrome` |
| 001-claude-playwright | 4.50s | 187 B | `npx --no-install playwright cli goto https://en.wikipedia.org/wiki/Main_Page` |
| 003-claude-playwright | 3.04s | 187 B | `npx --no-install playwright cli click e23` |
| 001-claude-playwright | 2.99s | 187 B | `npx --no-install playwright cli click e23` |
| 003-claude-playwright | 2.97s | 172 B | `npx --no-install playwright cli click e813` |
| 002-claude-playwright | 2.86s | 172 B | `npx --no-install playwright cli fill e23 "Telerik" --submit` |

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
