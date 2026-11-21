#!/usr/bin/env node
// VTID-05761 — every `_pending_review` flag removed in a diff needs a passing reviewer record.
//
// For each src/i18n/<locale>/*.json file changed between the merge-base of --base and --head and --head, the checker
// collects the values whose `_pending_review` flag exists at the merge-base but not at --head. Each such value needs a
// record in --review-dir (read from the --head commit) with the same catalog_file, locale and key_path, the exact same
// value, and a newest-by-timestamp verdict of "pass". Format: docs/validation/VTID-05761/review/README.md.
//
// Run:  node scripts/i18n/check-pending-review-evidence.mjs [--base origin/main] [--head HEAD] [--review-dir <dir>]
// Exit: 0 every removed flag has a passing record (or none was removed); 1 a removed flag has no passing record, or a
//       record is malformed; 2 bad arguments or an unknown git revision.
// Tests: node --test scripts/i18n/__tests__/*.test.mjs

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const FLAG_KEY = '_pending_review';
export const DEFAULT_REVIEW_DIR = 'docs/validation/VTID-05761/review';
export const RECORD_FIELDS = ['key_path', 'catalog_file', 'locale', 'value', 'verdict', 'reviewer_model', 'timestamp', 'prompt_sha256'];

const CATALOG_RE = /^src\/i18n\/([^/]+)\/.+\.json$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const USAGE = 'usage: check-pending-review-evidence.mjs [--base <rev>] [--head <rev>] [--review-dir <dir>]';

class UsageError extends Error {}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Segment paths of every value a `_pending_review` flag covers. The flag `{"notifications": {"_pending_review": {"chat": true}}}`
// covers `notifications.chat`. An empty flag (or a non-object one) has no leaves, so it covers the whole object that holds
// it: `{"notifications": {"_pending_review": {}}}` covers `notifications`. Removing it still needs a record.
export function flaggedPaths(node, at = [], out = []) {
  if (!isPlainObject(node)) return out;
  for (const [key, child] of Object.entries(node)) {
    if (key === FLAG_KEY) {
      if (isPlainObject(child) && Object.keys(child).length > 0) flagLeaves(child, at, out);
      else out.push(at);
    } else {
      flaggedPaths(child, [...at, key], out);
    }
  }
  return out;
}

function flagLeaves(flag, at, out) {
  for (const [key, child] of Object.entries(flag)) {
    if (isPlainObject(child)) flagLeaves(child, [...at, key], out);
    else out.push([...at, key]);
  }
}

export const keyPathOf = (segments) => segments.join('.');

// The value at a segment path, or undefined when the path does not exist.
export function valueAt(root, segments) {
  let cur = root;
  for (const s of segments) {
    if (!isPlainObject(cur) || !Object.prototype.hasOwnProperty.call(cur, s)) return undefined;
    cur = cur[s];
  }
  return cur;
}

