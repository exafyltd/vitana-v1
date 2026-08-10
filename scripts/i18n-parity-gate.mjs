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
//
// A locale is ready when SIX surfaces agree, not when one does:
//
//   1. UI catalog      — every DE key present            (i18n-audit)
//   2. Review queue    — nothing left _pending_review
//   3. Placeholders    — no broken {token} interpolation
//   4. Freshness       — no drift vs the source it was translated from
//   5. Register        — informal voice, per-language rule
//   6. DB content      — nav_catalog_i18n + journey_checklist_translations
//
// Surfaces 1-5 are files and always checked. Surface 6 needs database access;
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
// Surface 6: DB content. Requires service-role; UNKNOWN without it.
// ---------------------------------------------------------------------------
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
    const navTotal = await q('nav_catalog?select=id&is_active=eq.true&limit=1');
    for (const [code] of pickerLocales()) {
      const nav = await q(`nav_catalog_i18n?select=catalog_id&lang=eq.${code}&limit=1`);
      const chk = await q(`journey_checklist_translations?select=topic_id&locale=eq.${code}&limit=1`);
      dbCoverage.set(code, { nav, navTotal, chk });
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

  if (!dbChecked) { checks.push('UNKNOWN db-content'); unknowns++; }
  else {
    const d = dbCoverage.get(code) ?? { nav: 0, navTotal: 0, chk: 0 };
    bad += d.nav >= d.navTotal && d.chk > 0
      ? (checks.push('db-content'), 0)
      : fail(`db-content nav ${d.nav}/${d.navTotal} checklist ${d.chk}`);
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
    `\n[gate] DB-content surface NOT CHECKED — ${dbWhy}.\n` +
      `       Locales above are reported UNKNOWN, not PASS. This surface is the whole reason\n` +
      `       the gate exists: es/sr/fr passed all five file-based checks while serving German\n` +
      `       Navigator titles. Supply SUPABASE_SERVICE_ROLE to close it.`,
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
