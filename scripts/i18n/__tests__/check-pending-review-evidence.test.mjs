// VTID-05761 — unit and end-to-end tests for scripts/i18n/check-pending-review-evidence.mjs.
// Run: node --test scripts/i18n/__tests__/*.test.mjs
// The end-to-end tests build throwaway git repositories under the OS temp dir; they never touch a real checkout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../check-pending-review-evidence.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, '..', 'check-pending-review-evidence.mjs');
const CATALOG = 'src/i18n/fr/settingsNative.json';
const RECORD_DIR = 'docs/validation/VTID-05761/review';
const SHA = 'a'.repeat(64);
const TS = '2026-11-12T10:00:00Z';

function record(overrides = {}) {
  return {
    key_path: 'settingsNative.notifications.chat',
    catalog_file: CATALOG,
    locale: 'fr',
    value: 'Chat',
    verdict: 'pass',
    reviewer_model: 'test-model',
    timestamp: TS,
    prompt_sha256: SHA,
    ...overrides,
  };
}

const wrap = (data, file = `${RECORD_DIR}/fr__settingsNative__settingsNative.notifications.chat.json`) => ({ file, data });
const flagged = { settingsNative: { notifications: { chat: 'Chat', _pending_review: { chat: true } } } };
const unflagged = { settingsNative: { notifications: { chat: 'Chat' } } };
const removedFor = (base, head) => C.removedFlags({ catalogFile: CATALOG, locale: 'fr', base, head });

test('flaggedPaths returns the value a flag leaf covers', () => {
  assert.deepEqual(C.flaggedPaths(flagged).map(C.keyPathOf), ['settingsNative.notifications.chat']);
  assert.deepEqual(C.flaggedPaths(unflagged), []);
});

test('removedFlags lists a flag gone from head, with the head value', () => {
  const removed = removedFor(flagged, unflagged);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].keyPath, 'settingsNative.notifications.chat');
  assert.equal(removed[0].value, 'Chat');
});

test('removedFlags ignores a flag that is still in head', () => {
  assert.deepEqual(removedFor(flagged, flagged), []);
});

test('removedFlags reports every flag of a file deleted in head', () => {
  const removed = removedFor(flagged, undefined);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].value, undefined);
});

test('an empty flag covers the object that holds it, so removing it needs a record for that object', () => {
  const base = { settingsNative: { notifications: { chat: 'Chat', _pending_review: {} } } };
  const head = { settingsNative: { notifications: { chat: 'Chat' } } };
  const removed = removedFor(base, head);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].keyPath, 'settingsNative.notifications');
  assert.equal(C.evaluateRemoved(removed, []).length, 1);
  const rec = record({ key_path: 'settingsNative.notifications', value: { chat: 'Chat' } });
  assert.deepEqual(C.evaluateRemoved(removed, [wrap(rec)]), []);
  const stale = record({ key_path: 'settingsNative.notifications', value: { chat: 'Chat (alt)' } });
  assert.equal(C.evaluateRemoved(removed, [wrap(stale)]).length, 1);
});

test('a removed flag with no record fails and names the key path and locale', () => {
  const failures = C.evaluateRemoved(removedFor(flagged, unflagged), []);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /fr settingsNative\.notifications\.chat/);
  assert.match(failures[0], /no reviewer record/);
});

test('a matching pass record clears the removed flag', () => {
  assert.deepEqual(C.evaluateRemoved(removedFor(flagged, unflagged), [wrap(record())]), []);
});

test('a matching reject record fails the removed flag', () => {
  const failures = C.evaluateRemoved(removedFor(flagged, unflagged), [wrap(record({ verdict: 'reject' }))]);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /newest reviewer record is "reject"/);
});

test('a pass record for a different value does not clear the flag', () => {
  const failures = C.evaluateRemoved(removedFor(flagged, unflagged), [wrap(record({ value: 'Chat (ancien)' }))]);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /no reviewer record/);
});

test('a pass record for another locale does not clear the flag', () => {
  const failures = C.evaluateRemoved(removedFor(flagged, unflagged), [wrap(record({ locale: 'de' }))]);
  assert.equal(failures.length, 1);
});

test('a pass record for another catalog file does not clear the flag', () => {
  const failures = C.evaluateRemoved(removedFor(flagged, unflagged), [wrap(record({ catalog_file: 'src/i18n/fr/other.json' }))]);
  assert.equal(failures.length, 1);
});

