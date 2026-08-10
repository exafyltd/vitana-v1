#!/usr/bin/env node
// Source fingerprints for translation staleness. (VTID-03509)
//
// THE PROBLEM THIS EXISTS FOR
//
// es/sr were translated and LLM-audited on 2026-05-20. Over the following two
// months the German source moved underneath them: 1,657 keys added, 26 removed
// and **933 values rewritten** — including a broad Sie→du register conversion.
//
// Every existing check was blind to the 933. Key coverage said 100%, because
// the keys were all still there. `translate-keys.mjs --init` could not re-flag
// them either: it only flags a key when the target still equals the source
// (i.e. was never translated), so a *translated* value whose source later
// changed is invisible to it forever. The catalog looked complete and was
// quietly two months out of date.
//
// HOW THIS FIXES IT
//
// Each locale shard gets a sibling entry recording, per key, a short hash of
// the DE source string it was translated from:
//
//   src/i18n/es/common.json        <- translations (untouched shape)
//   i18n-source-stamps/es.json     <- { "common.foo.bar": "9f2a1c4e", ... }
//
// Stamps live OUTSIDE src/i18n/ for the same reason the audit reports do: any
// src/i18n/<locale>/*.json is swept into the shipped bundle by import.meta.glob.
//
// `--check` then compares the current DE hash against the stamp and reports
// every key whose source has moved since it was translated. That is a real
// worklist — "re-translate these 933" — instead of a locale that merely feels
// stale.
//
// Usage:
//   node scripts/i18n-stamp-source.mjs --locale=es          # write/refresh stamps
//   node scripts/i18n-stamp-source.mjs --locale=es --check   # report drift, exit 1
//   node scripts/i18n-stamp-source.mjs --check-all           # every ga/beta locale
//   node scripts/i18n-stamp-source.mjs --locale=es --flag    # mark drifted keys
//                                                            # _pending_review so the
//                                                            # translate workflow redoes them
//   node scripts/i18n-stamp-source.mjs --locale=es --from-rev=<sha>
//                                       # BOOTSTRAP an already-translated locale
//                                       # against the DE state it was actually
//                                       # translated from, so the first --check
//                                       # reports the real backlog
//
// STAMP HONESTLY. Running without --check rewrites every stamp to "current",
// which asserts the translations match today's German. Only do that right
// after a translation run for that locale — never to silence a --check.
//
// For a locale translated in the past, stamping "current" would be a lie that
// permanently hides its existing backlog. Use --from-rev=<sha> to stamp against
// the DE tree as it stood when that locale was translated; the first --check
// then surfaces the true drift instead of starting from a false clean slate.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'src/i18n');
const STAMP_DIR = join(ROOT, 'i18n-source-stamps');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const FLAG = Boolean(args.flag);
// --flag IMPLIES --check (VTID-03569). Flagging is a consumer of drift
// detection: the flagging branch lives past the `if (!CHECK) { …write…;
// continue }` guard below, so `--flag` on its own never reached it.
//
// It did not merely no-op. It fell into the WRITE path and re-stamped every
// key against today's source — erasing the record of what each translation was
// actually made from, marking stale strings as current, and turning the drift
// gate green with the stale text still in place. Nothing failed and nothing
// warned, because a rewritten stamp is indistinguishable from an honest one.
//
// The command this script prints on its own failure is the standalone form
// (`--locale=<x> --flag`), so the documented remedy for drift was the thing
// that destroyed the evidence of it. That is the same shape as the file header
// warning right above: "never [re-stamp] to silence a --check".
const CHECK = Boolean(args.check) || Boolean(args['check-all']) || FLAG;
// A locale's stamp must track the source it was actually TRANSLATED FROM, or
// it measures the wrong thing. scripts/translate-keys.mjs reads `en/` (its
// --source default), so es/sr/fr/pt/ru/pl derive from English. `en` itself is
// the mirror of the German source of truth.
//
// Getting this wrong is not academic: stamping es against DE reports drift for
// every DE-only edit — including the ~284-key Sie→du register sweep, which
// English has no equivalent for and which therefore implies no Spanish change
// at all. That is a permanently red signal made of non-problems, and a red
// signal nobody can act on is one nobody reads.
//
// DE→EN drift is a real and separate concern (if EN lags DE, every downstream
// locale inherits the lag) — which is exactly why `en` is tracked against `de`.
const PIVOT_LOCALE = 'en';
const ROOT_SOURCE_LOCALE = 'de';
const sourceFor = (locale) => (locale === PIVOT_LOCALE ? ROOT_SOURCE_LOCALE : PIVOT_LOCALE);

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, path));
    else out[path] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

function listShards(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json'));
}

function loadLocale(locale) {
  const out = {};
  const dir = join(I18N_DIR, locale);
  for (const f of listShards(dir)) {
    const shard = f.replace(/\.json$/, '');
    for (const [k, v] of Object.entries(flatten(JSON.parse(readFileSync(join(dir, f), 'utf8'))))) {
      out[`${shard}.${k}`] = v;
    }
  }
  return out;
}

/** Short, stable fingerprint of a source string. */
function stampOf(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 8);
}

/** ga/beta locales from LanguageContext — draft locales are not worth tracking. */
function trackedLocales() {
  const src = readFileSync(join(ROOT, 'src/contexts/LanguageContext.tsx'), 'utf8');
  const block = src.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  return [...block.matchAll(/value:\s*"([a-z]{2})-[A-Za-z]+",\s*status:\s*'(\w+)'/g)]
    .filter((m) => m[2] === 'ga' || m[2] === 'beta')
    .map((m) => m[1])
    .filter((code) => code !== ROOT_SOURCE_LOCALE && existsSync(join(I18N_DIR, code)));
}

