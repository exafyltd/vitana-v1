// VTID-03569 — regression guard for `i18n-stamp-source.mjs --flag`.
//
// THE BUG THIS PINS
//
// `--flag` is supposed to mark keys whose EN source changed since translation,
// so the translate workflow redoes them. The flagging code sits AFTER this
// guard:
//
//     if (!CHECK) { ...write stamps...; continue; }
//
// so `--flag` without `--check` never reached it. It did not no-op: it took the
// WRITE path and re-stamped every key against today's source — erasing the
// record of what each translation was made from, marking stale strings as
// current, and turning the drift gate green with the stale text still in place.
//
// The command the gate prints on its own failure is the standalone form
// (`--locale=<x> --flag`), so the documented remedy for drift was the thing that
// destroyed the evidence of it. Nothing failed and nothing warned, because a
// rewritten stamp is indistinguishable from an honest one.
//
// WHY A TEST AND NOT JUST THE FIX
//
// The fix is one boolean (`CHECK = ... || FLAG`). A later refactor that reorders
// the argument parsing, or reintroduces a separate `--check`-only branch, brings
// the whole failure back silently — the catalogs still look complete, because
// coverage counts rows and a stale row is still a row.
//
// These tests drive the REAL script against a temporary catalog rather than
// re-implementing its logic, because the defect was in control flow between two
// branches, not in either branch's arithmetic. A test that mocked the branches
// would have passed on the broken version.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..');
const SCRIPT = join('scripts', 'i18n-stamp-source.mjs');

let sandbox: string;

/**
 * A throwaway repo root holding just what the script reads: scripts/,
 * src/i18n/<locale>/ and i18n-source-stamps/. Running against the real tree
 * would mutate the committed catalogs.
 */
function makeSandbox(opts: { enNow: string; stampedFrom: string }) {
  const root = mkdtempSync(join(tmpdir(), 'i18n-stamp-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  cpSync(join(REPO, SCRIPT), join(root, SCRIPT));

  mkdirSync(join(root, 'src/i18n/en'), { recursive: true });
  mkdirSync(join(root, 'src/i18n/fr'), { recursive: true });
  writeFileSync(
    join(root, 'src/i18n/en/screens.json'),
    JSON.stringify({ settings: { searchKnowledgeBase: opts.enNow, stable: 'Save' } }, null, 2),
  );
  writeFileSync(
    join(root, 'src/i18n/fr/screens.json'),
    JSON.stringify(
      { settings: { searchKnowledgeBase: 'Rechercher dans la base', stable: 'Enregistrer' } },
      null,
      2,
    ),
  );

  // Stamp fr against the source text it was ACTUALLY translated from.
  mkdirSync(join(root, 'i18n-source-stamps'), { recursive: true });
  execFileSync('node', [SCRIPT, '--locale=fr'], { cwd: root });
  const stampPath = join(root, 'i18n-source-stamps/fr.json');
  const stamps = JSON.parse(readFileSync(stampPath, 'utf8'));
  // Rewrite EN to the older text, re-stamp, then restore "now" — this produces
  // an honest historical stamp without needing git history in the sandbox.
  writeFileSync(
    join(root, 'src/i18n/en/screens.json'),
    JSON.stringify({ settings: { searchKnowledgeBase: opts.stampedFrom, stable: 'Save' } }, null, 2),
  );
  execFileSync('node', [SCRIPT, '--locale=fr'], { cwd: root });
  writeFileSync(
    join(root, 'src/i18n/en/screens.json'),
    JSON.stringify({ settings: { searchKnowledgeBase: opts.enNow, stable: 'Save' } }, null, 2),
  );
  void stamps;
  return { root, stampPath };
}

const readFr = (root: string) =>
  JSON.parse(readFileSync(join(root, 'src/i18n/fr/screens.json'), 'utf8'));

beforeEach(() => {
  sandbox = '';
});
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

describe('i18n-stamp-source --flag', () => {
  it('flags a drifted key _pending_review without --check', () => {
    const { root } = makeSandbox({ enNow: 'Search FAQs', stampedFrom: 'Search knowledge base' });
    sandbox = root;

    execFileSync('node', [SCRIPT, '--locale=fr', '--flag'], { cwd: root, encoding: 'utf8' });

    // This is the assertion that fails on the original bug: with --flag alone
    // the script wrote stamps and never touched the catalog.
    expect(readFr(root).settings._pending_review).toEqual({ searchKnowledgeBase: true });
  });

  it('leaves the stamps untouched, so drift stays measurable until re-translated', () => {
    const { root, stampPath } = makeSandbox({
      enNow: 'Search FAQs',
      stampedFrom: 'Search knowledge base',
    });
    sandbox = root;
    const before = readFileSync(stampPath, 'utf8');

    execFileSync('node', [SCRIPT, '--locale=fr', '--flag'], { cwd: root });

    // The heart of it. Re-stamping here would assert the stale French matches
    // today's English — the gate goes green and the string is never redone.
    expect(readFileSync(stampPath, 'utf8')).toBe(before);
  });

  it('exits 0 so a CI flag step does not fail the run before the translator', () => {
    const { root } = makeSandbox({ enNow: 'Search FAQs', stampedFrom: 'Search knowledge base' });
    sandbox = root;

    // --check alone exits 1 on drift (that is its job as a gate). --flag is the
    // remediation step and must let the workflow continue to the translator.
    expect(() => execFileSync('node', [SCRIPT, '--locale=fr', '--check'], { cwd: root })).toThrow();
    expect(() => execFileSync('node', [SCRIPT, '--locale=fr', '--flag'], { cwd: root })).not.toThrow();
  });

  it('does not flag a key whose source never changed', () => {
    const { root } = makeSandbox({ enNow: 'Search FAQs', stampedFrom: 'Search knowledge base' });
    sandbox = root;

    execFileSync('node', [SCRIPT, '--locale=fr', '--flag'], { cwd: root });

    // `stable` is identical in both stamp and source. Flagging it would send
    // the whole catalog back through the translator on every run.
    expect(readFr(root).settings._pending_review).not.toHaveProperty('stable');
  });

  it('still writes stamps when called with no flags at all', () => {
    const { root, stampPath } = makeSandbox({
      enNow: 'Search FAQs',
      stampedFrom: 'Search knowledge base',
    });
    sandbox = root;
    const before = readFileSync(stampPath, 'utf8');

    // The post-translation half of the loop. Making --flag imply --check must
    // not disturb the plain write path the workflow calls afterwards.
    execFileSync('node', [SCRIPT, '--locale=fr'], { cwd: root });

    expect(readFileSync(stampPath, 'utf8')).not.toBe(before);
  });
});
