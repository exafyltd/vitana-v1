#!/usr/bin/env node
// Catalog audit. Run on every PR (warn-level in Wave 1, blocking in Wave 6).
//
// Checks:
//   1. DE↔EN parity: every key in de/ must exist in en/ and vice versa.
//   2. Orphan shards: a shard exists in en/ but not de/ (or reverse).
//   3. _pending_review markers: present in any GA-flagged language.
//   4. Empty values: any leaf string is "" (likely an unfilled stub).
//   5. Coverage of EVERY locale against DE. A `ga` locale below 100% is an
//      ERROR; `beta`/`draft` are reported for visibility only. (VTID-03509)
//
// GA languages ARE now read from src/contexts/LanguageContext.tsx — the header
// claimed this before, but GA_LOCALES was a hardcoded Set(['en','de']). Adding
// a locale to the picker did not extend the audit, which is why es/sr could sit
// at 90.8% while this reported "all in sync".

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '..', 'src', 'i18n');

// Parse `languageOptions` out of LanguageContext.tsx so the picker and the
// audit can never disagree about which languages are GA.
function readLanguageStatuses() {
  const src = readFileSync(
    join(__dirname, '..', 'src', 'contexts', 'LanguageContext.tsx'),
    'utf8',
  );
  const block = src.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  const out = new Map(); // short code ('de') -> 'ga' | 'beta' | 'draft'
  for (const m of block.matchAll(/value:\s*"([a-z]{2})-[A-Za-z]+",\s*status:\s*'(\w+)'/g)) {
    out.set(m[1], m[2]);
  }
  if (out.size === 0) {
    console.error('[i18n-audit] FATAL: could not parse languageOptions from LanguageContext.tsx');
    process.exit(2);
  }
  return out;
}

const LANGUAGE_STATUS = readLanguageStatuses();
const GA_LOCALES = new Set(
  [...LANGUAGE_STATUS.entries()].filter(([, st]) => st === 'ga').map(([code]) => code),
);
const STRICT = process.argv.includes('--strict');
const REPORT_ONLY = process.argv.includes('--report-only'); // exit 0 even on errors (Wave 1 CI)

function listShards(localeDir) {
  if (!existsSync(localeDir)) return [];
  return readdirSync(localeDir)
    .filter((f) => f.endsWith('.json'))
    // Exclude audit metadata produced by scripts/i18n-audit-llm.mjs
    .filter((f) => !f.endsWith('._audit.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

function loadShard(localeDir, name) {
  return JSON.parse(readFileSync(join(localeDir, `${name}.json`), 'utf8'));
}

function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue; // _pending_review etc. are metadata
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v, path));
    } else {
      out.push({ path, value: v });
    }
  }
  return out;
}

