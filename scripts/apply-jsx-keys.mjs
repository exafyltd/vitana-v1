#!/usr/bin/env node
// Reads scripts/.codemod-jsx.manifest.json and writes the new keys into:
//   - src/i18n/en/screens.json   (English source = the extracted text)
//   - src/i18n/de/screens.json   (German placeholder = same English; marked _pending_review)
//
// The translator script (translate-keys.mjs --shard=screens) then drains the
// _pending_review queue via Gemini/DeepSeek/Anthropic.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MANIFEST = join(__dirname, '.codemod-jsx.manifest.json');
const EN_PATH = join(ROOT, 'src/i18n/en/screens.json');
const DE_PATH = join(ROOT, 'src/i18n/de/screens.json');

if (!existsSync(MANIFEST)) {
  console.error('Manifest not found. Run codemod-jsx-text.mjs --apply first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const enCat = existsSync(EN_PATH) ? JSON.parse(readFileSync(EN_PATH, 'utf8')) : {};
const deCat = existsSync(DE_PATH) ? JSON.parse(readFileSync(DE_PATH, 'utf8')) : {};

if (!enCat.screens) enCat.screens = {};
if (!deCat.screens) deCat.screens = {};

let added = 0;
let alreadyPresent = 0;

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
  setNested(deCat, key, english); // placeholder
  const parts = key.split('.');
  if (parts.length >= 3 && parts[0] === 'screens') {
    const ns = parts[1];
    const slug = parts.slice(2).join('.');
    if (!deCat.screens[ns]) deCat.screens[ns] = {};
    if (!deCat.screens[ns]._pending_review) deCat.screens[ns]._pending_review = {};
    deCat.screens[ns]._pending_review[slug] = true;
  }
  added++;
}

writeFileSync(EN_PATH, JSON.stringify(enCat, null, 2) + '\n', 'utf8');
writeFileSync(DE_PATH, JSON.stringify(deCat, null, 2) + '\n', 'utf8');

console.log(`[apply-jsx-keys] ${added} keys added, ${alreadyPresent} already present.`);
console.log(`  en/screens.json: ${EN_PATH}`);
console.log(`  de/screens.json: ${DE_PATH}`);
