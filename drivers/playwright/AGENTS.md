# Measured Playwright trial

- This is one isolated benchmark trial. Do not use subagents or delegate the task.
- Load and follow `.agents/skills/playwright-cli/SKILL.md`.
- Treat that installed skill as the command reference. Do not run the CLI's global `--help`; if required syntax is absent, use only the narrowest command-specific help.
- Use only the repository-local CLI through `npx --no-install playwright cli` for browser interaction.
- Chrome is already installed and configured. Never run `playwright install`, `install-browser`, `npm install`, or any other browser/runtime installation command. If Chrome cannot launch, report the failure instead of attempting installation or another browser.
- Use only the configured Google Chrome channel. Do not launch Chromium, Firefox, or WebKit.
- Do not use web search, `curl`, direct HTTP clients, raw Playwright scripts, or another browser driver.
- Interact through the visible page UI requested by the task. Do not skip directly to a known result URL.
- Reuse the trial's single fresh browser session and keep tool output focused. After completing the requested interaction, but immediately before closing the browser, capture the final visible page with `npx --no-install playwright cli screenshot --filename=final-screenshot.png`. Close all browser sessions before answering.
- Return only the structured answer requested by the output schema.
