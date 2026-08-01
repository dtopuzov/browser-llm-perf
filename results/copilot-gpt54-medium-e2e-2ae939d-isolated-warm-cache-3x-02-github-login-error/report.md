# Benchmark report: copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error

- Task: `github-login-error`
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
| craftdriver | 3/3 | 47.03s | 68.92s | 17.94s | 10.6947 | n/a | n/a | n/a | n/a | 1,338 | n/a | 3.0 | 5.0 | 16.73s | 3,596 B |
| playwright | 3/3 | 71.25s | 94.18s | 22.13s | 12.8693 | n/a | n/a | n/a | n/a | 2,066 | n/a | 2.0 | 13.0 | 37.23s | 6,995 B |

## CraftDriver relative to Playwright

Positive values mean CraftDriver used more time, tokens, or output bytes.

| Metric | Median difference |
| --- | ---: |
| End-to-end wall time | -34.0% |
| Input tokens | n/a |
| Uncached input tokens | n/a |
| Output tokens | -35.2% |
| Total tokens | n/a |
| AI Credits | -16.9% |
| Reported USD cost | n/a |
| Browser-command time | -55.1% |
| Model API time | -18.9% |
| Browser output bytes | -48.6% |

## Individual runs

| Run | Agent | Driver | Correct | Wall | AI Credits | Reported cost | Input | Cached | Uncached | Output | Browser tool turns | CLI calls | Failed CLI calls |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 001-copilot-craftdriver | copilot | craftdriver | yes | 47.03s | 10.6947 | n/a | n/a | n/a | n/a | 1,338 | 3 | 5 | 0 |
| 001-copilot-playwright | copilot | playwright | yes | 94.18s | 12.8693 | n/a | n/a | n/a | n/a | 2,658 | 2 | 19 | 1 |
| 002-copilot-playwright | copilot | playwright | yes | 71.25s | 12.4874 | n/a | n/a | n/a | n/a | 2,066 | 2 | 12 | 1 |
| 002-copilot-craftdriver | copilot | craftdriver | yes | 68.92s | 10.8865 | n/a | n/a | n/a | n/a | 1,485 | 3 | 5 | 0 |
| 003-copilot-craftdriver | copilot | craftdriver | yes | 45.30s | 10.2133 | n/a | n/a | n/a | n/a | 1,274 | 3 | 5 | 0 |
| 003-copilot-playwright | copilot | playwright | yes | 66.69s | 13.6386 | n/a | n/a | n/a | n/a | 2,064 | 5 | 13 | 1 |

## Slowest browser commands

### craftdriver

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 002-copilot-craftdriver | 14.55s | 238 B | `cd <trial-workspace> && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop` |
| 002-copilot-craftdriver | 13.34s | 2,038 B | `cd <trial-workspace> && npx --no-install craftdriver fill ref=e7 'llm-perf-e2e-9f4c2a7b-nouser' --observe=delta && printf '\n---SUBMIT---\n' && npx --no-install craftdriver fill re` |
| 002-copilot-craftdriver | 8.11s | 1,320 B | `cd <trial-workspace> && npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 001-copilot-craftdriver | 6.25s | 2,214 B | `cd <trial-workspace> && npx --no-install craftdriver fill ref=e7 llm-perf-e2e-9f4c2a7b-nouser --observe=delta && npx --no-install craftdriver fill ref=e9 not-a-real-password-9f4c2a` |
| 001-copilot-craftdriver | 5.95s | 1,320 B | `cd <trial-workspace> && npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 003-copilot-craftdriver | 5.72s | 1,320 B | `cd <trial-workspace> && npx --no-install craftdriver go https://github.com/login --browser chrome --headless --observe=delta` |
| 003-copilot-craftdriver | 5.00s | 1,724 B | `cd <trial-workspace> && npx --no-install craftdriver fill ref=e7 llm-perf-e2e-9f4c2a7b-nouser && npx --no-install craftdriver fill ref=e9 not-a-real-password-9f4c2a7b --submit --ob` |
| 003-copilot-craftdriver | 4.61s | 238 B | `cd <trial-workspace> && npx --no-install craftdriver screenshot -o final-screenshot.png && npx --no-install craftdriver daemon stop` |

### playwright

| Run | Duration | Output | Command |
| --- | ---: | ---: | --- |
| 001-copilot-playwright | 29.42s | 3,169 B | `session=gh-login-9f4c2a7b-2 && npx --no-install playwright cli -s="$session" open --browser=chrome https://github.com/login && npx --no-install playwright cli -s="$session" fill "g` |
| 001-copilot-playwright | 27.95s | 4,431 B | `session=gh-login-9f4c2a7b && npx --no-install playwright cli -s="$session" open --browser=chrome https://github.com/login && npx --no-install playwright cli -s="$session" fill "get` |
| 002-copilot-playwright | 22.04s | 3,263 B | `cd <trial-workspace> && npx --no-install playwright cli close-all >/dev/null 2>&1 \|\| true && npx --no-install playwright cli -s=github-auth-trial open https://github.com/login --` |
| 002-copilot-playwright | 15.20s | 3,299 B | `cd <trial-workspace> && npx --no-install playwright cli -s=github-auth-trial click e31 && npx --no-install playwright cli -s=github-auth-trial snapshot && printf 'URL<<EOF\n%s\nEOF` |
| 003-copilot-playwright | 13.24s | 3,260 B | `cd <trial-workspace> && npx --no-install playwright cli -s=trial-9f4c2a7b open --browser=chrome https://github.com/login && npx --no-install playwright cli -s=trial-9f4c2a7b fill "` |
| 003-copilot-playwright | 8.61s | 124 B | `cd <trial-workspace> && MESSAGE=$(npx --no-install playwright cli -s=trial-9f4c2a7b --raw eval "document.querySelector('[role=\"alert\"]')?.textContent?.trim()") && URL=$(npx --no-` |
| 003-copilot-playwright | 4.98s | 2,743 B | `cd <trial-workspace> && npx --no-install playwright cli -s=trial-9f4c2a7b click e31 && npx --no-install playwright cli -s=trial-9f4c2a7b snapshot` |
| 003-copilot-playwright | 2.01s | 60 B | `cd <trial-workspace> && npx --no-install playwright cli list --json` |

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
