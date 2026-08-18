#!/usr/bin/env node
/**
 * VTID-03657 — assert each lazy locale ships as ONE chunk, and that `de` stays
 * eager.
 *
 * Without this, the regression is invisible. Deleting the `manualChunks` rule
 * does not break a test, fail a typecheck, or change a single rendered string —
 * it silently returns switching to Spanish to 104 sequential chunk fetches, and
 * the only symptom is that the UI "feels slow", which nobody files.
 *
 * Reads the built output rather than the config, because the config is a
 * statement of intent and the emitted chunks are the fact. Run after `npm run
 * build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/assets';
// Locales that are lazily loaded. `de` is deliberately NOT here — it is the
// eager default, baked into the entry bundle.
const LAZY = ['en', 'es', 'sr', 'fr', 'pt', 'ru', 'pl', 'ar', 'zh'];
// A string only that locale's catalog contains, used to prove where it landed.
const PROBE = {
  de: 'WILLKOMMEN IN VITANALAND',
  es: 'BIENVENIDO A VITANALAND',
  fr: 'BIENVENUE À VITANALAND',
};

let files;
try {
  files = readdirSync(DIST).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`[locale-chunks] ${DIST} not found — run \`npm run build\` first.`);
  process.exit(2);
}

const problems = [];

for (const loc of LAZY) {
  const chunks = files.filter((f) => f.startsWith(`locale-${loc}-`));
  if (chunks.length === 0) {
    problems.push(
      `'${loc}' has no locale-${loc}-*.js chunk. The manualChunks rule in ` +
        `vite.config.ts is not grouping it, so its ~104 shards ship as ~104 ` +
        `separate chunks and switching to it costs that many requests.`,
    );
  } else if (chunks.length > 1) {
    problems.push(`'${loc}' emitted ${chunks.length} chunks (expected 1): ${chunks.join(', ')}`);
  }
}

// `de` must stay in the entry bundle. Naming it in manualChunks would look like
// a tidy-up and would actually make the ONE instant locale a network round trip.
if (files.some((f) => f.startsWith('locale-de-'))) {
  problems.push(
    `'de' was split into a lazy locale chunk. It is the eager default; ` +
      `splitting it makes the only instantly-available locale require a fetch.`,
  );
}

const findIn = (probe) =>
  files.filter((f) => readFileSync(join(DIST, f), 'utf8').includes(probe));

const deHome = findIn(PROBE.de);
if (!deHome.some((f) => f.startsWith('index-'))) {
  problems.push(
    `German catalog text is not in the entry bundle (found in: ${deHome.join(', ') || 'nothing'}). ` +
      `de must be eagerly bundled.`,
  );
}

for (const loc of ['es', 'fr']) {
  const home = findIn(PROBE[loc]);
  if (!home.some((f) => f.startsWith(`locale-${loc}-`))) {
    problems.push(`'${loc}' catalog text is not in its locale chunk (found in: ${home.join(', ')})`);
  }
}

if (problems.length) {
  console.error('[locale-chunks] FAIL\n');
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exit(1);
}

const sizes = LAZY.map((loc) => {
  const f = files.find((x) => x.startsWith(`locale-${loc}-`));
  return `${loc}:${Math.round(statSync(join(DIST, f)).size / 1024)}KB`;
});
console.log(`[locale-chunks] OK — one chunk per lazy locale, de eager. ${sizes.join('  ')}`);
