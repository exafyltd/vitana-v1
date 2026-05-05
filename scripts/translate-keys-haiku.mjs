#!/usr/bin/env node
// Walk every shard under src/i18n/de/, find keys flagged _pending_review,
// translate the English source (read from src/i18n/en/<same shard>) to German
// via Claude Haiku 4.5, write back, and clear the _pending_review flag per
// successfully translated key.
//
// Idempotent: skips keys that already have a translation AND no _pending_review.
// Re-runs on partial success (network errors leave keys flagged, retry).
//
// Cost: ~$0.0001 per string (Haiku 4.5). 1k keys ≈ $0.10.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/translate-keys-haiku.mjs
//   ANTHROPIC_API_KEY=... node scripts/translate-keys-haiku.mjs --dry-run
//   ANTHROPIC_API_KEY=... node scripts/translate-keys-haiku.mjs --shard=toasts

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DE_DIR = join(ROOT, 'src/i18n/de');
const EN_DIR = join(ROOT, 'src/i18n/en');

const DRY = process.argv.includes('--dry-run');
const SHARD_FILTER = (() => {
  const a = process.argv.find((x) => x.startsWith('--shard='));
  return a ? a.slice('--shard='.length) : null;
})();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY && !DRY) {
  console.error('Set ANTHROPIC_API_KEY (or pass --dry-run).');
  process.exit(1);
}

const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 30; // strings per API call
const MAX_RETRIES = 3;

// Walk an object, collect entries flagged in any nested `_pending_review` map.
// Returns Array<{ pathParts: string[], pendingMap: object, slug: string }>
function collectPending(obj, pathParts = []) {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  if (obj._pending_review && typeof obj._pending_review === 'object') {
    for (const slug of Object.keys(obj._pending_review)) {
      if (obj._pending_review[slug]) {
        out.push({ pathParts, pendingMap: obj._pending_review, slug });
      }
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...collectPending(v, [...pathParts, k]));
    }
  }
  return out;
}

function setNested(root, parts, value) {
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function getNested(root, parts) {
  let cur = root;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

async function translateBatch(items) {
  // items: [{ key, en }]
  const userMessage = `Translate the following user-interface strings from English to German.

Rules:
- Output ONLY a JSON object: { "<index>": "German translation", ... }
- Use du-form (informal) German, friendly tone matching a wellness app.
- Keep placeholders intact: {name}, {count}, {date}, etc.
- Keep emojis intact.
- For brand names (Vitana, MAXINA, Lovable), do not translate.
- Match length and tone to short UI labels (toasts, buttons).
- Do not add any text outside the JSON object.

Strings:
${items.map((it, i) => `${i}: ${JSON.stringify(it.en)}`).join('\n')}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
      }
      const data = await res.json();
      const text = (data.content && data.content[0] && data.content[0].text) || '';
      // Extract first JSON object
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object in response: ' + text.slice(0, 200));
      const parsed = JSON.parse(m[0]);
      const out = new Map();
      for (let i = 0; i < items.length; i++) {
        const v = parsed[String(i)];
        if (typeof v === 'string' && v.trim()) out.set(items[i].key, v.trim());
      }
      return out;
    } catch (err) {
      console.warn(`  [attempt ${attempt}/${MAX_RETRIES}] ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return new Map();
}

const shards = readdirSync(DE_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !SHARD_FILTER || f === `${SHARD_FILTER}.json`);

let totalPending = 0;
let totalTranslated = 0;
let totalFailed = 0;

for (const shardName of shards) {
  const dePath = join(DE_DIR, shardName);
  const enPath = join(EN_DIR, shardName);
  if (!existsSync(enPath)) continue;
  const deCat = JSON.parse(readFileSync(dePath, 'utf8'));
  const enCat = JSON.parse(readFileSync(enPath, 'utf8'));

  const pending = collectPending(deCat);
  if (pending.length === 0) continue;

  totalPending += pending.length;
  console.log(`[translate] ${shardName}: ${pending.length} pending`);
  if (DRY) continue;

  // Build (key, en) batches
  const items = pending
    .map(({ pathParts, slug }) => ({
      pathParts,
      slug,
      key: [...pathParts, slug].join('.'),
      en: getNested(enCat, [...pathParts, slug]),
    }))
    .filter((x) => typeof x.en === 'string' && x.en.length > 0);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const tStart = Date.now();
    let translations;
    try {
      translations = await translateBatch(batch);
    } catch (err) {
      console.error(`  batch ${i}-${i + batch.length} failed: ${err.message}`);
      totalFailed += batch.length;
      continue;
    }
    for (const it of batch) {
      const de = translations.get(it.key);
      if (!de) {
        totalFailed++;
        continue;
      }
      setNested(deCat, [...it.pathParts, it.slug], de);
      // Clear the _pending_review flag for this slug
      const pendingMap = getNested(deCat, [...it.pathParts, '_pending_review']);
      if (pendingMap && typeof pendingMap === 'object') delete pendingMap[it.slug];
      totalTranslated++;
    }
    // Persist after each batch so partial progress survives interruptions
    writeFileSync(dePath, JSON.stringify(deCat, null, 2) + '\n', 'utf8');
    const took = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`  batch ${i / BATCH_SIZE + 1}: +${translations.size}/${batch.length} in ${took}s`);
  }

  // Clean up empty _pending_review maps
  function pruneEmpty(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj._pending_review && Object.keys(obj._pending_review).length === 0) delete obj._pending_review;
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) pruneEmpty(v);
    }
  }
  pruneEmpty(deCat);
  writeFileSync(dePath, JSON.stringify(deCat, null, 2) + '\n', 'utf8');
}

console.log('---');
console.log(`pending found: ${totalPending}`);
console.log(`translated:    ${totalTranslated}`);
console.log(`failed:        ${totalFailed}`);
