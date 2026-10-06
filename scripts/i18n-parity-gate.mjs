#!/usr/bin/env node
// One command, one verdict per locale, across every surface. (VTID-03509)
//
// WHY THIS EXISTS
//
// "Is language X ready?" had no single answer. There were five checks in this
// repo and two in vitana-platform, each reporting its own slice, and the GA
// gate documented in LanguageContext listed five conditions — **all five of
// which only look at src/i18n/**. That gate cannot see DB-backed content, so
// es, sr and fr all reached `ga` while `nav_catalog_i18n` held ZERO rows for
// them: a fully translated UI whose Navigator still answers in German.
// (VTID-04880: the Navigator now reads the screen registry, so that surface is
// checked from its files; the old table was archived.)
//
// A locale is ready when SIX surfaces agree, not when one does:
//
//   1. UI catalog      — every DE key present            (i18n-audit)
//   2. Review queue    — nothing left _pending_review
//   3. Placeholders    — no broken {token} interpolation
//   4. Freshness       — no drift vs the source it was translated from
//   5. Register        — informal voice, per-language rule
//   6. Content outside src/i18n:
//      6a. Navigation — src/navigation/registry: a title for every screen in
//          every target locale (files, always checked)
//      6b. My Journey — journey_checklist_translations: every field of every
//          topic, compared with the English reference (database)
//
// Surfaces 1-5 and 6a are files and always checked. 6b needs database access;
// when that is unavailable the locale is reported UNKNOWN, never PASS — a gate
// that silently drops the one surface it was built to add would be worse than
// no gate at all, because it would grant the same false confidence that let
// es/sr/fr ship.
//
// Usage:
//   node scripts/i18n-parity-gate.mjs              # ga locales must pass
//   node scripts/i18n-parity-gate.mjs --all        # include beta
//   node scripts/i18n-parity-gate.mjs --report-only

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORT_ONLY = process.argv.includes('--report-only');
const INCLUDE_BETA = process.argv.includes('--all');

