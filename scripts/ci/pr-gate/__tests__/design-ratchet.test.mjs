// VTID-05107 — unit tests for the Spotlight design ratchet (ratchet-design).
// Run: node --test scripts/ci/pr-gate/__tests__/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../lib.mjs';

const ROOT = '/repo';
const report = (file, ruleIds) => ({ filePath: `${ROOT}/${file}`, errorCount: ruleIds.length, messages: ruleIds.map((ruleId) => ({ ruleId, severity: 2 })) });
const baseline = (counts) => JSON.stringify({ kind: 'design', counts });

test('countDesign counts only design/* errors, per file', () => {
  const counts = L.countDesign(
    [
      report('src/pages/A.tsx', ['design/no-raw-palette', 'design/no-physical-direction', 'i18n/no-raw-jsx-text']),
      report('src/pages/B.tsx', ['i18n/no-raw-jsx-text']),
      { filePath: `${ROOT}/src/pages/C.tsx`, errorCount: 0, messages: [{ ruleId: 'design/no-raw-palette', severity: 1 }] },
    ],
    ROOT,
  );
  assert.deepEqual(counts, { 'src/pages/A.tsx': 2 });
});

test('a PR that raises a count fails even when it also raises its own baseline file', () => {
  const pick = L.chooseDesignBaseline({
    changed: ['src/pages/A.tsx', 'scripts/ci/pr-gate/baseline/design.json'],
    baseText: baseline({ 'src/pages/A.tsx': 2 }),
    headText: baseline({ 'src/pages/A.tsx': 5 }),
  });
  assert.equal(pick.source, 'base commit');
  const r = L.compareRatchet(pick.counts, { 'src/pages/A.tsx': 3 });
  assert.equal(r.ok, false);
  assert.deepEqual(r.worse, [{ file: 'src/pages/A.tsx', baseline: 2, now: 3 }]);
});

test('a new file with any design violation fails (its baseline is 0)', () => {
  const pick = L.chooseDesignBaseline({ changed: ['src/pages/New.tsx'], baseText: baseline({}), headText: baseline({ 'src/pages/New.tsx': 1 }) });
  assert.equal(L.compareRatchet(pick.counts, { 'src/pages/New.tsx': 1 }).ok, false);
});

test('lowering counts passes and is reported as improved', () => {
  const pick = L.chooseDesignBaseline({ changed: ['src/pages/A.tsx'], baseText: baseline({ 'src/pages/A.tsx': 4 }), headText: null });
  const r = L.compareRatchet(pick.counts, { 'src/pages/A.tsx': 1 });
  assert.equal(r.ok, true);
  assert.equal(r.better.length, 1);
});

test('only a PR that changes eslint-rules/design/** is measured against its own head baseline', () => {
  const pick = L.chooseDesignBaseline({
    changed: ['eslint-rules/design/no-raw-palette.js', 'scripts/ci/pr-gate/baseline/design.json'],
    baseText: baseline({ 'src/pages/A.tsx': 2 }),
    headText: baseline({ 'src/pages/A.tsx': 9 }),
  });
  assert.match(pick.source, /^head/);
  assert.equal(L.compareRatchet(pick.counts, { 'src/pages/A.tsx': 9 }).ok, true);
});

test('missing or unreadable baselines read as empty', () => {
  assert.deepEqual(L.chooseDesignBaseline({ changed: [], baseText: null, headText: null }).counts, {});
  assert.deepEqual(L.chooseDesignBaseline({ changed: [], baseText: '{not json', headText: null }).counts, {});
});
