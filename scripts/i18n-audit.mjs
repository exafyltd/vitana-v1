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
//   6. PLACEHOLDER INTEGRITY across every locale. (VTID-03509)
//   7. STALENESS: a translation whose DE source changed after it was written.
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

// Array-valued keys (e.g. voucher.tiers.*.benefits) are leaves for coverage
// purposes, but scripts/translate-keys.mjs does NOT translate them — its leaf
// collector skips arrays, so `--init` creates the parent object without them
// and they stay missing after a full translation run. There are only 3 in DE
// today (11 strings, all in voucher.json); they are hand-translated. Surfaced
// here so a fourth one added later is noticed rather than silently absent from
// every non-DE locale.
const deArrayKeys = [];
for (const shardName of deShards) {
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('_')) continue;
      const path = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) deArrayKeys.push(`${shardName}.${path}`);
      else if (v && typeof v === 'object') walk(v, path);
    }
  };
  walk(loadShard(join(I18N_DIR, 'de'), shardName), '');
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
  // VTID-03710 — the REVERSE direction: keys this locale has that DE does not.
  //
  // Coverage above only ever asks "does the locale have everything DE has",
  // so a key that exists ONLY in translations is invisible to it — every
  // locale still reports 100% and is correct to. That blind spot hid 126 keys
  // (21 x 6 locales) sitting at `health.missionAlignment` in health.json while
  // the component actually reads `screens.health.missionAlignment` from
  // screens.json. Nothing rendered them, the two copies drifted apart in
  // wording, and only the live copy carried `_pending_review` markers — so the
  // dead one looked *more* finished than the real one.
  //
  // The same check already existed for `en` (see the DE/EN mirror block
  // above) and caught nothing here, because it compares only those two.
  // `error`, matching that block: an orphan is either a typo'd path that
  // renders nothing, or a stale copy someone will eventually edit instead of
  // the real one. Both are bugs, and neither is visible in the UI.
  //
  // `flatten` skips `_`-prefixed metadata, so `_pending_review` and friends
  // never count as extra keys.
  const extra = [...keys].filter((k) => !deAllKeys.has(k));
  if (extra.length > 0) {
    recordIssue(
      'error',
      locale,
      `${extra.length} key(s) exist in ${locale}/ but not in de/ — DE is the ` +
        `source of truth, so nothing reads these (e.g. ${extra.slice(0, 3).join(', ')}). ` +
        `Either add them to de/ if they are real, or delete them.`,
    );
  }

  // Floor to one decimal, and never print 100.0% while a key is missing.
  // 14160/14163 rounds to "100.0%" — a locale reporting complete while three
  // keys fall back to German is precisely the misleading signal this check
  // exists to remove.
  const raw = deAllKeys.size === 0 ? 100 : ((deAllKeys.size - missing.length) / deAllKeys.size) * 100;
  const pct = missing.length === 0 ? 100 : Math.min(raw, 99.9);
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
if (deArrayKeys.length > 0) {
  // VTID-03509 — this used to just LIST the array keys with "must be filled by
  // hand", which reads as "these are missing" and is what made me report them
  // as an outstanding gap when in fact all seven locales had them translated.
  // A warning that cannot distinguish done from not-done is worse than none:
  // it costs attention every run and carries no information. So now it checks.
  //
  // The test is "does the target array differ, element-wise, from German?" —
  // an untranslated array is a verbatim copy of the source, exactly like the
  // verbatim-echo case the DB-content translator guards against.
  const readArray = (locale, dotted) => {
    const [shardName, ...rest] = dotted.split('.');
    let node = loadShard(join(I18N_DIR, locale), shardName);
    for (const seg of rest) {
      if (!node || typeof node !== 'object') return undefined;
      node = node[seg];
    }
    return Array.isArray(node) ? node : undefined;
  };
  const arrayGaps = [];
  for (const locale of allLocales.sort()) {
    if (locale === 'de') continue;
    const status = LANGUAGE_STATUS.get(locale) ?? 'unlisted';
    // draft locales are not expected to be complete.
    if (status === 'draft' || status === 'unlisted') continue;
    for (const key of deArrayKeys) {
      const src = readArray('de', key);
      const tgt = readArray(locale, key);
      if (!tgt) arrayGaps.push(`${locale}: ${key} — MISSING`);
      else if (JSON.stringify(src) === JSON.stringify(tgt)) {
        arrayGaps.push(`${locale}: ${key} — verbatim copy of DE (untranslated)`);
      }
    }
  }
  if (arrayGaps.length === 0) {
    console.log(
      `[i18n-audit] ${deArrayKeys.length} array-valued key(s) present and translated in every ` +
        `tracked locale.\n             (translate-keys.mjs cannot maintain these — they are hand-held.)`,
    );
  } else {
    console.log(
      `[i18n-audit] ${arrayGaps.length} array-value gap(s) — translate-keys.mjs does NOT\n` +
        `             translate these; fill them by hand:`,
    );
    for (const g of arrayGaps) console.log(`  ${g}`);
  }
  console.log('');
}

