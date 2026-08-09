# Browser LLM Perf

Which browser CLI helps an AI agent finish real browser work faster and at
lower model cost?

This repository compares [CraftDriver](https://github.com/dtopuzov/craftdriver)
and [Playwright CLI](https://playwright.dev/) in isolated end-to-end runs with
Codex CLI, Claude Code, and GitHub Copilot CLI.

**Latest result: CraftDriver won with all three agents.** All 12 driver trials
were correct (6 CraftDriver, 6 Playwright), so the differences below measure
efficiency rather than task completion.

## Latest deterministic result

Two runs per driver and agent used the local `local-search-telerik` fixture.
Trials ran sequentially with rotated driver order against CraftDriver `1.13.0`
at commit `996e1f794ad7a74af67e002bd6c26e15e08b49c3`. Both drivers used installed
Google Chrome `151.0.7922.108`; CraftDriver used ChromeDriver `151.0.7922.77`
with a validated major-version match.

Negative differences mean CraftDriver used less:

| Agent and model | Cost measure | CraftDriver | Playwright | Cost diff | Wall diff | Token/output diff |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Codex, GPT-5.6 Luna low | API-equivalent estimate | **$0.0092** | $0.0127 | **-27.5%** | **-47.1%** | **-61.4% total tokens** |
| Claude, Haiku 4.5 low | CLI-reported USD | **$0.0606** | $0.0664 | **-8.7%** | **-32.4%** | **-53.2% total tokens** |
| Copilot, GPT-5.6 Luna low | AI Credits | **0.6819** | 0.9364 | **-27.2%** | **-26.7%** | **-26.5% output tokens** |

Codex does not report cost, so its estimate applies the current GPT-5.6 Luna
rates—$0.20/M uncached input, $0.02/M cached input, and $1.20/M output—to the
reported median token counts. See the
[official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
Copilot CLI does not expose input/cache token totals, so its own AI Credits are
the available cost measure. Missing provider fields are not estimated.

### Detailed medians

| Agent | Driver | Correct | Wall | Cached input | Uncached input | Output | Browser turns | CLI calls | Driver time |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex | CraftDriver | 2/2 | **41.51s** | **32,128** | **38,404** | **722** | **3.0** | **6.0** | **13.44s** |
| Codex | Playwright | 2/2 | 78.40s | 142,336 | 40,883 | 1,373 | 10.0 | 10.0 | 24.59s |
| Claude | CraftDriver | 2/2 | **38.49s** | **130,435** | 20,346 | **1,507** | **3.5** | **6.5** | **15.24s** |
| Claude | Playwright | 2/2 | 56.92s | 309,823 | **13,961** | 1,643 | 9.0 | 9.0 | 23.83s |
| Copilot | CraftDriver | 2/2 | **40.26s** | n/a | n/a | **372** | **3.0** | **6.0** | **13.55s** |
| Copilot | Playwright | 2/2 | 54.91s | n/a | n/a | 506 | 7.5 | 8.5 | 23.34s |

Claude is the important nuance: CraftDriver's median total and reported cost
were lower, but its uncached input was 45.7% higher. With only two runs and a
wide $0.0406–$0.0806 CraftDriver cost range, the exact 8.7% cost lead is
directional, not a stable estimate.

The command-shape improvement did what it was intended to do. Once a result ref
was discovered, CraftDriver agents grouped the click, evidence reads,
screenshot, and shutdown. CraftDriver therefore needed three browser tool turns
in five of six runs; the remaining Claude run needed four. It still made six or
seven real CLI calls—the optimization removed model round trips, not checks.

One Codex Playwright run tried the unsupported `open --headless`, recovered, and
completed correctly. That added one failed CLI call and 1.87 seconds. It is
retained rather than cherry-picked; removing that command would not explain the
36.89-second median wall gap.

## GitHub-only historical result

Wikipedia was not the reason CraftDriver led in the earlier live-site suite.
The GitHub login-error scenario alone produced these medians with CraftDriver
`1.10.0` at `2ae939d` (three runs per driver):

| Agent | Correct | Wall diff | Total-token diff | Output diff | Cost diff |
| --- | ---: | ---: | ---: | ---: | ---: |
| Codex, GPT-5.6 Luna low | 6/6 | **-32.4%** | **-33.3%** | **-26.7%** | n/a |
| Claude, Haiku 4.5 low | 6/6 | **-25.7%** | **-35.1%** | **-14.7%** | **-26.7% USD** |
| Copilot, GPT-5.4 medium | 6/6 | **-34.0%** | n/a | **-35.2%** | **-16.9% AI Credits** |

Those GitHub results and the new deterministic results point in the same
direction. The latest local search run now also restores the clear total-token
lead that was missing from the first v1.13 Codex check.

## Method and limits

Every measured trial starts a fresh agent session, home/config, workspace,
browser profile, browser process, and driver process. Trials run sequentially;
correctness requires the expected structured answer and a final screenshot.
The driver skill is the command reference for each fixture, and all fixtures
share the same no-global-help rule.

Raw JSON/JSONL, stderr, answers, timings, command transcripts, workspaces, and
screenshots remain local for every final trial. The repository publishes the
curated reports, manifests, aggregates, and CSVs.

This is a fast two-run regression check on one deterministic search flow, not a
precise population estimate. Further prompt tuning against this exact task
would risk overfitting; the next useful evidence would be more task shapes
(multi-step form, delayed state, or navigation), not more task-specific hints.

## Run it

Requirements: Node.js 20+, Google Chrome, authenticated agent CLIs, and a
CraftDriver checkout at `../craftdriver`.

```bash
npm ci
npm run skills:install

npm run bench -- \
  --agent codex \
  --model gpt-5.6-luna \
  --reasoning low \
  --driver playwright,craftdriver \
  --task local-search-telerik \
  --runs 2
```

Use `--agent claude --model claude-haiku-4-5-20251001` or
`--agent copilot --model gpt-5.6-luna` for the other two batches.

## Evidence

- [Full analysis](ANALYSIS.md)
- Codex: [report](results/codex-luna-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/codex-luna-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/codex-luna-low-local-search-craftdriver-v113-final-2x/manifest.json)
- Claude: [report](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/manifest.json)
- Copilot: [report](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/manifest.json)
- Historical GitHub-only reports: [Codex](results/codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
  · [Claude](results/claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
  · [Copilot](results/copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
