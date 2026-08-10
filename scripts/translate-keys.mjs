#!/usr/bin/env node
// Multi-provider EN→DE translator for the i18n catalog.
//
// Walks every shard under src/i18n/<locale>/, finds keys flagged via
// _pending_review, translates the English source from src/i18n/en/<same shard>,
// writes back, and clears the _pending_review flag per successful key.
//
// Idempotent. Safe to interrupt — persists after every batch.
//
// Providers (env vars):
//   --provider=gemini   GOOGLE_GEMINI_API_KEY  (gemini-2.5-flash, ~free tier)
//   --provider=deepseek DEEPSEEK_API_KEY       (deepseek-chat)
//   --provider=anthropic ANTHROPIC_API_KEY     (claude-haiku-4-5; needs API credit)
//
// Usage:
//   GOOGLE_GEMINI_API_KEY=... node scripts/translate-keys.mjs --provider=gemini
//   DEEPSEEK_API_KEY=...      node scripts/translate-keys.mjs --provider=deepseek --shard=toasts
//   node scripts/translate-keys.mjs --dry-run   (counts pending, no API calls)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerInstruction } from './i18n-register-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N_DIR = join(ROOT, 'src/i18n');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq < 0) return [a.slice(2), true];
      return [a.slice(2, eq), a.slice(eq + 1)];
    }
    return [a, true];
  })
);

const PROVIDER = args.provider || 'gemini';
const DRY = !!args['dry-run'];
const INIT = !!args.init;
const SHARD_FILTER = args.shard || null; // single shard name (without .json)
const TARGET_LOCALE = args.locale || 'de';
const SRC_LOCALE = args.source || 'en';
const BATCH_SIZE = parseInt(args.batch || '30', 10);
const MAX_RETRIES = parseInt(args.retries || '3', 10);

const TARGET_LANG_NAME = (
  {
    de: 'German',
    sr: 'Serbian',
    ar: 'Arabic',
    es: 'Spanish',
    ru: 'Russian',
    zh: 'Chinese',
    fr: 'French',
    pt: 'Portuguese',
    pl: 'Polish',
  }[TARGET_LOCALE] || TARGET_LOCALE
);

const TARGET_DIR = join(I18N_DIR, TARGET_LOCALE);
const SRC_DIR = join(I18N_DIR, SRC_LOCALE);

if (!existsSync(SRC_DIR)) {
  console.error(`[translate] missing source locale dir: ${SRC_DIR}`);
  process.exit(2);
}

