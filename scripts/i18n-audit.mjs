#!/usr/bin/env node
// Catalog audit. Run on every PR (warn-level in Wave 1, blocking in Wave 6).
//
// Checks:
//   1. DE↔EN parity: every key in de/ must exist in en/ and vice versa.
//   2. Orphan shards: a shard exists in en/ but not de/ (or reverse).
//   3. _pending_review markers: present in any GA-flagged language.
//   4. Empty values: any leaf string is "" (likely an unfilled stub).
//
// GA languages are read from src/contexts/LanguageContext.tsx by literal match.
// In Wave 1 only de-DE and en-US are GA; new entries are added in Wave 6 with
// a `status: 'ga'|'beta'|'draft'` field on languageOptions.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, '..', 'src', 'i18n');

const GA_LOCALES = new Set(['en', 'de']);
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