// Stable JSON text for comparing values. An absent value is compared as null.
export function canonical(v) {
  if (v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (isPlainObject(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

// Values whose flag is in `base` and not in `head`. A missing file counts as having no values.
export function removedFlags({ catalogFile, locale, base, head }) {
  const stillFlagged = new Set(flaggedPaths(head).map(keyPathOf));
  const seen = new Set();
  const out = [];
  for (const segments of flaggedPaths(base)) {
    const keyPath = keyPathOf(segments);
    if (stillFlagged.has(keyPath) || seen.has(keyPath)) continue;
    seen.add(keyPath);
    out.push({ catalogFile, locale, keyPath, segments, value: valueAt(head, segments) });
  }
  return out;
}

// Problems with one record file's content. An empty array means the record is well formed.
export function validateRecord(rec) {
  if (!isPlainObject(rec)) return ['record is not a JSON object'];
  const errors = RECORD_FIELDS.filter((f) => !(f in rec)).map((f) => `missing field ${f}`);
  if (typeof rec.key_path !== 'string' || rec.key_path === '') errors.push('key_path must be a non-empty string');
  if (typeof rec.catalog_file !== 'string' || rec.catalog_file === '') errors.push('catalog_file must be a non-empty string');
  if (typeof rec.locale !== 'string' || rec.locale === '') errors.push('locale must be a non-empty string');
  if (!['pass', 'reject'].includes(rec.verdict)) errors.push('verdict must be "pass" or "reject"');
  if (typeof rec.reviewer_model !== 'string' || rec.reviewer_model.trim() === '') errors.push('reviewer_model must be a non-empty string');
  if (typeof rec.timestamp !== 'string' || !ISO_RE.test(rec.timestamp) || Number.isNaN(Date.parse(rec.timestamp))) {
    errors.push('timestamp must be an ISO-8601 date-time string');
  }
  if (typeof rec.prompt_sha256 !== 'string' || !SHA256_RE.test(rec.prompt_sha256)) errors.push('prompt_sha256 must be 64 lowercase hex characters');
  return errors;
}

// Failure messages for removed flags. `records` are { file, data } objects that already passed validateRecord.
export function evaluateRemoved(removed, records) {
  const failures = [];
  for (const r of removed) {
    const where = `${r.locale} ${r.keyPath} (${r.catalogFile})`;
    if (r.segments.length === 0) {
      failures.push(`${r.catalogFile}: a flag at the top of a catalog file cannot be addressed by key_path`);
      continue;
    }
    if (r.segments.some((s) => s.includes('.'))) {
      failures.push(`${where}: a key contains "." and cannot be addressed by key_path`);
      continue;
    }
    const want = canonical(r.value);
    const matches = records.filter(({ data }) => data.catalog_file === r.catalogFile
      && data.locale === r.locale
      && data.key_path === r.keyPath
      && canonical(data.value) === want);
    if (matches.length === 0) {
      failures.push(`${where}: _pending_review flag removed with no reviewer record for this value`);
      continue;
    }
    // The newest record for this value decides. A reject at the same newest timestamp as a pass also fails.
    const newest = Math.max(...matches.map((m) => Date.parse(m.data.timestamp)));
    const top = matches.filter((m) => Date.parse(m.data.timestamp) === newest);
    const rejected = top.find((m) => m.data.verdict !== 'pass');
    if (rejected) failures.push(`${where}: newest reviewer record is "${rejected.data.verdict}" (${rejected.file})`);
  }
  return failures;
}

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function gitOrNull(cwd, args) {
  try {
    return git(cwd, args);
  } catch {
    return null;
  }
}

function resolveCommit(cwd, rev) {
  const sha = gitOrNull(cwd, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]);
  if (sha === null) throw new Error(`unknown revision ${rev}`);
  return sha.trim();
}

function readCatalog(cwd, rev, file) {
  const text = gitOrNull(cwd, ['show', `${rev}:${file}`]);
  return text === null ? undefined : JSON.parse(text);
}

// Runs the whole check against git history. Throws only for git errors; content problems go into `failures`.
export function checkPendingReviewEvidence({ cwd = process.cwd(), base = 'origin/main', head = 'HEAD', reviewDir = DEFAULT_REVIEW_DIR } = {}) {
  const baseSha = resolveCommit(cwd, base);
  const headSha = resolveCommit(cwd, head);
  const mergeBase = git(cwd, ['merge-base', baseSha, headSha]).trim();
  const changed = git(cwd, ['diff', '--name-only', '--no-renames', mergeBase, headSha, '--', 'src/i18n'])
    .split('\n')
    .filter(Boolean);

  const removed = [];
  const failures = [];
  for (const file of changed) {
    const m = CATALOG_RE.exec(file);
    if (!m) continue;
    let baseObj;
    let headObj;
    try {
      baseObj = readCatalog(cwd, mergeBase, file);
      headObj = readCatalog(cwd, headSha, file);
    } catch (e) {
      failures.push(`${file}: not valid JSON (${e.message})`);
      continue;
    }
    removed.push(...removedFlags({ catalogFile: file, locale: m[1], base: baseObj, head: headObj }));
  }

  const records = [];
  const listing = git(cwd, ['ls-tree', '-r', '--name-only', headSha, '--', reviewDir]).split('\n').filter((p) => p.endsWith('.json'));
  for (const file of listing) {
    let data;
    try {
      data = JSON.parse(git(cwd, ['show', `${headSha}:${file}`]));
    } catch (e) {
      failures.push(`${file}: not valid JSON (${e.message})`);
      continue;
    }
    const errors = validateRecord(data);
    if (errors.length > 0) failures.push(...errors.map((msg) => `${file}: ${msg}`));
    else records.push({ file, data });
  }

  failures.push(...evaluateRemoved(removed, records));
  return { baseSha, headSha, mergeBase, removed, records, failures };
}

function parseArgs(argv) {
  const opts = { base: 'origin/main', head: 'HEAD', reviewDir: DEFAULT_REVIEW_DIR };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${arg} needs a value`);
      return v;
    };
    if (arg === '--base') opts.base = value();
    else if (arg === '--head') opts.head = value();
    else if (arg === '--review-dir') opts.reviewDir = value();
    else throw new UsageError(`unknown argument ${arg}`);
  }
  return opts;
}

export function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    console.error(USAGE);
    return 2;
  }
  let result;
  try {
    result = checkPendingReviewEvidence(opts);
  } catch (e) {
    console.error(`check-pending-review-evidence: ${e.message}`);
    return 2;
  }
  const { removed, failures } = result;
  if (removed.length === 0 && failures.length === 0) {
    console.log(`no _pending_review flag removed between ${opts.base} and ${opts.head}; nothing to check`);
    return 0;
  }
  console.log(`checked ${removed.length} removed _pending_review value(s) between ${opts.base} and ${opts.head}, ${result.records.length} valid record(s) in ${opts.reviewDir}`);
  for (const msg of failures) console.log(`FAIL ${msg}`);
  if (failures.length > 0) {
    console.log(`${failures.length} problem(s)`);
    return 1;
  }
  console.log('every removed _pending_review flag has a passing reviewer record');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
