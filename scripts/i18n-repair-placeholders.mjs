#!/usr/bin/env node
// Repair translated {placeholder} names in a locale catalog. (VTID-03509)
//
// WHY THIS EXISTS
//
// The translator prompt has always said "keep placeholders intact"; the model
// does it anyway. Observed in shipped catalogs:
//
//   de "{date} · {start}–{end}"      sr "{datum} · {početak}–{kraj}"
//   de "{used} / {limit} {unit}"     es "{usado} / {límite} {unidad}"
//
// The runtime substitutes by NAME — src/lib/i18n-toast.ts replaces `{key}` for
// each supplied key — so a renamed token is never substituted and the user
// sees a literal "{datum}".
//
// scripts/translate-keys.mjs now rejects/repairs this at translation time, so
// new output is clean. This script is the migration for catalogs produced
// BEFORE that guard: es, sr, fr, pt (and ru/pl if their runs predate it).
//
// HOW IT DECIDES
//
// If the translation kept the right NUMBER of placeholders and merely renamed
// them, the mapping back is unambiguous: remap positionally. If the count
// differs, the translation dropped or invented one — that is NOT mechanically
// recoverable, so it is reported and left alone for a human or a re-translation
// rather than guessed at.
//
// Usage:
//   node scripts/i18n-repair-placeholders.mjs --locale=fr            # report only
//   node scripts/i18n-repair-placeholders.mjs --locale=fr --write    # apply
//   node scripts/i18n-repair-placeholders.mjs --all --write
//   node scripts/i18n-repair-placeholders.mjs --locale=fr --write --flag
//        ^ also mark the UNRECOVERABLE ones _pending_review, so the next
//          translate run redoes them. Safe now that translate-keys.mjs rejects
//          a translation whose placeholder count differs from the source: the
//          worst case is the key stays pending and visible, not corrupted.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'src/i18n');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const WRITE = Boolean(args.write);
const FLAG = Boolean(args.flag);
const REFERENCE = args.reference ?? 'de'; // authoritative placeholder set

// Same pattern as scripts/i18n-audit.mjs — see the comment there. Not \w+
// (misses "{početak}"), not [^{}]+ (would swallow an embedded JSON example).
const PH = /\{([^{}\s"']+)\}/g;
const list = (v) => [...String(v).matchAll(PH)].map((m) => m[1]);

function repair(source, translated) {
  const want = list(source);
  const got = list(translated);
  if (want.join(',') === got.join(',')) return translated;
  if (want.length !== got.length) return null;
  let i = 0;
  return String(translated).replace(/\{[^{}\s"']+\}/g, () => `{${want[i++]}}`);
}

function localesToScan() {
  if (args.all) {
    return readdirSync(I18N_DIR)
      .filter((f) => existsSync(join(I18N_DIR, f, 'common.json')))
      .filter((f) => f !== REFERENCE);
  }
  return [args.locale ?? 'es'];
}

let grandRepaired = 0;
let grandUnrecoverable = 0;

for (const locale of localesToScan()) {
  const dir = join(I18N_DIR, locale);
  if (!existsSync(dir)) {
    console.error(`[repair] no such locale: ${dir}`);
    process.exitCode = 2;
    continue;
  }
  let repaired = 0;
  const unrecoverable = [];

  for (const file of readdirSync(join(I18N_DIR, REFERENCE)).filter((f) => f.endsWith('.json'))) {
    const refPath = join(I18N_DIR, REFERENCE, file);
    const tgtPath = join(dir, file);
    if (!existsSync(tgtPath)) continue;
    const ref = JSON.parse(readFileSync(refPath, 'utf8'));
    const tgt = JSON.parse(readFileSync(tgtPath, 'utf8'));
    let touched = false;

    (function walk(r, t, trail) {
      for (const [k, v] of Object.entries(r)) {
        if (k.startsWith('_')) continue;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (t[k] && typeof t[k] === 'object') walk(v, t[k], [...trail, k]);
        } else if (typeof v === 'string' && typeof t[k] === 'string') {
          if (list(v).sort().join() === list(t[k]).sort().join()) continue;
          const fixed = repair(v, t[k]);
          const path = [file.replace(/\.json$/, ''), ...trail, k].join('.');
          if (fixed === null) {
            unrecoverable.push(`${path}: ref{${list(v)}} vs ${locale}{${list(t[k])}}`);
          } else {
            console.log(`  ${locale} ${path}: ${JSON.stringify(t[k])} -> ${JSON.stringify(fixed)}`);
            t[k] = fixed;
            repaired++;
            touched = true;
          }
        }
      }
    })(ref, tgt, []);

    // Queue the unrecoverable ones for re-translation. Typically the model
    // DUPLICATED a token for gender/number agreement ("{length} ticket{value1}
    // purchased" -> "{length} bilhete{value1}{value1}"), which no positional
    // remap can undo.
    if (FLAG) {
      const shard = file.replace(/\.json$/, '');
      for (const u of unrecoverable) {
        const dotted = u.split(':')[0];
        if (!dotted.startsWith(`${shard}.`)) continue;
        const parts = dotted.slice(shard.length + 1).split('.');
        let cur = tgt;
        let ok = true;
        for (const seg of parts.slice(0, -1)) {
          if (!cur[seg] || typeof cur[seg] !== 'object') { ok = false; break; }
          cur = cur[seg];
        }
        if (!ok) continue;
        (cur._pending_review ||= {})[parts[parts.length - 1]] = true;
        touched = true;
      }
    }

    if (touched && WRITE) writeFileSync(tgtPath, JSON.stringify(tgt, null, 2) + '\n');
  }

  console.log(
    `[repair] ${locale}: ${repaired} repairable${WRITE ? ' (written)' : ' (dry run — pass --write)'}` +
      `, ${unrecoverable.length} unrecoverable`,
  );
  for (const u of unrecoverable) console.log(`   UNRECOVERABLE ${u}`);
  grandRepaired += repaired;
  grandUnrecoverable += unrecoverable.length;
}

if (grandUnrecoverable > 0) {
  console.log(
    `\n[repair] ${grandUnrecoverable} value(s) changed the NUMBER of placeholders and cannot be\n` +
      `         remapped mechanically. Re-translate those keys, or fix by hand.`,
  );
  process.exitCode = 1;
}
