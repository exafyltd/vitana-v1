#!/usr/bin/env node
// Assert the frontend language picker and the DB locale registry agree. (VTID-03519)
//
// THE GAP THIS CLOSES
//
// A language reaches users across six surfaces. Five of them are files in this
// repo and are checked by `i18n-audit.mjs`. The sixth is DATABASE CONTENT —
// `nav_catalog_i18n` (Navigator screen titles, read by ORB voice intent
// matching) and `journey_checklist_translations` (My Journey curriculum) — and
// no check in this repo can see it, because it is not a file.
//
// VTID-03515 made `supported_locales` in the platform DB the single registry
// that gates DB-content seeding: a locale absent from it CANNOT receive rows
// (the foreign key rejects them). So a locale marked `ga` here but missing
// there is not "untranslated" — it is *unseedable*, and renders German
// Navigator titles inside an otherwise fully translated UI.
//
// That is not hypothetical. At the time this was written, es/sr/fr were all
// `ga` in the picker with ZERO nav_catalog_i18n rows in production.
//
// Nothing enforced the two lists matching. This does.
//
// NO SECRETS NEEDED: `supported_locales` was deliberately made world-readable
// (RLS SELECT policy `USING (true)`) precisely so the frontend can read the
// registry instead of holding a second copy of the list. The publishable key
// in the tracked `.env` is enough.
//
// Usage:
//   node scripts/check-locale-registry.mjs           # fail on drift
//   node scripts/check-locale-registry.mjs --report-only

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORT_ONLY = process.argv.includes('--report-only');

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

/** The picker, parsed from source — the same list a user actually sees. */
function readLanguageOptions() {
  const src = readFileSync(join(ROOT, 'src/contexts/LanguageContext.tsx'), 'utf8');
  const block = src.split('export const languageOptions')[1]?.split('];')[0] ?? '';
  const out = new Map();
  for (const m of block.matchAll(/value:\s*"([a-z]{2})-[A-Za-z]+",\s*status:\s*'(\w+)'/g)) {
    out.set(m[1], m[2]);
  }
  if (out.size === 0) throw new Error('Could not parse languageOptions from LanguageContext.tsx');
  return out;
}

async function readRegistry() {
  const url = envValue('VITE_SUPABASE_URL');
  const key = envValue('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not found in env or .env');
  }
  const res = await fetch(`${url}/rest/v1/supported_locales?select=code,status`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(
      `supported_locales read failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}\n` +
        'If this is a 404, the VTID-03515 migration has not been applied to this project.',
    );
  }
  return new Map((await res.json()).map((r) => [r.code, r.status]));
}

const problems = [];
const notes = [];

try {
  const picker = readLanguageOptions();
  const registry = await readRegistry();

  for (const [code, status] of picker) {
    if (status === 'draft') continue; // not shipped; nothing to seed yet
    const regStatus = registry.get(code);
    if (!regStatus) {
      problems.push(
        `'${code}' is '${status}' in the language picker but ABSENT from supported_locales.\n` +
          `   DB content cannot be seeded for it — the foreign key rejects the rows — so the\n` +
          `   Navigator and My Journey will render German for these users.\n` +
          `   Fix: INSERT INTO supported_locales (code, english_name, informal_hint, status) ...`,
      );
    } else if (regStatus !== status) {
      problems.push(
        `'${code}' status disagrees: picker='${status}', supported_locales='${regStatus}'.\n` +
          `   One side considers this locale shippable and the other does not.`,
      );
    }
  }

  // The reverse direction is informational: 'legacy' rows are back-filled from
  // whatever the live tables already contained, and a 'beta'/'draft' registry
  // entry may simply be staged ahead of the picker.
  for (const [code, status] of registry) {
    if (!picker.has(code) && status !== 'legacy') {
      notes.push(`'${code}' (${status}) is in supported_locales but not in the language picker.`);
    }
  }

  console.log(
    `[locale-registry] picker=${[...picker.keys()].join(',')}  ` +
      `registry=${[...registry.keys()].join(',')}`,
  );
  for (const n of notes) console.log(`[locale-registry] note: ${n}`);
} catch (err) {
  // A check that cannot run must be loud. Silently passing here would recreate
  // exactly the blind spot this script exists to remove.
  console.error(`[locale-registry] CHECK COULD NOT RUN: ${err.message}`);
  process.exit(REPORT_ONLY ? 0 : 2);
}

if (problems.length === 0) {
  console.log('[locale-registry] OK — picker and supported_locales agree.');
  process.exit(0);
}

console.error(`\n[locale-registry] ${problems.length} mismatch(es):\n`);
for (const p of problems) console.error(` - ${p}\n`);
console.error(
  'A locale that is user-selectable but unseedable ships a half-German UI.\n' +
    'See vitana-platform/docs/DB-CONTENT-I18N.md.',
);
process.exit(REPORT_ONLY ? 0 : 1);
