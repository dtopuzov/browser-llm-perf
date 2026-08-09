import { inspectChromeDriverResolution } from 'craftdriver';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export function versionMajor(version, label) {
  const match = String(version ?? '').match(/(?:^|\D)(\d+)(?:\.\d+){1,3}/);
  if (!match) throw new Error(`Cannot determine ${label} major version from: ${version ?? 'no output'}`);
  return Number(match[1]);
}

export function assertMatchingChromeDriver({ chrome, chromedriver }) {
  const chromeMajor = versionMajor(chrome.numericVersion ?? chrome.version, 'Google Chrome');
  const chromedriverMajor = versionMajor(chromedriver.version, 'ChromeDriver');
  if (chromeMajor !== chromedriverMajor) {
    throw new Error(
      [
        'CraftDriver Chrome/ChromeDriver major mismatch; benchmark aborted before preflight.',
        `Chrome ${chrome.numericVersion ?? chrome.version} at ${chrome.executable}`,
        `ChromeDriver ${chromedriver.version} at ${chromedriver.executable}`,
      ].join('\n'),
    );
  }
  return { chromeMajor, chromedriverMajor, majorMatch: true };
}

export async function inspectCraftDriverChromeProvenance(installedChrome) {
  const resolution = await inspectChromeDriverResolution({
    browserPath: installedChrome.executable,
  });
  if (!resolution.browserVersion) {
    throw new Error(
      `CraftDriver could not read the selected Chrome version at ${installedChrome.executable}`,
    );
  }
  if (!resolution.driverVersion) {
    throw new Error(
      `CraftDriver could not read the resolved ChromeDriver version at ${resolution.driverPath}`,
    );
  }
  if (resolution.browserVersion !== installedChrome.numericVersion) {
    throw new Error(
      `CraftDriver detected Chrome ${resolution.browserVersion}, but the harness detected ${installedChrome.numericVersion} at ${installedChrome.executable}`,
    );
  }

  const chrome = {
    source: 'installed Google Chrome',
    executable: installedChrome.executable,
    version: installedChrome.version,
    numericVersion: installedChrome.numericVersion,
  };
  const chromedriver = {
    source: 'CraftDriver resolution',
    executable: resolution.driverPath,
    version: resolution.driverVersion,
  };
  return {
    source: 'CraftDriver resolved local browser/driver pair',
    chrome,
    chromedriver,
    ...assertMatchingChromeDriver({ chrome, chromedriver }),
  };
}

export async function recordCraftDriverChromeProvenance(installedChrome, artifactPath) {
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  try {
    const provenance = await inspectCraftDriverChromeProvenance(installedChrome);
    await fs.writeFile(
      artifactPath,
      `${JSON.stringify({ checkedAt: new Date().toISOString(), passed: true, ...provenance }, null, 2)}\n`,
    );
    return provenance;
  } catch (error) {
    await fs.writeFile(
      artifactPath,
      `${JSON.stringify({
        checkedAt: new Date().toISOString(),
        passed: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      }, null, 2)}\n`,
    );
    throw error;
  }
}
