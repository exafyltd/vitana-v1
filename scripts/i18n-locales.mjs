#!/usr/bin/env node
// Emit the live locale set as a CI matrix. (VTID-03509)
//
// WHY THIS IS NOT A HARDCODED LIST
//
// The propagation system's whole promise is "no language is left behind when
// one language changes". A hardcoded matrix breaks that promise the moment
// someone adds language N+1 and forgets one file — and it fails SILENTLY,
// because a locale absent from the matrix is simply never translated. It looks
// identical to a locale that had nothing to do.
//
// So the matrix is derived, never written. Source of truth, in order:
//
//   1. `supported_locales` in the platform DB — the same registry that gates
//      DB-content seeding (VTID-03515). Deliberately world-readable so this
//      can read it with the publishable key and no secret.
//   2. `languageOptions` in LanguageContext.tsx — used when the DB is
//      unreachable, so CI still propagates during an outage rather than
//      quietly translating nothing.
//
// If the two disagree the run FAILS. A disagreement means one of them thinks a
// language ships and the other has never heard of it, and guessing which is
// right is how you ship a half-translated locale. scripts/check-locale-registry.mjs
// enforces the same invariant on PRs; this is the propagation-time guard.
//
// Usage:
//   node scripts/i18n-locales.mjs --matrix        # {"locale":["en","es",...]}
//   node scripts/i18n-locales.mjs --list          # newline separated
//   node scripts/i18n-locales.mjs --list --include-source

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const WANT_MATRIX = args.includes('--matrix');
const INCLUDE_SOURCE = args.includes('--include-source');

/** German authors the content; it is never a translation target. */
export const SOURCE_LOCALE = 'de';

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

function fromPicker() {
  const src = readFileSync(join(ROOT, 'src/contexts/LanguageContext.tsx'), 'utf8');
  const block = src.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  const out = new Map();
  for (const m of block.matchAll(/value:\s*"([a-z]{2})-[A-Za-z]+",\s*status:\s*'(\w+)'/g)) {
    out.set(m[1], m[2]);
  }
  if (out.size === 0) throw new Error('could not parse languageOptions from LanguageContext.tsx');
  return out;
}

async function fromRegistry() {
  const url = envValue('VITE_SUPABASE_URL');
  const key = envValue('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/supported_locales?select=code,status`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return new Map((await res.json()).map((r) => [r.code, r.status]));
  } catch {
    return null;
  }
}

const picker = fromPicker();
const registry = await fromRegistry();

if (registry) {
  // Only compare locales either side considers shippable. A `draft` entry is
  // allowed to exist on one side only — that is how a language is staged.
  const shippable = (m) =>
    new Set([...m.entries()].filter(([, s]) => s === 'ga' || s === 'beta').map(([c]) => c));
  const a = shippable(picker);
  const b = shippable(registry);
  const onlyPicker = [...a].filter((c) => !b.has(c));
  const onlyRegistry = [...b].filter((c) => !a.has(c));
  if (onlyPicker.length || onlyRegistry.length) {
    console.error(
      '[locales] FATAL: picker and supported_locales disagree about which languages ship.\n' +
        (onlyPicker.length ? `  only in picker:   ${onlyPicker.join(', ')}\n` : '') +
        (onlyRegistry.length ? `  only in registry: ${onlyRegistry.join(', ')}\n` : '') +
        '  Propagating from a disputed list would leave one side half-translated.\n' +
        '  Reconcile them (see scripts/check-locale-registry.mjs) and re-run.',
    );
    process.exit(2);
  }
}

// Everything the picker will actually show or preview — `draft` locales are
// deliberately included so a language being staged is translated as it goes,
// rather than arriving as one enormous backlog on promotion day.
const locales = [...picker.entries()]
  .filter(([code]) => INCLUDE_SOURCE || code !== SOURCE_LOCALE)
  .map(([code]) => code)
  .sort();

if (WANT_MATRIX) console.log(JSON.stringify({ locale: locales }));
else console.log(locales.join('\n'));
