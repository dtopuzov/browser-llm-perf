# LLM browser benchmark harness

- Keep Playwright, CraftDriver, and Vibium trial fixtures symmetric. A driver-specific instruction should differ only where their public interfaces genuinely differ.
- Never put earlier results, transcripts, or generated browser state into a new trial workspace.
- Preserve raw agent JSON/JSONL, stderr, the final structured answer, timing data, and browser artifacts for every trial, including failures.
- Run measured trials sequentially and alternate driver order. Parallel browser trials distort latency measurements through CPU, memory, and network contention.
- Pin and record the browser used by every driver. Playwright and CraftDriver use installed Google Chrome; Vibium uses its officially managed Chrome for Testing because that is its supported local CLI path. Never use Firefox, WebKit, or Safari in a comparison batch.
- Keep direct scripted CLI measurements separate from agent measurements; direct runs diagnose driver overhead but cannot claim LLM token efficiency.
- Do not weaken correctness checks to improve a driver's score. Record failures and analyze their transcripts.
- Use the deterministic local task for primary latency comparisons. Treat live-site tasks as realism checks because network and markup changes add noise.
