#!/usr/bin/env node
// i18n long-word audit + Gemini-driven hyphen splitting.
//
// German is famous for compound words that overflow narrow UIs:
//   "Benachrichtigungseinstellungen" (30 chars)
//   "Hydrationsmeisterschaft" (23 chars)
//   "Nahrungsergänzungsempfehlungen" (30 chars)
//
// This script:
//   1. Scans every value in src/i18n/<locale>/*.json
//   2. Finds words >= --max-word-length (default 22)
//   3. For each, asks Gemini to insert a hyphen at the natural compound boundary
//      (e.g. "Benachrichtigungseinstellungen" → "Benachrichtigungs-Einstellungen")
//   4. Writes results back to the catalog
//   5. Produces docs/i18n-long-words-<locale>.md report
//
// Usage:
//   GOOGLE_GEMINI_API_KEY=... node scripts/i18n-long-words.mjs --locale=de
//   node scripts/i18n-long-words.mjs --locale=de --check-only   # exit 1 if any
//   node scripts/i18n-long-words.mjs --locale=de --max-word-length=18
//   node scripts/i18n-long-words.mjs --locale=de --dry-run

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const locale = args.locale ?? 'de';
const MAX = Number(args['max-word-length'] ?? 22);
const dryRun = Boolean(args['dry-run']);
const checkOnly = Boolean(args['check-only']);

const dir = path.join('src/i18n', locale);
if (!fs.existsSync(dir)) {
  console.error(`No such locale dir: ${dir}`);
  process.exit(2);
}

// Words = unicode-letter runs of length >= MAX.
const wordRx = new RegExp(`[A-Za-zÄÖÜäöüßéàèùâêîôûïëçñáíóúýÝÁÍÓÚČĆĐŠŽčćđšž]{${MAX},}`, 'gu');

// Allowlist: monotonic repeating placeholders ("ACxxxxx...") used in legal
// templates as visual fillers. Not real words; the catalog has them on purpose.
function isPlaceholder(word) {
  if (/^[A-Z]{2}x{10,}$/.test(word)) return true;
  if (/^x{10,}$/i.test(word)) return true;
  return false;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const k in obj) {
    const v = obj[k];
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, p));
    else out[p] = v;
  }
  return out;
}

function setByDotPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) return false;
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) return false;
  cur[leaf] = value;
  return true;
}

// Collect long words across catalog
const shards = {};
const flagged = []; // { shard, key, value, words: [{ word, suggested? }] }

for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.json') || f.endsWith('._audit.json')) continue;
  const full = path.join(dir, f);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  shards[f] = data;
  const flat = flatten(data);
  for (const k in flat) {
    const v = flat[k];
    if (typeof v !== 'string') continue;
    const matches = [...v.matchAll(wordRx)].map((m) => m[0]).filter((w) => !isPlaceholder(w));
    if (matches.length === 0) continue;
    flagged.push({ shard: f.replace('.json', ''), file: f, key: k, value: v, words: matches });
  }
}

const shortName = (s) => s.replace(/\.json$/, '');
console.log(`Locale:               ${locale}`);
console.log(`Threshold:            ${MAX} characters`);
console.log(`Flagged values:       ${flagged.length}`);
console.log(`Flagged unique words: ${new Set(flagged.flatMap((f) => f.words)).size}`);

if (flagged.length === 0) {
  console.log('No long words found.');
  process.exit(0);
}

if (checkOnly) {
  console.log('\n--- sample (max 30) ---');
  for (const fl of flagged.slice(0, 30)) {
    console.log(`  ${fl.words.join('|')}  →  ${shortName(fl.file)}:${fl.key}`);
  }
  process.exit(1);
}

// --- Gemini splitting -----------------------------------------------------

