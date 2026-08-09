# Benchmark report: claude-haiku45-low-local-search-craftdriver-v113-final-2x

- Task: `local-search-telerik`
- Agent: `claude` (`2.1.220 (Claude Code)`)
- Model: `claude-haiku-4-5-20251001`
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
| craftdriver | 2/2 | 38.49s | 40.10s | 21.72s | n/a | $0.0606 | 150,781 | 130,435 | 20,346 | 1,507 | 152,287 | 3.5 | 6.5 | 15.24s | 1,650 B |
| playwright | 2/2 | 56.92s | 57.83s | 31.04s | n/a | $0.0664 | 323,784 | 309,823 | 13,961 | 1,643 | 325,427 | 9.0 | 9.0 | 23.83s | 2,471 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -32.4% |
| Input tokens | -53.4% |
| Uncached input tokens | +45.7% |
| Output tokens | -8.3% |
| Total tokens | -53.2% |
| AI Credits | n/a |
| Reported USD cost | -8.7% |
| Browser-command time | -36.1% |
| Model API time | -30.0% |
| Browser output bytes | -33.2% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-claude-craftdriver | claude | craftdriver | yes | 40.10s | n/a | $0.0806 | 166,175 | 136,668 | 29,507 | 1,721 | 4 | 6 | 0 |
| 001-claude-playwright | claude | playwright | yes | 57.83s | n/a | $0.0675 | 324,810 | 310,711 | 14,099 | 1,787 | 9 | 9 | 0 |
| 002-claude-playwright | claude | playwright | yes | 56.00s | n/a | $0.0653 | 322,757 | 308,935 | 13,822 | 1,499 | 9 | 9 | 0 |
| 002-claude-craftdriver | claude | craftdriver | yes | 36.88s | n/a | $0.0406 | 135,386 | 124,201 | 11,185 | 1,292 | 3 | 7 | 0 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-claude-craftdriver | 7.54s | 589 B | `npx --no-install craftdriver click ref=e8 --observe=page && npx --no-install craftdriver text h1 && npx --no-install craftdriver attr 'link[rel="canonical"]' href && npx --no-insta` |
| 001-claude-craftdriver | 6.17s | 402 B | `npx --no-install craftdriver go http://127.0.0.1:65386/ --browser chrome --headless --observe=delta` |
| 002-claude-craftdriver | 6.15s | 402 B | `npx --no-install craftdriver go http://127.0.0.1:65386/ --browser chrome --headless --observe=delta` |
| 001-claude-craftdriver | 5.18s | 265 B | `npx --no-install craftdriver text h1 && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop` |
| 002-claude-craftdriver | 1.97s | 709 B | `npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta` |
| 001-claude-craftdriver | 1.85s | 709 B | `npx --no-install craftdriver fill ref=e5 "Telerik" --submit --observe=delta` |
| 001-claude-craftdriver | 1.61s | 224 B | `npx --no-install craftdriver click ref=e8 --observe=page` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-claude-playwright | 6.28s | 325 B | `npx --no-install playwright cli open http://127.0.0.1:65386/` |
| 001-claude-playwright | 6.11s | 325 B | `npx --no-install playwright cli open http://127.0.0.1:65386/` |
| 001-claude-playwright | 2.76s | 167 B | `npx --no-install playwright cli click e12` |
| 002-claude-playwright | 2.75s | 167 B | `npx --no-install playwright cli click e12` |
| 001-claude-playwright | 2.57s | 187 B | `npx --no-install playwright cli click e7` |
| 002-claude-playwright | 2.54s | 187 B | `npx --no-install playwright cli click e7` |
| 001-claude-playwright | 2.19s | 61 B | `npx --no-install playwright cli screenshot --filename=final-screenshot.png` |
| 001-claude-playwright | 2.15s | 24 B | `npx --no-install playwright cli close` |

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