function findPendingReview(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  if ('_pending_review' in obj) {
    const flags = obj._pending_review;
    if (flags && typeof flags === 'object') {
      for (const k of Object.keys(flags)) {
        if (flags[k]) out.push(prefix ? `${prefix}.${k}` : k);
      }
    } else if (flags === true) {
      out.push(prefix || '<root>');
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...findPendingReview(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return out;
}

const issues = [];

function recordIssue(level, locale, message) {
  issues.push({ level, locale, message });
}

const allLocales = readdirSync(I18N_DIR)
  .filter((f) => statSync(join(I18N_DIR, f)).isDirectory());

if (!allLocales.includes('de') || !allLocales.includes('en')) {
  console.error('[i18n-audit] FATAL: src/i18n/de or src/i18n/en is missing.');
  process.exit(2);
}

const deShards = listShards(join(I18N_DIR, 'de'));
const enShards = listShards(join(I18N_DIR, 'en'));

// 1. Shard set parity (DE↔EN)
const deOnly = deShards.filter((s) => !enShards.includes(s));
const enOnly = enShards.filter((s) => !deShards.includes(s));
for (const s of deOnly) recordIssue('error', 'en', `shard "${s}.json" exists in de/ but missing from en/`);
for (const s of enOnly) recordIssue('error', 'de', `shard "${s}.json" exists in en/ but missing from de/`);

// 2. Per-shard key parity DE→EN
for (const shardName of deShards) {
  if (!enShards.includes(shardName)) continue;
  const deShard = loadShard(join(I18N_DIR, 'de'), shardName);
  const enShard = loadShard(join(I18N_DIR, 'en'), shardName);
  const deKeys = new Set(flatten(deShard).map((e) => e.path));
  const enKeys = new Set(flatten(enShard).map((e) => e.path));

  for (const k of deKeys) if (!enKeys.has(k)) recordIssue('error', 'en', `${shardName}: key "${k}" missing from en/`);
  for (const k of enKeys) if (!deKeys.has(k)) recordIssue('error', 'de', `${shardName}: key "${k}" missing from de/ (DE is source of truth)`);

  // Empty-value check
  for (const { path, value } of flatten(deShard)) {
    if (value === '') recordIssue('warn', 'de', `${shardName}: key "${path}" has empty value`);
  }
}

// 3. _pending_review check for GA locales
for (const locale of allLocales) {
  if (!GA_LOCALES.has(locale)) continue;
  const shards = listShards(join(I18N_DIR, locale));
  for (const shardName of shards) {
    const shard = loadShard(join(I18N_DIR, locale), shardName);
    const pending = findPendingReview(shard);
    for (const p of pending) {
      recordIssue('error', locale, `${shardName}: key "${p}" is _pending_review but locale is GA`);
    }
  }
}

// 4. Coverage of every locale against DE (VTID-03509).
//
// This is the check that would have caught es/sr sitting at 90.8% while the
// audit reported everything in sync, and it is what makes flipping a locale to
// `ga` self-enforcing: a thin catalog fails CI instead of shipping a
// half-German UI.
const deAllKeys = new Set();
for (const shardName of deShards) {
  for (const { path } of flatten(loadShard(join(I18N_DIR, 'de'), shardName))) {
    deAllKeys.add(`${shardName}.${path}`);
  }
}

const coverage = [];
for (const locale of allLocales.sort()) {
  if (locale === 'de') continue;
  const status = LANGUAGE_STATUS.get(locale) ?? 'unlisted';
  const shards = listShards(join(I18N_DIR, locale));
  const keys = new Set();
  for (const shardName of shards) {
    for (const { path } of flatten(loadShard(join(I18N_DIR, locale), shardName))) {
      keys.add(`${shardName}.${path}`);
    }
  }
  const missing = [...deAllKeys].filter((k) => !keys.has(k));
  const pct = deAllKeys.size === 0 ? 100 : ((deAllKeys.size - missing.length) / deAllKeys.size) * 100;
  coverage.push({ locale, status, pct, missing: missing.length, total: deAllKeys.size });

  if (status === 'ga' && missing.length > 0) {
    recordIssue(
      'error',
      locale,
      `marked GA in LanguageContext but only ${pct.toFixed(1)}% of DE keys ` +
        `(${missing.length} missing, e.g. ${missing.slice(0, 3).join(', ')}). ` +
        `A GA locale must be complete — users get German for every missing key.`,
    );
  }
}

console.log('\n[i18n-audit] coverage vs DE:');
for (const c of coverage) {
  const flag = c.status === 'ga' && c.missing > 0 ? '  <-- GA BUT INCOMPLETE' : '';
  console.log(
    `  ${c.locale.padEnd(3)} ${String(c.status).padEnd(6)} ${c.pct.toFixed(1).padStart(5)}%  ` +
      `(${c.total - c.missing}/${c.total})${flag}`,
  );
}
console.log('');

// Report
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warn');

if (errors.length === 0 && warnings.length === 0) {
  console.log(`[i18n-audit] OK — DE: ${deShards.length} shards, EN: ${enShards.length} shards, all in sync.`);
  process.exit(0);
}

if (warnings.length) {
  console.warn(`[i18n-audit] ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 50)) console.warn(`  WARN [${w.locale}] ${w.message}`);
  if (warnings.length > 50) console.warn(`  ...and ${warnings.length - 50} more`);
}

if (errors.length) {
  console.error(`[i18n-audit] ${errors.length} error(s):`);
  for (const e of errors.slice(0, 50)) console.error(`  ERR  [${e.locale}] ${e.message}`);
  if (errors.length > 50) console.error(`  ...and ${errors.length - 50} more`);
  if (!REPORT_ONLY) process.exit(1);
  console.error('[i18n-audit] --report-only: exiting 0 despite errors.');
}

if (STRICT && warnings.length > 0) process.exit(1);
process.exit(0);