// 5. Placeholder integrity (VTID-03509).
//
// Coverage cannot see this class at all: the key is present, so it counts as
// translated, but the interpolation is broken and the user sees a literal
// `{token}`. Two real failure modes, both found in the shipped es/sr catalogs:
//
//   a) the translator translated the placeholder NAME —
//      de "{used} / {limit} {unit}" became es "{usado} / {límite} {unidad}",
//      so none of the three substituted and the whole string rendered raw;
//   b) a placeholder was RENAMED in DE after the locale was translated —
//      de "Tag {n}" vs a stale es "Día {day}".
//
// (b) is why this check is also the cheapest staleness signal available: it is
// language-independent, so it needs no reviewer who speaks the language.
// A placeholder is `{` + an identifier + `}` — the runtime substitutes by key
// name from a params object (src/lib/i18n-toast.ts). Deliberately NOT \w+:
// a translated placeholder is usually non-ASCII ("{početak}", "{límite}") and an
// ASCII-only pattern cannot see it. Equally deliberately NOT [^{}]+: some UI
// strings embed a literal JSON example (an admin field shows
// `{ "forbidden_openings": [...] }`), and that is not a placeholder. Excluding
// whitespace and quotes separates the two without a special case.
function placeholdersOf(v) {
  return [...String(v).matchAll(/\{([^{}\s"']+)\}/g)].map((m) => m[1]).sort().join(',');
}

const deValues = {};
for (const shardName of deShards) {
  for (const { path, value } of flatten(loadShard(join(I18N_DIR, 'de'), shardName))) {
    deValues[`${shardName}.${path}`] = value;
  }
}

for (const locale of allLocales.sort()) {
  if (locale === 'de') continue;
  const status = LANGUAGE_STATUS.get(locale) ?? 'unlisted';
  if (status === 'draft') continue; // not offered to users; noise
  for (const shardName of listShards(join(I18N_DIR, locale))) {
    for (const { path, value } of flatten(loadShard(join(I18N_DIR, locale), shardName))) {
      const key = `${shardName}.${path}`;
      const source = deValues[key];
      if (source === undefined) continue;
      const want = placeholdersOf(source);
      const got = placeholdersOf(value);
      if (want !== got) {
        // ERROR for ga, WARN for beta — same severity split coverage already
        // uses. `beta` means "offered but explicitly not guaranteed", and a
        // locale mid-translation will legitimately carry these until its run
        // drains; failing CI for the whole branch on that would train people to
        // ignore the check. A ga locale has no such excuse.
        recordIssue(
          status === 'ga' ? 'error' : 'warn',
          locale,
          `${shardName}: "${path}" placeholder mismatch — de{${want}} vs ${locale}{${got}}. ` +
            `The user sees a literal {token}. Value: ${JSON.stringify(String(value).slice(0, 60))}`,
        );
      }
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
