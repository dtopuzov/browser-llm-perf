import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertMatchingChromeDriver,
  versionMajor,
} from './chrome-driver-provenance.mjs';

test('versionMajor reads branded browser and bare driver versions', () => {
  assert.equal(versionMajor('Google Chrome 151.0.8000.10', 'Chrome'), 151);
  assert.equal(versionMajor('151.0.8000.20', 'ChromeDriver'), 151);
});

test('assertMatchingChromeDriver accepts equal majors', () => {
  assert.deepEqual(
    assertMatchingChromeDriver({
      chrome: {
        executable: '/Applications/Google Chrome',
        numericVersion: '151.0.8000.10',
      },
      chromedriver: { executable: '/cache/chromedriver', version: '151.0.8000.20' },
    }),
    { chromeMajor: 151, chromedriverMajor: 151, majorMatch: true },
  );
});

test('assertMatchingChromeDriver rejects mismatches with both paths', () => {
  assert.throws(
    () =>
      assertMatchingChromeDriver({
        chrome: {
          executable: '/Applications/Google Chrome',
          numericVersion: '151.0.8000.10',
        },
        chromedriver: { executable: '/cache/chromedriver-150', version: '150.0.7000.20' },
      }),
    (error) => {
      assert.match(error.message, /aborted before preflight/);
      assert.match(error.message, /Google Chrome/);
      assert.match(error.message, /chromedriver-150/);
      return true;
    },
  );
});