// --- bootstrap: --init creates the target locale dir by mirroring the
// source (en) shards. Every leaf string is left as the source value
// (placeholder) and flagged via _pending_review per shard, so a subsequent
// translate run picks it up. Idempotent: re-runs preserve any keys already
// in the target shard.
if (INIT) {
  const { mkdirSync } = await import('node:fs');

  // Keys already covered by a translation pass, per i18n-source-stamps/.
  //
  // Without this, --init re-flags every value that legitimately EQUALS its
  // English source — brand and product names ("Vitana", "MAXINA", "iPhone",
  // "Autopilot"), place names ("Mallorca"), phone numbers. 384 such keys in es
  // and 338 in sr. Its "has this been translated?" test is `target === source`,
  // which cannot distinguish "never translated" from "correctly translated to
  // the same string".
  //
  // The cost is not just wasted API budget on every run: each pass gives the
  // model another chance to "translate" a brand name, so `Autopilot` surviving
  // is a coin flip repeated indefinitely.
  //
  // A stamp means a translation pass has already decided this key. Staleness is
  // a separate question, owned by scripts/i18n-stamp-source.mjs --check/--flag.
  const stampPath = join(ROOT, 'i18n-source-stamps', `${TARGET_LOCALE}.json`);
  const alreadyTranslated = existsSync(stampPath)
    ? new Set(Object.keys(JSON.parse(readFileSync(stampPath, 'utf8'))))
    : new Set();
  if (alreadyTranslated.size) {
    console.log(`[translate] --init: ${alreadyTranslated.size} key(s) have source stamps; not re-flagging those`);
  }
  if (!existsSync(TARGET_DIR)) {
    mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`[translate] --init: created ${TARGET_DIR}`);
  }
  const srcShards = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json'));
  let created = 0;
  let merged = 0;
  let flagged = 0;
  for (const name of srcShards) {
    const srcPath = join(SRC_DIR, name);
    const tgtPath = join(TARGET_DIR, name);
    const srcCat = JSON.parse(readFileSync(srcPath, 'utf8'));
    const tgtCat = existsSync(tgtPath) ? JSON.parse(readFileSync(tgtPath, 'utf8')) : {};
    const shardKey = name.replace(/\.json$/, '');
    // For every leaf in src, ensure tgt has a placeholder + _pending_review flag.
    function walk(srcNode, tgtNode, parentPending, trail = []) {
      if (!srcNode || typeof srcNode !== 'object') return;
      if (!parentPending) {
        if (!tgtNode._pending_review || typeof tgtNode._pending_review !== 'object') {
          tgtNode._pending_review = {};
        }
        parentPending = tgtNode._pending_review;
      }
      for (const [k, v] of Object.entries(srcNode)) {
        if (k.startsWith('_')) continue;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!tgtNode[k] || typeof tgtNode[k] !== 'object') tgtNode[k] = {};
          walk(v, tgtNode[k], null, [...trail, k]);
        } else if (typeof v === 'string') {
          if (tgtNode[k] === undefined) {
            tgtNode[k] = v; // placeholder = source value
          }
          // Only flag if not already a real translation (i.e. tgt still
          // equals source, meaning it hasn't been translated yet).
          if (tgtNode[k] === v && !parentPending[k]) {
            // Stamped => a translation pass already covered this key, and the
            // match is a legitimate identical translation (brand name, etc).
            const dotted = [shardKey, ...trail, k].join('.');
            if (alreadyTranslated.has(dotted)) continue;
            parentPending[k] = true;
            flagged++;
          }
        }
      }
    }
    walk(srcCat, tgtCat, null, []);
    if (existsSync(tgtPath)) merged++; else created++;
    writeFileSync(tgtPath, JSON.stringify(tgtCat, null, 2) + '\n', 'utf8');
  }
  console.log(`[translate] --init: ${created} shard(s) created, ${merged} merged, ${flagged} key(s) flagged _pending_review`);
  // Fall through to normal translate flow (which will drain the just-flagged keys).
}

if (!existsSync(TARGET_DIR)) {
  console.error(`[translate] missing locale dir: ${TARGET_DIR} — pass --init to bootstrap from ${SRC_LOCALE}/`);
  process.exit(2);
}

// ---------------------------------------------------------- providers

async function callGemini(prompt) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: empty response: ' + JSON.stringify(data).slice(0, 200));
  return text;
}

async function callDeepSeek(prompt) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DeepSeek HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('DeepSeek: empty response: ' + JSON.stringify(data).slice(0, 200));
  return text;
}

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

const PROVIDERS = {
  gemini: callGemini,
  deepseek: callDeepSeek,
  anthropic: callAnthropic,
};
const callProvider = PROVIDERS[PROVIDER];
if (!callProvider) {
  console.error(`[translate] unknown provider: ${PROVIDER}. Use gemini | deepseek | anthropic.`);
  process.exit(2);
}

// ---------------------------------------------------------- collection

