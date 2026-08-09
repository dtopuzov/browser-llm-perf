# CraftDriver 1.13 regression and final three-agent benchmark

Date: 2026-08-09

## Verdict

The large CraftDriver regression was not normal benchmark noise. It combined
two concrete problems:

1. A Chrome 151 / cached ChromeDriver 150 mismatch failed during WebDriver
   `POST /session`, before the LLM could interact with the page. The resulting
   30-second timeout and recovery dominated the slow aggregate.
2. In the first clean v1.13 Codex run, CraftDriver still used six separate
   browser tool turns while Playwright grouped its commands into 3.5 turns.
   That repeatedly re-sent the model context and made total token counts look
   worse even though CraftDriver made fewer real CLI calls and spent less time
   in the driver.

Both are now addressed. CraftDriver validates the Chrome/ChromeDriver pairing,
retries one mismatched session after replacement, and records low-level session
attempts. Its shipped skill also tells agents to group the predictable final
click, evidence reads, screenshot, and shutdown after discovery. The benchmark
fixtures apply the same no-global-help rule to every driver.

The final result is clean and consistent: 12/12 measured trials passed, and
CraftDriver beat Playwright on wall time and the available cost measure with
Codex, Claude, and Copilot.

## Final deterministic search results

Two runs per driver and agent; negative means CraftDriver used less.

| Agent | Correct | Wall diff | Cost diff | Total-token diff | Output diff | Driver-time diff |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex, GPT-5.6 Luna low | 4/4 | **-47.1%** | **-27.5% estimated** | **-61.4%** | **-47.4%** | **-45.4%** |
| Claude, Haiku 4.5 low | 4/4 | **-32.4%** | **-8.7% reported USD** | **-53.2%** | **-8.3%** | **-36.1%** |
| Copilot, GPT-5.6 Luna low | 4/4 | **-26.7%** | **-27.2% AI Credits** | n/a | **-26.5%** | **-41.9%** |

Absolute medians:

| Agent | Driver | Wall | Cost | Total tokens | Browser turns | CLI calls | Driver time |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Codex | CraftDriver | **41.51s** | **$0.0092 est.** | **71,254** | **3.0** | **6.0** | **13.44s** |
| Codex | Playwright | 78.40s | $0.0127 est. | 184,591 | 10.0 | 10.0 | 24.59s |
| Claude | CraftDriver | **38.49s** | **$0.0606** | **152,287** | **3.5** | **6.5** | **15.24s** |
| Claude | Playwright | 56.92s | $0.0664 | 325,427 | 9.0 | 9.0 | 23.83s |
| Copilot | CraftDriver | **40.26s** | **0.6819 credits** | n/a | **3.0** | **6.0** | **13.55s** |
| Copilot | Playwright | 54.91s | 0.9364 credits | n/a | 7.5 | 8.5 | 23.34s |

Codex's cost is an API-equivalent estimate, not a CLI-reported charge. It uses
the model's current $0.20/M uncached-input, $0.02/M cached-input, and $1.20/M
output rates. Claude supplies `total_cost_usd`; Copilot supplies AI Credits but
not input/cache token totals.

## Cache-aware reading

The user's concern about total tokens was correct: cached and uncached tokens do
not have the same cost. The final results still favor CraftDriver after making
that distinction:

| Agent | Metric | CraftDriver | Playwright | Difference |
| --- | --- | ---: | ---: | ---: |
| Codex | Cached input | 32,128 | 142,336 | **-77.4%** |
| Codex | Uncached input | 38,404 | 40,883 | **-6.1%** |
| Codex | Output | 722 | 1,373 | **-47.4%** |
| Claude | Cached input | 130,435 | 309,823 | **-57.9%** |
| Claude | Uncached input | 20,346 | 13,961 | +45.7% |
| Claude | Output | 1,507 | 1,643 | **-8.3%** |

This is why the Codex cost reduction (-27.5%) is smaller than its raw total-token
reduction (-61.4%): most of Playwright's extra input was discounted cache read.
Claude shows the reverse nuance—CraftDriver had more uncached input—but the
CLI's complete cost accounting still placed its two-run median 8.7% lower.
Claude's individual CraftDriver costs ranged from $0.0406 to $0.0806, so that
exact percentage is not stable enough for a strong pricing claim.

## GitHub-only historical result

Wikipedia was not creating the earlier lead. On the GitHub login-error scenario
alone, CraftDriver 1.10.0 at `2ae939d` produced:

| Agent | CraftDriver wall | Playwright wall | Wall diff | Total-token diff | Cost diff |
| --- | ---: | ---: | ---: | ---: | ---: |
| Codex, GPT-5.6 Luna low | **40.66s** | 60.13s | **-32.4%** | **-33.3%** | n/a |
| Claude, Haiku 4.5 low | **39.97s** | 53.77s | **-25.7%** | **-35.1%** | **-26.7% USD** |
| Copilot, GPT-5.4 medium | **47.03s** | 71.25s | **-34.0%** | n/a | **-16.9% credits** |