/** DE as of a given git rev — used to bootstrap a previously-translated locale. */
function loadLocaleAtRev(rev, locale) {
  const out = {};
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, '--', `src/i18n/${locale}`], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((f) => f.endsWith('.json') && !f.includes('_audit'));
  for (const f of files) {
    const shard = f.split('/').pop().replace(/\.json$/, '');
    const raw = execFileSync('git', ['show', `${rev}:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const [k, v] of Object.entries(flatten(JSON.parse(raw)))) out[`${shard}.${k}`] = v;
  }
  return out;
}

const locales = args['check-all'] ? trackedLocales() : [args.locale ?? 'es'];

// Cache per source locale — check-all mixes en (vs de) with the rest (vs en).
const sourceCache = new Map();
const sourceNow = (loc) => {
  if (!sourceCache.has(loc)) sourceCache.set(loc, loadLocale(loc));
  return sourceCache.get(loc);
};
const histCache = new Map();
const sourceAtRev = (loc, rev) => {
  const ck = `${rev}:${loc}`;
  if (!histCache.has(ck)) histCache.set(ck, loadLocaleAtRev(rev, loc));
  return histCache.get(ck);
};

mkdirSync(STAMP_DIR, { recursive: true });

let totalDrift = 0;

for (const locale of locales) {
  const dir = join(I18N_DIR, locale);
  if (!existsSync(dir)) {
    console.error(`[stamp] no such locale dir: ${dir}`);
    process.exit(2);
  }
  const target = loadLocale(locale);
  const srcLocale = sourceFor(locale);
  const src = sourceNow(srcLocale);
  const srcForStamping = args['from-rev'] ? sourceAtRev(srcLocale, args['from-rev']) : src;
  const stampPath = join(STAMP_DIR, `${locale}.json`);
  const prev = existsSync(stampPath) ? JSON.parse(readFileSync(stampPath, 'utf8')) : null;

  if (!CHECK) {
    const stamps = {};
    let fromHistory = 0;
    for (const key of Object.keys(target)) {
      // A key present in the historical DE is stamped with THAT value (it is
      // what the translation was made from). A key that did not exist then was
      // translated later, from current DE, so it stamps as current.
      if (key in srcForStamping) { stamps[key] = stampOf(srcForStamping[key]); fromHistory++; }
      else if (key in src) stamps[key] = stampOf(src[key]);
    }
    writeFileSync(stampPath, JSON.stringify(stamps, null, 0) + '\n');
    console.log(
      `[stamp] ${locale}: wrote ${Object.keys(stamps).length} stamps (source=${srcLocale}) -> ${stampPath}` +
        (args['from-rev'] ? ` (${fromHistory} against ${args['from-rev']}, rest current)` : ''),
    );
    continue;
  }

  if (!prev) {
    console.warn(
      `[stamp] ${locale}: NO STAMPS YET (${stampPath}). Drift cannot be measured for this\n` +
        `        locale until it is stamped right after a translation run.`,
    );
    continue;
  }

  const drifted = [];
  const unstamped = [];
  for (const key of Object.keys(target)) {
    if (!(key in src)) continue;
    const now = stampOf(src[key]);
    if (!(key in prev)) unstamped.push(key);
    else if (prev[key] !== now) drifted.push(key);
  }

  totalDrift += drifted.length;
  const pct = ((drifted.length / Math.max(Object.keys(target).length, 1)) * 100).toFixed(1);
  console.log(
    `[stamp] ${locale}: ${drifted.length} key(s) whose ${srcLocale.toUpperCase()} source changed since translation (${pct}%)` +
      (unstamped.length ? `, ${unstamped.length} never stamped` : ''),
  );
  for (const k of drifted.slice(0, 15)) {
    console.log(`   ${k}\n      ${srcLocale.toUpperCase()} now: ${JSON.stringify(String(src[k]).slice(0, 70))}`);
  }
  if (drifted.length > 15) console.log(`   ...and ${drifted.length - 15} more`);

  if (FLAG && drifted.length) {
    // Re-flag drifted keys so `translate-keys.mjs` redoes them. --init cannot
    // do this itself: it only flags keys still equal to their source.
    const byShard = {};
    for (const key of drifted) {
      const [shard, ...rest] = key.split('.');
      (byShard[shard] ||= []).push(rest.join('.'));
    }
    let flagged = 0;
    for (const [shard, keys] of Object.entries(byShard)) {
      const p = join(dir, `${shard}.json`);
      if (!existsSync(p)) continue;
      const doc = JSON.parse(readFileSync(p, 'utf8'));
      for (const dotted of keys) {
        const parts = dotted.split('.');
        let cur = doc;
        let ok = true;
        for (const seg of parts.slice(0, -1)) {
          if (!cur[seg] || typeof cur[seg] !== 'object') { ok = false; break; }
          cur = cur[seg];
        }
        if (!ok) continue;
        (cur._pending_review ||= {})[parts[parts.length - 1]] = true;
        flagged++;
      }
      writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
    }
    console.log(`[stamp] ${locale}: flagged ${flagged} drifted key(s) _pending_review`);
  }
}

if (CHECK && totalDrift > 0 && !FLAG) {
  console.log(
    `\n[stamp] ${totalDrift} stale translation(s) total. Re-translate with:\n` +
      `        node scripts/i18n-stamp-source.mjs --locale=<x> --flag\n` +
      `        gh workflow run i18n-translate.yml -f locale=<x> -f provider=gemini\n` +
      `        node scripts/i18n-stamp-source.mjs --locale=<x>   # re-stamp when done`,
  );
  process.exit(1);
}