function collectPending(obj, pathParts = []) {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  if (obj._pending_review && typeof obj._pending_review === 'object') {
    for (const slug of Object.keys(obj._pending_review)) {
      if (obj._pending_review[slug]) out.push({ pathParts, slug });
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

function pruneEmpty(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (obj._pending_review && Object.keys(obj._pending_review).length === 0) delete obj._pending_review;
  for (const v of Object.values(obj)) if (v && typeof v === 'object' && !Array.isArray(v)) pruneEmpty(v);
}

// ---------------------------------------------------------- prompt

function buildPrompt(items) {
  return `Translate the following user-interface strings from English to ${TARGET_LANG_NAME}.

Rules:
- Output ONLY a JSON object: { "<index>": "${TARGET_LANG_NAME} translation", ... }
- REGISTER (${TARGET_LANG_NAME}): ${registerInstruction(TARGET_LOCALE)} Friendly tone, matching a wellness app.
- NEVER translate or rename a {placeholder}. {date} stays {date}, NOT {datum}/{fecha}. The
  surrounding words are translated; the token inside the braces is code and must be copied
  byte-for-byte. Translating it makes the app print a literal "{datum}" to the user.
- Keep emojis intact.
- For brand names (Vitana, MAXINA, Lovable, Exafy), do not translate.
- Match length and tone to short UI labels — these are toast notifications, button labels, error messages.
- **Compound-word rule**: never produce a single word longer than 22 characters. For ${TARGET_LANG_NAME} compounds that would exceed that, insert a hyphen at the natural compound boundary. Example (German): "Benachrichtigungseinstellungen" → "Benachrichtigungs-Einstellungen". Example (German): "Datenschutzerklärung" → "Datenschutz-Erklärung". Prefer hyphenated splits over paraphrasing.
- Do not add any text outside the JSON object.

Strings:
${items.map((it, i) => `${i}: ${JSON.stringify(it.en)}`).join('\n')}`;
}

/**
 * Placeholder tokens in a string, in order of appearance.
 *
 * A placeholder is `{` + an identifier + `}` — the runtime substitutes by key
 * name from a params object (src/lib/i18n-toast.ts). Deliberately NOT \w+:
 * a translated placeholder is usually non-ASCII ("{početak}", "{límite}") and an
 * ASCII-only pattern cannot see it. Equally deliberately NOT [^{}]+: some UI
 * strings embed a literal JSON example (an admin field shows
 * `{ "forbidden_openings": [...] }`), and that is not a placeholder. Excluding
 * whitespace and quotes separates the two without a special case.
 */
function placeholderList(v) {
  return [...String(v).matchAll(/\{([^{}\s"']+)\}/g)].map((m) => m[1]);
}

/**
 * Enforce placeholder integrity on a translation. (VTID-03509)
 *
 * The prompt already tells the model not to translate {placeholders}; it does
 * it anyway — an sr run produced "{datum} · {početak}–{kraj}" for
 * "{date} · {start}–{end}", and es produced "{usado} / {límite} {unidad}".
 * The app substitutes by NAME, so every one of those renders a literal token
 * to the user. An instruction is not an guarantee, so this is checked in code.
 *
 * When the model kept the right NUMBER of placeholders and merely renamed them,
 * the mapping back is unambiguous — remap positionally and keep the translation.
 * Otherwise reject it: the key stays _pending_review, which is recoverable,
 * whereas a silently corrupted string is not.
 */
function repairPlaceholders(source, translated) {
  const want = placeholderList(source);
  const got = placeholderList(translated);
  if (want.join(',') === got.join(',')) return translated;
  if (want.length !== got.length) return null; // unrecoverable — reject
  let i = 0;
  return String(translated).replace(/\{[^{}\s"']+\}/g, () => `{${want[i++]}}`);
}

async function translateBatch(items) {
  const prompt = buildPrompt(items);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callProvider(prompt);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object in response: ' + raw.slice(0, 200));
      const parsed = JSON.parse(m[0]);
      const out = new Map();
      for (let i = 0; i < items.length; i++) {
        const v = parsed[String(i)];
        if (typeof v !== 'string' || !v.trim()) continue;
        const fixed = repairPlaceholders(items[i].en, v.trim());
        if (fixed === null) {
          console.warn(
            `  ${items[i].key}: REJECTED — placeholders {${placeholderList(items[i].en)}} ` +
              `became {${placeholderList(v)}}; leaving _pending_review`,
          );
          continue;
        }
        if (fixed !== v.trim()) {
          console.log(`  ${items[i].key}: repaired renamed placeholder(s)`);
        }
        out.set(items[i].key, fixed);
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

// ---------------------------------------------------------- run

const shards = readdirSync(TARGET_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !SHARD_FILTER || f === `${SHARD_FILTER}.json`);

let totalPending = 0;
let totalTranslated = 0;
let totalFailed = 0;

console.log(`[translate] provider=${PROVIDER} target=${TARGET_LOCALE} (${TARGET_LANG_NAME}) source=${SRC_LOCALE}`);

for (const shardName of shards) {
  const tgtPath = join(TARGET_DIR, shardName);
  const srcPath = join(SRC_DIR, shardName);
  if (!existsSync(srcPath)) continue;
  const tgtCat = JSON.parse(readFileSync(tgtPath, 'utf8'));
  const srcCat = JSON.parse(readFileSync(srcPath, 'utf8'));

  const pending = collectPending(tgtCat);
  if (pending.length === 0) continue;

  totalPending += pending.length;
  console.log(`[translate] ${shardName}: ${pending.length} pending`);
  if (DRY) continue;

  const resolved = pending.map(({ pathParts, slug }) => ({
    pathParts,
    slug,
    key: [...pathParts, slug].join('.'),
    en: getNested(srcCat, [...pathParts, slug]),
  }));
  const items = resolved.filter((x) => typeof x.en === 'string' && x.en.length > 0);

  // A pending flag whose source string cannot be found used to be dropped
  // here, silently. That turns a real inconsistency into a no-op that is
  // indistinguishable from success: the run exits 0 in about a second, the
  // keys stay flagged forever, and the locale quietly never updates.
  //
  // It is exactly how 55 hand-flagged pt keys were lost — they had been
  // written in the wrong SHAPE (`_pending_review` at the shard root with
  // dotted paths, rather than beside the leaf keyed by its bare name), so
  // every lookup missed and the translator reported nothing to do.
  //
  // Either way it is a defect worth seeing: the flag points at a key that
  // does not exist in the source, so it can never be drained by any run.
  // Counted as failed so the exit code and the workflow both go red.
  const unresolvable = resolved.filter((x) => typeof x.en !== 'string' || x.en.length === 0);
  if (unresolvable.length) {
    console.error(
      `  ${shardName}: ${unresolvable.length} pending flag(s) have NO source string in ${SRC_LOCALE}/ — ` +
        `these can never be translated and will stay flagged:`,
    );
    for (const u of unresolvable.slice(0, 8)) console.error(`    ✗ ${u.key}`);
    if (unresolvable.length > 8) console.error(`    ...and ${unresolvable.length - 8} more`);
    totalFailed += unresolvable.length;
  }

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const tStart = Date.now();
    let translations;
    try {
      translations = await translateBatch(batch);
    } catch (err) {
      // A batch that fails every retry with the SAME error is not transient.
      // The observed cause is output truncation: a batch containing long legal
      // / privacy paragraphs produces a JSON response that exceeds the model's
      // output limit, so it is cut off mid-string and never parses. Retrying —
      // or re-dispatching the workflow — reproduces it exactly, forever. A
      // smaller --batch does not help either once a SINGLE item is long enough.
      //
      // Splitting is the fix that actually terminates: halve the batch and
      // retry, down to one item per request. One paragraph always fits, so the
      // recursion bottoms out on a real translation rather than a stuck key.
      if (batch.length > 1) {
        console.error(
          `  batch ${i}-${i + batch.length} failed (${err.message.slice(0, 60)}…) — splitting`,
        );
        const half = Math.ceil(batch.length / 2);
        const recovered = new Map();
        for (const part of [batch.slice(0, half), batch.slice(half)]) {
          try {
            for (const [k, v] of await translateBatch(part)) recovered.set(k, v);
          } catch (inner) {
            if (part.length === 1) {
              console.error(`  key ${part[0].key} failed alone: ${inner.message.slice(0, 80)}`);
              continue;
            }
            const q = Math.ceil(part.length / 2);
            for (const sub of [part.slice(0, q), part.slice(q)]) {
              try {
                for (const [k, v] of await translateBatch(sub)) recovered.set(k, v);
              } catch (e2) {
                console.error(`  sub-batch of ${sub.length} failed: ${e2.message.slice(0, 60)}`);
              }
            }
          }
        }
        translations = recovered;
        if (recovered.size === 0) {
          totalFailed += batch.length;
          continue;
        }
      } else {
        console.error(`  key ${batch[0].key} failed: ${err.message.slice(0, 80)}`);
        totalFailed += batch.length;
        continue;
      }
    }
    for (const it of batch) {
      const tx = translations.get(it.key);
      if (!tx) {
        totalFailed++;
        continue;
      }
      setNested(tgtCat, [...it.pathParts, it.slug], tx);
      const pendingMap = getNested(tgtCat, [...it.pathParts, '_pending_review']);
      if (pendingMap && typeof pendingMap === 'object') delete pendingMap[it.slug];
      totalTranslated++;
    }
    writeFileSync(tgtPath, JSON.stringify(tgtCat, null, 2) + '\n', 'utf8');
    const took = ((Date.now() - tStart) / 1000).toFixed(1);
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: +${translations.size}/${batch.length} in ${took}s`);
  }

  pruneEmpty(tgtCat);
  writeFileSync(tgtPath, JSON.stringify(tgtCat, null, 2) + '\n', 'utf8');
}

console.log('---');
console.log(`pending found: ${totalPending}`);
console.log(`translated:    ${totalTranslated}`);
console.log(`failed:        ${totalFailed}`);
process.exit(totalFailed > 0 ? 1 : 0);