All 18 GitHub-only trials passed. CraftDriver also used less uncached input with
Codex (-9.1%) and Claude (-20.5%). Copilot did not expose input totals, but its
output tokens were 35.2% lower. The Wikipedia task was therefore not the sole
source of the previous advantage.

## What changed from the first v1.13 checks

The comparisons below are diagnostic, not controlled A/B measurements, because
the requested final matrix uses cheaper models and lower reasoning:

| Check | Earlier v1.13 result | Final result | Interpretation |
| --- | --- | --- | --- |
| Codex local search | Terra/medium: CraftDriver total tokens **+35.0%**, wall **-4.9%**, six browser turns | Luna/low: total tokens **-61.4%**, wall **-47.1%**, three browser turns | The apparent token regression tracked model round trips, not extra CraftDriver CLI work. Model change prevents assigning the whole improvement to the prompt. |
| Claude local search | 0/4 successful; isolated processes received an expired Keychain access-token snapshot | 4/4 successful after an unmeasured refresh/validation preflight | This was a benchmark credential-handoff bug, not driver or model randomness. |
| Copilot local search | GPT-5.4/medium: credits **-40.5%**, wall **-35.7%** | Luna/low: credits **-27.2%**, wall **-26.7%** | Both models independently favor CraftDriver; exact percentages are model-dependent. |

The earlier Copilot report at
`results/copilot-gpt54-medium-local-search-craftdriver-session-fix-2x` used
CraftDriver 1.13.0 commit `6a1a251`, which contained the then-current main branch
plus the session-reliability fixes. The final reports use the newer `996e1f7`,
which adds the prompt guidance on the same fix branch. Neither commit is the
unmodified release tag or default branch until the CraftDriver PR is merged.

## Claude Code authentication

The VS Code extension and normal `claude` process can be logged in while an
isolated benchmark still fails. The normal profile owns the macOS Keychain
credential and refresh token. The harness formerly copied only the current
access token into a fresh HOME; if that snapshot had expired, the isolated
process could not refresh it.

The harness now makes one small, unmeasured normal-profile request before the
batch, verifies the response, then injects the refreshed access token into the
fresh measured homes. The successful preflight is recorded in the Claude
manifest without storing any credential value. This final batch's preflight
passed in 4.46 seconds and the four measured trials then passed.

## Fairness and remaining uncertainty

- The task, expected answer, browser, browser mode, isolation, correctness gate,
  screenshot requirement, no-help rule, and run count are symmetric.
- Driver-specific instructions differ only where their public CLI interfaces
  differ. CraftDriver's grouping guidance is part of its shipped agent skill,
  which is part of the product surface under test.
- No measured trial invoked global help. One Codex Playwright run guessed the
  unsupported `open --headless`, failed once, recovered, and passed. The 1.87 s
  failed command is retained in the result; removing it would leave the main
  conclusion unchanged.
- Six CraftDriver runs and six Playwright runs are enough for fast regression
  feedback, not for a precise effect size or variance estimate.
- The deterministic search flow is intentionally stable but narrow. It does not
  cover a longer form, delayed UI state, file upload, iframes, or authenticated
  navigation.

I would stop prompt optimization here. More hints tailored to this exact search
flow would become benchmark gaming. The next defensible work is one or two new
deterministic task shapes, followed by the same two-run, three-agent matrix.

## Provenance and evidence

- CraftDriver: `1.13.0`, clean commit
  `996e1f794ad7a74af67e002bd6c26e15e08b49c3`.
- Browser pair: Chrome `151.0.7922.108`; ChromeDriver `151.0.7922.77`; major
  versions matched in all manifests and preflights.
- Correctness and screenshots: 12/12 structured answers passed and 12/12 final
  screenshots were preserved.
- Execution: sequential, two runs per driver, rotated driver order, fresh agent
  and browser state per trial.
- Raw evidence: retained locally below each final batch's `runs/` and
  `preflight/` directories; intentionally excluded from Git.

Final reports:

- [Codex report](results/codex-luna-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/codex-luna-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/codex-luna-low-local-search-craftdriver-v113-final-2x/manifest.json)
- [Claude report](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/claude-haiku45-low-local-search-craftdriver-v113-final-2x/manifest.json)
- [Copilot report](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/report.md)
  · [aggregate](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/aggregate.json)
  · [manifest](results/copilot-luna-low-local-search-craftdriver-v113-final-2x/manifest.json)

Historical GitHub-only reports:

- [Codex](results/codex-luna-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
- [Claude](results/claude-haiku45-low-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
- [Copilot](results/copilot-gpt54-medium-e2e-2ae939d-isolated-warm-cache-3x-02-github-login-error/report.md)