function envValue(key) {
  if (process.env[key]) return process.env[key];
  try {
    const line = readFileSync(join(ROOT, '.env'), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

function run(script, args) {
  try {
    return { ok: true, out: execFileSync('node', [join(__dirname, script), ...args], { encoding: 'utf8' }) };
  } catch (err) {
    return { ok: false, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

function pickerLocales() {
  const src = readFileSync(join(ROOT, 'src/contexts/LanguageContext.tsx'), 'utf8');
  const block = src.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  const out = new Map();
  for (const m of block.matchAll(/value:\s*"([a-z]{2})-[A-Za-z]+",\s*status:\s*'(\w+)'/g)) out.set(m[1], m[2]);
  return out;
}

// ---------------------------------------------------------------------------
// Surfaces 1-3: the catalog audit, parsed once for every locale.
// ---------------------------------------------------------------------------
const auditOut = run('i18n-audit.mjs', ['--report-only']).out;
const coverage = new Map();
for (const m of auditOut.matchAll(/^\s{2}([a-z]{2})\s+(\w+)\s+([\d.]+)%\s+\((\d+)\/(\d+)\)/gm)) {
  coverage.set(m[1], { pct: Number(m[3]), have: Number(m[4]), total: Number(m[5]) });
}
const placeholderBad = new Set();
for (const m of auditOut.matchAll(/\[(\w{2})\]\s+\S+:\s+"[^"]+"\s+placeholder mismatch/g)) {
  placeholderBad.add(m[1]);
}
const pendingBad = new Set();
for (const m of auditOut.matchAll(/^\s*(?:ERROR|WARN)\s+\[(\w{2})\].*_pending_review/gm)) pendingBad.add(m[1]);

// Counted directly — the audit only reports _pending_review as an error for
// `ga` locales, so a beta locale with 1,500 flagged keys would look clean here.
function pendingCount(locale) {
  const dir = join(ROOT, 'src/i18n', locale);
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json') || f.includes('_audit')) continue;
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if (k === '_pending_review' && v && typeof v === 'object') n += Object.values(v).filter(Boolean).length;
        else if (v && typeof v === 'object') walk(v);
      }
    };
    walk(JSON.parse(readFileSync(join(dir, f), 'utf8')));
  }
  return n;
}

// ---------------------------------------------------------------------------
// Surface 4: freshness. "No stamps" is UNKNOWN, not PASS.
// ---------------------------------------------------------------------------
const staleOut = run('i18n-stamp-source.mjs', ['--check-all']).out;
const drift = new Map();
for (const m of staleOut.matchAll(/^\[stamp\] (\w{2}): (\d+) key\(s\) whose/gm)) drift.set(m[1], Number(m[2]));
const unstamped = new Set([...staleOut.matchAll(/^\[stamp\] (\w{2}): NO STAMPS YET/gm)].map((m) => m[1]));

// ---------------------------------------------------------------------------
// Surface 5: register.
// ---------------------------------------------------------------------------
const regOut = run('i18n-register-check.mjs', ['--all', '--report-only']).out;
const register = new Map();
for (const m of regOut.matchAll(/^\[register\] (\w{2}) \([^)]+\) — (\d+) violation/gm)) register.set(m[1], Number(m[2]));

// ---------------------------------------------------------------------------
// Surface 6a: navigation — the screen registry's titles (files).
// ---------------------------------------------------------------------------
const REGISTRY = join(ROOT, 'src/navigation/registry');
const registryScreens = JSON.parse(readFileSync(join(REGISTRY, 'screens.json'), 'utf8')).screens ?? [];
function navTitleGaps(code) {
  const titleOf = (s) => {
    if (code === 'en' || code === 'de') return s.i18n?.[code]?.title;
    const file = join(REGISTRY, 'locales', `${code}.json`);
    if (!existsSync(file)) return undefined;
    navLocaleCache[code] ??= JSON.parse(readFileSync(file, 'utf8'));
    return navLocaleCache[code][s.id]?.title;
  };
  return registryScreens.filter((s) => !String(titleOf(s) ?? '').trim()).length;
}
const navLocaleCache = {};

// ---------------------------------------------------------------------------
// Surface 6b: My Journey curriculum (DB). Requires service-role; UNKNOWN without it.
// ---------------------------------------------------------------------------
const CHECKLIST_FIELDS = [
  'display_label', 'short_description', 'explanation_what_it_is',
  'explanation_user_benefit', 'explanation_when_to_use', 'explanation_try_this',
];
const completeFilter = `and=(${CHECKLIST_FIELDS.map((f) => `${f}.not.is.null,${f}.neq.`).join(',')})`;
const SUPABASE_URL = envValue('VITE_SUPABASE_URL');
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE ?? '';
const dbCoverage = new Map();
let dbChecked = false;
let dbWhy = 'SUPABASE_SERVICE_ROLE not set';

if (SUPABASE_URL && SERVICE_ROLE) {
  const q = async (path) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const range = res.headers.get('content-range') ?? '';
    return Number(range.split('/')[1] ?? 0);
  };
  try {
    // Same rule as ci_vital_systems_health(): a row counts only when every
    // translatable field is filled, against the English reference count. 'de'
    // is the source language and 'en' the reference (VTID-03679).
    const expected = await q('journey_checklist_translations?select=topic_id&locale=eq.en&limit=1');
    for (const [code] of pickerLocales()) {
      if (code === 'en' || code === 'de') continue;
      const complete = await q(`journey_checklist_translations?select=topic_id&locale=eq.${code}&${completeFilter}&limit=1`);
      dbCoverage.set(code, { complete, expected });
    }
    dbChecked = true;
  } catch (err) {
    dbWhy = `query failed: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------
const picker = pickerLocales();
const targets = [...picker.entries()].filter(
  ([code, st]) => code !== 'de' && (st === 'ga' || (INCLUDE_BETA && st === 'beta')),
);

const rows = [];
let failures = 0;
let unknowns = 0;

for (const [code, status] of targets) {
  const cov = coverage.get(code);
  const checks = [];
  const fail = (s) => { checks.push(`FAIL ${s}`); return 1; };

  let bad = 0;
  bad += cov && cov.pct >= 100 ? (checks.push('catalog'), 0) : fail(`catalog ${cov ? cov.pct + '%' : 'unknown'}`);
  const pend = pendingCount(code);
  bad += pend === 0 ? (checks.push('review-queue'), 0) : fail(`review-queue ${pend}`);
  bad += placeholderBad.has(code) ? fail('placeholders') : (checks.push('placeholders'), 0);

  if (unstamped.has(code)) { checks.push('UNKNOWN freshness (no stamps)'); unknowns++; }
  else bad += (drift.get(code) ?? 0) === 0 ? (checks.push('freshness'), 0) : fail(`freshness ${drift.get(code)} stale`);

  bad += (register.get(code) ?? 0) === 0 ? (checks.push('register'), 0) : fail(`register ${register.get(code)}`);

  const navGaps = navTitleGaps(code);
  bad += navGaps === 0 ? (checks.push('navigation'), 0) : fail(`navigation ${navGaps}/${registryScreens.length} screen title(s) missing`);

  if (code === 'en') checks.push('my-journey (reference locale)');
  else if (!dbChecked) { checks.push('UNKNOWN my-journey'); unknowns++; }
  else {
    const d = dbCoverage.get(code) ?? { complete: 0, expected: 0 };
    bad += d.expected > 0 && d.complete >= d.expected
      ? (checks.push('my-journey'), 0)
      : fail(`my-journey ${d.complete}/${d.expected} complete topics`);
  }

  failures += bad;
  rows.push({ code, status, bad, checks });
}

console.log('\n=== i18n parity gate — six surfaces ===\n');
for (const r of rows) {
  const verdict = r.bad > 0 ? 'FAIL' : r.checks.some((c) => c.startsWith('UNKNOWN')) ? 'UNKNOWN' : 'PASS';
  console.log(`${verdict.padEnd(8)} ${r.code} (${r.status})`);
  for (const c of r.checks) console.log(`         ${c.startsWith('FAIL') || c.startsWith('UNKNOWN') ? c : '✓ ' + c}`);
}

if (!dbChecked) {
  console.log(
    `\n[gate] My Journey (DB) surface NOT CHECKED — ${dbWhy}.\n` +
      `       Locales above are reported UNKNOWN, not PASS: a locale can pass every file-based\n` +
      `       check while its curriculum still reads German. Supply SUPABASE_SERVICE_ROLE to close it.`,
  );
}

if (failures > 0) {
  console.error(`\n[gate] ${failures} failing check(s).`);
  process.exit(REPORT_ONLY ? 0 : 1);
}
if (unknowns > 0) {
  console.log(`\n[gate] No failures, but ${unknowns} surface(s) could not be evaluated.`);
  process.exit(REPORT_ONLY ? 0 : 1);
}
console.log('\n[gate] All target locales pass all six surfaces.');