async function callGemini(prompt) {
  const key = process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

const LANG_NAME = { de: 'German', es: 'Spanish', sr: 'Serbian', en: 'English', fr: 'French', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', pl: 'Polish', ar: 'Arabic' }[locale] || locale;

function buildPrompt(batch) {
  const examples = locale === 'de'
    ? `Examples:
  Benachrichtigungseinstellungen → Benachrichtigungs-Einstellungen
  Datenschutzerklärung → Datenschutz-Erklärung
  Hydrationsmeisterschaft → Hydrations-Meisterschaft
  Nahrungsergänzungsempfehlungen → Nahrungsergänzungs-Empfehlungen
  Bildgenerierungsanfragen → Bildgenerierungs-Anfragen
  Geburtstagsfeier → Geburtstagsfeier   (already short enough — DO NOT split)
  Datenschutz → Datenschutz   (one root — DO NOT split)`
    : `Examples (general):
  - Keep words shorter than ${MAX} characters unchanged.
  - For compounds longer than ${MAX} characters, insert a hyphen at the natural compound boundary so the word breaks into two readable parts.`;

  return `You are editing a UI translation catalog (${LANG_NAME}). Long compound words overflow narrow mobile layouts. Split each compound word below at its natural compound boundary by inserting a single hyphen "-".

RULES:
- Each word listed below appears in the UI and is longer than ${MAX} characters.
- Insert ONE hyphen at the most natural compound boundary so the result reads as two parts.
- Preserve the original meaning EXACTLY. Do not paraphrase, do not translate.
- Preserve capitalization style (German nouns stay capitalized after the hyphen: "Benachrichtigungs-Einstellungen").
- Preserve any morphological connector ("s", "n", "es" in German) that originally connected the parts.
- If the word is a true root (not a compound) and cannot be split naturally, return it unchanged.
- Do NOT split single roots or short compounds (< ${MAX} chars).

${examples}

Return a JSON object mapping each input word to its hyphenated form (or unchanged if not splittable). No prose, just JSON.

WORDS TO SPLIT:
${batch.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Return shape:
{
  "${batch[0]}": "<hyphenated or unchanged>",
  ...
}`;
}

async function splitWordsBatch(words) {
  if (words.length === 0) return {};
  const prompt = buildPrompt(words);
  const raw = await callGemini(prompt);
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse Gemini output as JSON; raw:', raw.slice(0, 400));
    return {};
  }
}

const uniqueWords = [...new Set(flagged.flatMap((f) => f.words))];
console.log(`\nQuerying Gemini for ${uniqueWords.length} unique words...`);

const splits = {};
const BATCH = 25;
for (let i = 0; i < uniqueWords.length; i += BATCH) {
  const batch = uniqueWords.slice(i, i + BATCH);
  const res = await splitWordsBatch(batch);
  for (const w of batch) {
    const r = res[w];
    if (typeof r === 'string') splits[w] = r;
  }
  console.log(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(uniqueWords.length / BATCH)} → ${Object.keys(res).length} answers`);
}

// Sanity-filter: a split must contain a hyphen AND letters on both sides AND removing the hyphen must reproduce the original (or differ only by case-preserving connector handling).
const accepted = {};
const rejected = {};
for (const [orig, suggested] of Object.entries(splits)) {
  if (typeof suggested !== 'string' || suggested === orig) { rejected[orig] = '(unchanged or empty)'; continue; }
  if (!suggested.includes('-')) { rejected[orig] = '(no hyphen)'; continue; }
  const sansHyphen = suggested.replace(/-/g, '');
  // Compound morphology means the joined-back form may differ slightly from original
  // (e.g. "Datenschutzs-Erklärung" → "Datenschutzs Erklärung" — extra s). Be tolerant:
  // we accept if the suggested string starts with the original's first 4 chars and contains
  // at least one substring of the original of length >= 4.
  if (sansHyphen.toLowerCase() !== orig.toLowerCase()) {
    // softer check: at least 80% of original characters preserved in order
    const o = orig.toLowerCase();
    let pos = 0; let matched = 0;
    for (const c of sansHyphen.toLowerCase()) {
      if (pos < o.length && c === o[pos]) { matched++; pos++; }
    }
    if (matched / o.length < 0.85) {
      rejected[orig] = `(diverges from original: ${suggested})`;
      continue;
    }
  }
  accepted[orig] = suggested;
}

console.log(`\nAccepted splits: ${Object.keys(accepted).length}`);
console.log(`Rejected:        ${Object.keys(rejected).length}`);

// Apply: rewrite each flagged value, replacing each long word with its split
let applied = 0;
for (const fl of flagged) {
  let v = shards[fl.file];
  const flat = flatten(v);
  const orig = flat[fl.key];
  if (typeof orig !== 'string') continue;
  let next = orig;
  for (const w of fl.words) {
    const s = accepted[w];
    if (!s) continue;
    // Replace all occurrences (preserve case-sensitive)
    next = next.split(w).join(s);
  }
  if (next !== orig) {
    setByDotPath(shards[fl.file], fl.key, next);
    applied++;
  }
}
console.log(`Values rewritten: ${applied}`);

if (!dryRun) {
  for (const [f, data] of Object.entries(shards)) {
    fs.writeFileSync(path.join(dir, f), JSON.stringify(data, null, 2) + '\n');
  }
  console.log('Catalog written.');
}

// Report
const reportPath = `docs/i18n-long-words-${locale}.md`;
const md = [
  `# i18n long-word audit — ${locale}`,
  '',
  `Generated by \`scripts/i18n-long-words.mjs\`. Threshold: words >= ${MAX} chars.`,
  '',
  `Total flagged values: ${flagged.length}`,
  `Unique long words:    ${uniqueWords.length}`,
  `Accepted splits:      ${Object.keys(accepted).length}`,
  `Rejected:             ${Object.keys(rejected).length}`,
  '',
  '## Accepted splits',
  '',
  '| Original | Hyphenated |',
  '|---|---|',
  ...Object.entries(accepted).sort().map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Rejected (kept original — hand-review if needed)',
  '',
  '| Original | Reason |',
  '|---|---|',
  ...Object.entries(rejected).sort().map(([k, v]) => `| ${k} | ${v} |`),
];
fs.writeFileSync(reportPath, md.join('\n') + '\n');
console.log(`\nReport: ${reportPath}`);
