#!/usr/bin/env node
// Reads scripts/.codemod-toasts.manifest.json and writes the new keys into:
//   - src/i18n/en/toasts.json     (English source = the extracted string)
//   - src/i18n/de/toasts.json     (German placeholder = same English; marks _pending_review)
//
// The translator step (translate-keys-haiku.mjs) overwrites the DE placeholders
// with real German via Claude Haiku, then clears _pending_review per key as it
// goes.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANIFEST = join(__dirname, '.codemod-toasts.manifest.json');
const EN_PATH = join(ROOT, 'src/i18n/en/toasts.json');
const DE_PATH = join(ROOT, 'src/i18n/de/toasts.json');

if (!existsSync(MANIFEST)) {
  console.error('Manifest not found. Run codemod-toasts.mjs --apply first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const enCat = JSON.parse(readFileSync(EN_PATH, 'utf8'));
const deCat = JSON.parse(readFileSync(DE_PATH, 'utf8'));

if (!enCat.toasts) enCat.toasts = {};
if (!deCat.toasts) deCat.toasts = {};

let added = 0;
let alreadyPresent = 0;

// _pending_review map per namespace: en/de top-level shape lives at toasts.<ns>._pending_review
function setNested(cat, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = cat;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function getNested(cat, dotPath) {
  const parts = dotPath.split('.');
  let cur = cat;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

for (const [key, english] of Object.entries(manifest.keys)) {
  if (getNested(enCat, key) !== undefined) {
    alreadyPresent++;
    continue;
  }
  setNested(enCat, key, english);
  setNested(deCat, key, english); // placeholder until translator runs
  // Mark _pending_review for DE: at toasts.<ns>._pending_review.<slug> = true
  const parts = key.split('.');
  if (parts.length >= 3 && parts[0] === 'toasts') {
    const ns = parts[1];
    const slug = parts.slice(2).join('.');
    if (!deCat.toasts[ns]) deCat.toasts[ns] = {};
    if (!deCat.toasts[ns]._pending_review) deCat.toasts[ns]._pending_review = {};
    deCat.toasts[ns]._pending_review[slug] = true;
  }
  added++;
}

writeFileSync(EN_PATH, JSON.stringify(enCat, null, 2) + '\n', 'utf8');
writeFileSync(DE_PATH, JSON.stringify(deCat, null, 2) + '\n', 'utf8');

console.log(`[apply-toast-keys] ${added} keys added, ${alreadyPresent} already present.`);
console.log(`  en/toasts.json: ${EN_PATH}`);
console.log(`  de/toasts.json: ${DE_PATH}`);
console.log(`  All DE values placeholdered to English; mark _pending_review per key.`);
console.log(`  Run scripts/translate-keys-haiku.mjs to fill DE with real translations.`);
