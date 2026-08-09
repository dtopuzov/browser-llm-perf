import assert from 'node:assert/strict';
import test from 'node:test';
import { craftdriverRefFromSnapshot } from './craftdriver-output.mjs';

test('extracts refs nested under semantic containers', () => {
  const stdout = JSON.stringify({
    ok: true,
    result: {
      lines: [
        'e1: search "Search the knowledge base" (container)',
        '  e2: searchbox "Search the knowledge base" #query',
        '  e3: button "Search"',
      ],
    },
  });
  assert.equal(
    craftdriverRefFromSnapshot(stdout, 'searchbox', 'Search the knowledge base'),
    'e2',
  );
  assert.equal(craftdriverRefFromSnapshot(stdout, 'button', 'Search'), 'e3');
});

test('scans past non-JSON daemon output', () => {
  const stdout = [
    'daemon started',
    JSON.stringify({ ok: true, result: { lines: ['e7: link "Telerik"'] } }),
  ].join('\n');
  assert.equal(craftdriverRefFromSnapshot(stdout, 'link', 'Telerik'), 'e7');
});
