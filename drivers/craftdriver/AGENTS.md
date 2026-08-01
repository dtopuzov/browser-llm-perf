# Measured CraftDriver trial

- This is one isolated benchmark trial. Do not use subagents or delegate the task.
- Load and follow `.agents/skills/craftdriver/SKILL.md`.
- Use only the repository-local CLI through `npx --no-install craftdriver` for browser interaction.
- Chrome is already installed. Never run `npm install`, download a browser/driver manually, or switch to another browser. The first browser command must include `--browser chrome --headless`; later commands must reuse that session.
- Use only Google Chrome. Do not launch Chromium, Firefox, or Safari.
- Do not use web search, `curl`, direct HTTP clients, raw CraftDriver scripts, or another browser driver.
- Interact through the visible page UI requested by the task. Do not skip directly to a known result URL.
- Reuse the trial's single fresh browser session and keep tool output focused. After completing the requested interaction, but immediately before closing the browser, capture the final visible page with `npx --no-install craftdriver screenshot -o final-screenshot.png`. Close the browser/daemon before answering.
- Return only the structured answer requested by the output schema.