test('the newest record for the value decides', () => {
  const passOld = wrap(record({ timestamp: '2026-11-01T10:00:00Z' }), `${RECORD_DIR}/a.json`);
  const rejectNew = wrap(record({ verdict: 'reject', timestamp: '2026-11-12T10:00:00Z' }), `${RECORD_DIR}/b.json`);
  const removed = removedFor(flagged, unflagged);
  assert.equal(C.evaluateRemoved(removed, [passOld, rejectNew]).length, 1, 'reject is newer, so it fails');
  const rejectOld = { file: rejectNew.file, data: { ...rejectNew.data, timestamp: '2026-10-01T10:00:00Z' } };
  assert.deepEqual(C.evaluateRemoved(removed, [rejectOld, passOld]), [], 'pass is newer, so it clears');
});

test('a reject and a pass at the same newest timestamp fail', () => {
  const pass = wrap(record(), `${RECORD_DIR}/a.json`);
  const reject = wrap(record({ verdict: 'reject' }), `${RECORD_DIR}/b.json`);
  assert.equal(C.evaluateRemoved(removedFor(flagged, unflagged), [pass, reject]).length, 1);
});

test('validateRecord accepts a well-formed record', () => {
  assert.deepEqual(C.validateRecord(record()), []);
});

test('validateRecord reports each broken field', () => {
  const errors = C.validateRecord(record({ verdict: 'maybe', prompt_sha256: 'XYZ', timestamp: 'yesterday', reviewer_model: ' ' }));
  assert.equal(errors.length, 4);
  assert.ok(errors.some((e) => /verdict/.test(e)));
  assert.ok(errors.some((e) => /prompt_sha256/.test(e)));
  assert.ok(errors.some((e) => /timestamp/.test(e)));
  assert.ok(errors.some((e) => /reviewer_model/.test(e)));
});

test('validateRecord reports a missing field', () => {
  const rec = record();
  delete rec.value;
  assert.deepEqual(C.validateRecord(rec), ['missing field value']);
});

// ---- end-to-end: throwaway git repositories -------------------------------------------------------------------------

function makeRepo(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pending-review-evidence-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, ['init', '-q', '-b', 'main']);
  return dir;
}

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.invalid',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.invalid',
    },
  }).trim();
}

function commit(dir, files, message) {
  for (const [rel, data] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', message]);
}

function runCli(dir, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
}

test('e2e: removing a flag with no record exits 1 and names the value', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  git(dir, ['checkout', '-q', '-b', 'feat']);
  commit(dir, { [CATALOG]: unflagged }, 'remove flag');
  const r = runCli(dir, ['--base', 'main', '--head', 'feat']);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL fr settingsNative\.notifications\.chat/);
});

test('e2e: removing a flag with a passing record committed on the same head exits 0', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  git(dir, ['checkout', '-q', '-b', 'feat']);
  commit(dir, { [CATALOG]: unflagged, [`${RECORD_DIR}/fr__settingsNative__settingsNative.notifications.chat.json`]: record() }, 'remove flag with record');
  const r = runCli(dir, ['--base', 'main', '--head', 'feat']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /every removed _pending_review flag has a passing reviewer record/);
});

test('e2e: a flag still present on head needs no record and exits 0', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  git(dir, ['checkout', '-q', '-b', 'feat']);
  commit(dir, { 'src/i18n/fr/other.json': { ok: 'x' } }, 'unrelated');
  const r = runCli(dir, ['--base', 'main', '--head', 'feat']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /nothing to check/);
});

test('e2e: a flag removed outside src/i18n is not checked', (t) => {
  const dir = makeRepo(t);
  commit(dir, { 'src/other/x.json': flagged }, 'base');
  git(dir, ['checkout', '-q', '-b', 'feat']);
  commit(dir, { 'src/other/x.json': unflagged }, 'remove outside i18n');
  const r = runCli(dir, ['--base', 'main', '--head', 'feat']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('e2e: a malformed record fails even when no flag was removed', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  git(dir, ['checkout', '-q', '-b', 'feat']);
  commit(dir, { [`${RECORD_DIR}/bad.json`]: record({ verdict: 'maybe' }) }, 'bad record');
  const r = runCli(dir, ['--base', 'main', '--head', 'feat']);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /verdict must be/);
});

test('e2e: an unknown base revision exits 2', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  const r = runCli(dir, ['--base', 'no-such-ref', '--head', 'main']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown revision no-such-ref/);
});

test('e2e: bad arguments exit 2', (t) => {
  const dir = makeRepo(t);
  commit(dir, { [CATALOG]: flagged }, 'base');
  const r = runCli(dir, ['--nope']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown argument --nope/);
});
