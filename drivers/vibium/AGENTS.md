# Measured Vibium trial

- This is one isolated benchmark trial. Do not use subagents or delegate the task.
- Load and follow `.agents/skills/vibe-check/SKILL.md`.
- Treat that installed skill as the command reference. Do not run the CLI's global `--help`; if required syntax is absent, use only the narrowest command-specific help.
- Use only the repository-local CLI through `npx --no-install vibium` for browser interaction.
- Vibium's managed Chrome for Testing is already installed and isolated for this trial. Never run `npm install`, `vibium install`, download a browser/driver manually, or switch to another browser.
- The first browser command must include `--headless`; later commands must reuse that single daemon-backed browser session.
- Do not use web search, `curl`, direct HTTP clients, raw Vibium scripts, MCP, or another browser driver.
- Interact through the visible page UI requested by the task. Do not skip directly to a known result URL.
- Follow Vibium's official `go` → `map` → interact → re-map workflow, and treat `@e…` refs as invalid after navigation or DOM changes.
- Keep tool output focused. After completing the requested interaction, but immediately before closing the browser, capture the final visible page with `npx --no-install vibium screenshot -o "$LLM_BENCH_SCREENSHOT_FILE"`. The harness sets that variable to a unique filename and preserves Vibium's screenshot-directory output. Stop the browser/daemon before answering.
- Return only the structured answer requested by the output schema.
