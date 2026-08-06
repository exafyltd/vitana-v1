#!/usr/bin/env node
// LLM-based catalog auditor.
//
// Reviews every (en, target) pair for a locale and produces a verdict per
// key: OK | EDIT_SUGGESTED | LOW_CONFIDENCE. Use a different provider than
// the one that produced the translations (correlated-error risk if the same
// model both translates and audits itself).
//
// Two-phase audit:
//   Phase 1 — cheap static checks (no LLM):
//     - Placeholder integrity: every {name}/{count}/{date} in EN exists in target
//     - Length sanity: target length is < 5× EN length
//     - HTML/Markdown leak: target contains <tag> or **bold** that EN doesn't
//     - Brand preservation: brand tokens (Vitana, MAXINA, etc.) appear in target
//     - Empty target: target is "" or whitespace
//   Any failure here → EDIT_SUGGESTED with specific issue.
//
//   Phase 2 — semantic LLM check on the remainder:
//     - Send batches of (key, en, target) triples to the auditor
//     - Auditor returns { verdict, confidence (0-1), issue?, suggested? }
//     - LOW_CONFIDENCE = the auditor itself is uncertain
//
// Output:
//   - i18n-audit/<locale>/<shard>.json  (machine-readable per-shard)
//   - docs/i18n-audit-<locale>.md      (human-readable summary)
//   - stdout: counts (OK / EDIT_SUGGESTED / LOW_CONFIDENCE)
//
// Exit codes:
//   0 — pass (under threshold)
//   1 — too many flagged (gates `status: 'ga'` flip in CI)
//   2 — fatal error (missing key, bad locale, network failure unrecoverable)
//
// Usage:
//   GOOGLE_GEMINI_API_KEY=... node scripts/i18n-audit-llm.mjs --locale=de --provider=gemini
//   ANTHROPIC_API_KEY=... node scripts/i18n-audit-llm.mjs --locale=es --provider=anthropic
//   DEEPSEEK_API_KEY=...  node scripts/i18n-audit-llm.mjs --locale=de --provider=deepseek  (NOT recommended if DeepSeek translated)
//
// Flags:
//   --locale=de               (required, target locale code)
//   --provider=gemini         (gemini | anthropic | deepseek; default gemini)
//   --shard=screens           (limit to one shard)
//   --batch=30                (keys per LLM call)
//   --threshold=10            (pct EDIT_SUGGESTED+LOW_CONF that fails the run)
//   --resume                  (skip keys already audited with verdict OK)
//   --dry-run                 (count only, no LLM calls)

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

const TARGET_LOCALE = args.locale;
const PROVIDER = args.provider || 'gemini';
const SHARD_FILTER = args.shard || null;
const BATCH_SIZE = parseInt(args.batch || '30', 10);
const THRESHOLD_PCT = parseFloat(args.threshold || '10');
const RESUME = !!args.resume;
const DRY = !!args['dry-run'];

if (!TARGET_LOCALE) {
  console.error('Usage: node scripts/i18n-audit-llm.mjs --locale=<code> [--provider=gemini|anthropic|deepseek]');
  process.exit(2);
}

const TARGET_LANG_NAME = ({
  de: 'German', sr: 'Serbian', ar: 'Arabic', es: 'Spanish', ru: 'Russian',
  zh: 'Chinese', fr: 'French', pt: 'Portuguese', pl: 'Polish',
}[TARGET_LOCALE] || TARGET_LOCALE);

const TARGET_DIR = join(I18N_DIR, TARGET_LOCALE);
// Audit reports are generated artifacts, NOT translations. They live outside
// src/i18n/ because src/i18n/<locale>/*.json is consumed by an import.meta.glob
// in src/i18n/index.ts — leaving them inside baked ~1.5 MB of audit JSON per
// locale into the shipped bundle (VTID-03509).
const AUDIT_DIR = join(ROOT, 'i18n-audit', TARGET_LOCALE);
mkdirSync(AUDIT_DIR, { recursive: true });
const SRC_DIR = join(I18N_DIR, 'en');
if (!existsSync(TARGET_DIR) || !existsSync(SRC_DIR)) {
  console.error(`[audit] missing locale dir: ${TARGET_DIR} or ${SRC_DIR}`);
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
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callAnthropic(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.content?.[0]?.text || '';
}

async function callDeepSeek(prompt) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

const PROVIDERS = { gemini: callGemini, anthropic: callAnthropic, deepseek: callDeepSeek };
const callProvider = PROVIDERS[PROVIDER];
if (!callProvider) {
  console.error(`[audit] unknown provider: ${PROVIDER}`);
  process.exit(2);
}

// ---------------------------------------------------------- helpers

function flattenLeaves(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenLeaves(v, path));
    else if (typeof v === 'string') out.push({ path, value: v });
  }
  return out;
}

function deepGet(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

const PLACEHOLDER_RX = /\{([A-Za-z_$][\w$]*)\}/g;
const HTML_TAG_RX = /<\/?[a-zA-Z][^>]*>/g;
const MARKDOWN_RX = /\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/g;
const BRAND_TOKENS = new Set([
  'Vitana', 'VITANA', 'MAXINA', 'Maxina', 'Lovable', 'Exafy', 'EXAFY',
]);

function extractPlaceholders(s) {
  const out = new Set();
  let m;
  PLACEHOLDER_RX.lastIndex = 0;
  while ((m = PLACEHOLDER_RX.exec(s)) !== null) out.add(m[1]);
  return out;
}

// Phase 1: static checks. Returns { ok, issue?, severity? } per pair.
function staticCheck(en, target) {
  if (typeof target !== 'string') {
    return { ok: false, severity: 'EDIT_SUGGESTED', issue: 'target is not a string' };
  }
  const trimmed = target.trim();
  if (en.trim() && !trimmed) {
    return { ok: false, severity: 'EDIT_SUGGESTED', issue: 'target is empty while EN is non-empty' };
  }
  // Placeholder integrity
  const enPh = extractPlaceholders(en);
  const tgtPh = extractPlaceholders(target);
  const missing = [...enPh].filter((p) => !tgtPh.has(p));
  const extra = [...tgtPh].filter((p) => !enPh.has(p));
  if (missing.length || extra.length) {
    return {
      ok: false,
      severity: 'EDIT_SUGGESTED',
      issue: `placeholder mismatch (missing: ${missing.join(',') || 'none'}; extra: ${extra.join(',') || 'none'})`,
    };
  }
  // Length sanity (only if EN is meaningfully long)
  if (en.length >= 10 && target.length > en.length * 5) {
    return {
      ok: false,
      severity: 'EDIT_SUGGESTED',
      issue: `target ${(target.length / en.length).toFixed(1)}× longer than EN`,
    };
  }
  // HTML leak
  const enTags = (en.match(HTML_TAG_RX) || []).length;
  const tgtTags = (target.match(HTML_TAG_RX) || []).length;
  if (tgtTags > enTags) {
    return {
      ok: false,
      severity: 'EDIT_SUGGESTED',
      issue: `target has ${tgtTags - enTags} more HTML tag(s) than EN`,
    };
  }
  // Brand preservation
  for (const tok of BRAND_TOKENS) {
    const enHas = new RegExp(`\\b${tok}\\b`).test(en);
    const tgtHas = new RegExp(`\\b${tok}\\b`).test(target);
    if (enHas && !tgtHas) {
      return { ok: false, severity: 'EDIT_SUGGESTED', issue: `brand token "${tok}" missing from target` };
    }
  }
  return { ok: true };
}

// Phase 2: LLM check.
function buildAuditPrompt(items) {
  return `You are auditing UI string translations from English to ${TARGET_LANG_NAME}.

For each entry, judge whether the ${TARGET_LANG_NAME} translation accurately conveys the English meaning AND is appropriate for a wellness/longevity mobile app's friendly, du-form (informal) register.

Output ONLY a JSON object keyed by entry index:
  {
    "<index>": {
      "verdict": "OK" | "EDIT_SUGGESTED" | "LOW_CONFIDENCE",
      "confidence": 0.0-1.0,
      "issue": "<short reason>" (only if not OK),
      "suggested": "<corrected ${TARGET_LANG_NAME} translation>" (only if EDIT_SUGGESTED)
    },
    ...
  }

Rules:
- "OK" — translation is accurate and idiomatic, no changes needed.
- "EDIT_SUGGESTED" — meaning wrong, gender wrong, register inconsistent, awkward phrasing, or missing nuance.
- "LOW_CONFIDENCE" — you're not sure (ambiguous EN, missing visual context, regional-variant question).
- Brand names (Vitana, MAXINA) must remain unchanged.
- Placeholders like {name} or {count} must remain literal.
- Use du-form (informal "du", not "Sie") for German.
- Tech loanwords (Community, Fitness, Premium, Live, etc.) staying in English is fine in German.
- **Compound-word rule**: flag as EDIT_SUGGESTED any ${TARGET_LANG_NAME} translation containing a single word longer than 22 characters that could be split. Suggest the hyphenated form. Example: "Benachrichtigungseinstellungen" → "Benachrichtigungs-Einstellungen". Words like "Datenschutz" or "Geburtstagsfeier" (short compounds) are fine.
- Output ONLY the JSON object — no preamble, no commentary.

Entries:
${items.map((it, i) => `${i}: EN: ${JSON.stringify(it.en)} ${TARGET_LANG_NAME}: ${JSON.stringify(it.target)}`).join('\n')}`;
}

async function llmAuditBatch(items) {
  const prompt = buildAuditPrompt(items);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callProvider(prompt);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON in response: ' + raw.slice(0, 200));
      const parsed = JSON.parse(m[0]);
      const out = new Map();
      for (let i = 0; i < items.length; i++) {
        const r = parsed[String(i)];
        if (!r || typeof r !== 'object') continue;
        const verdict = ['OK', 'EDIT_SUGGESTED', 'LOW_CONFIDENCE'].includes(r.verdict) ? r.verdict : 'LOW_CONFIDENCE';
        out.set(items[i].path, {
          verdict,
          confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
          issue: typeof r.issue === 'string' ? r.issue : undefined,
          suggested: typeof r.suggested === 'string' ? r.suggested : undefined,
        });
      }
      return out;
    } catch (err) {
      console.warn(`  [attempt ${attempt}/3] ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return new Map();
}

// ---------------------------------------------------------- main

const shards = readdirSync(SRC_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !SHARD_FILTER || f === `${SHARD_FILTER}.json`);

console.log(`[audit] provider=${PROVIDER} locale=${TARGET_LOCALE} (${TARGET_LANG_NAME}) shards=${shards.length}`);
if (PROVIDER === 'deepseek') {
  console.warn('[audit] WARNING: DeepSeek was used to translate; using DeepSeek to audit risks correlated errors. Prefer --provider=gemini or --provider=anthropic for cross-check.');
}

let totalOK = 0;
let totalEdit = 0;
let totalLowConf = 0;
let totalChecked = 0;
const overallReport = {
  generatedAt: new Date().toISOString(),
  locale: TARGET_LOCALE,
  provider: PROVIDER,
  shards: {},
};

for (const shardName of shards) {
  const enShard = JSON.parse(readFileSync(join(SRC_DIR, shardName), 'utf8'));
  const tgtShardPath = join(TARGET_DIR, shardName);
  if (!existsSync(tgtShardPath)) {
    console.warn(`[audit] skip ${shardName}: missing target shard`);
    continue;
  }
  const tgtShard = JSON.parse(readFileSync(tgtShardPath, 'utf8'));
  const enLeaves = flattenLeaves(enShard);
  const auditPath = join(AUDIT_DIR, shardName);
  const prevAudit = RESUME && existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, 'utf8')) : { verdicts: {} };

  const verdicts = { ...prevAudit.verdicts };
  const itemsToLlm = [];
  let staticEdits = 0;

  for (const { path, value: enValue } of enLeaves) {
    if (RESUME && verdicts[path] && verdicts[path].verdict === 'OK') continue;
    const tgt = deepGet(tgtShard, path);
    const sc = staticCheck(enValue, tgt);
    if (!sc.ok) {
      verdicts[path] = {
        verdict: sc.severity,
        confidence: 1.0,
        issue: sc.issue,
        phase: 'static',
      };
      staticEdits++;
      totalChecked++;
      continue;
    }
    // Skip LLM for trivial cases: identical EN==target (loanwords, brand names)
    if (typeof tgt === 'string' && tgt === enValue) {
      verdicts[path] = { verdict: 'OK', confidence: 1.0, phase: 'identical' };
      totalChecked++;
      continue;
    }
    itemsToLlm.push({ path, en: enValue, target: tgt });
  }

  console.log(`[audit] ${shardName}: ${enLeaves.length} keys, ${staticEdits} static EDIT, ${itemsToLlm.length} → LLM`);
  if (DRY) {
    overallReport.shards[shardName] = { total: enLeaves.length, llmQueue: itemsToLlm.length, staticEdits };
    continue;
  }

  // LLM audit in batches
  for (let i = 0; i < itemsToLlm.length; i += BATCH_SIZE) {
    const batch = itemsToLlm.slice(i, i + BATCH_SIZE);
    const tStart = Date.now();
    let results;
    try {
      results = await llmAuditBatch(batch);
    } catch (err) {
      console.error(`  batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message}`);
      for (const it of batch) {
        verdicts[it.path] = { verdict: 'LOW_CONFIDENCE', confidence: 0.0, issue: 'audit failed: ' + err.message, phase: 'llm-error' };
      }
      continue;
    }
    for (const it of batch) {
      const r = results.get(it.path);
      if (r) {
        verdicts[it.path] = { ...r, phase: 'llm' };
      } else {
        verdicts[it.path] = { verdict: 'LOW_CONFIDENCE', confidence: 0.0, issue: 'auditor returned no result', phase: 'llm-empty' };
      }
      totalChecked++;
    }
    // Persist after each batch
    writeFileSync(auditPath, JSON.stringify({ ...prevAudit, verdicts, generatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
    const took = ((Date.now() - tStart) / 1000).toFixed(1);
    const okCount = batch.filter((it) => verdicts[it.path].verdict === 'OK').length;
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: OK=${okCount}/${batch.length} in ${took}s`);
  }

  // Tally + report
  let shardOK = 0, shardEdit = 0, shardLow = 0;
  for (const v of Object.values(verdicts)) {
    if (v.verdict === 'OK') shardOK++;
    else if (v.verdict === 'EDIT_SUGGESTED') shardEdit++;
    else shardLow++;
  }
  totalOK += shardOK;
  totalEdit += shardEdit;
  totalLowConf += shardLow;
  overallReport.shards[shardName] = { total: enLeaves.length, ok: shardOK, edit: shardEdit, low: shardLow };
  writeFileSync(auditPath, JSON.stringify({ ...prevAudit, verdicts, generatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
}

const total = totalOK + totalEdit + totalLowConf;
const editPct = total === 0 ? 0 : (100 * (totalEdit + totalLowConf) / total);

// Write human-readable summary
const docsDir = join(ROOT, 'docs');
if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
const reportPath = join(docsDir, `i18n-audit-${TARGET_LOCALE}.md`);
const lines = [];
lines.push(`# i18n Audit — ${TARGET_LANG_NAME} (${TARGET_LOCALE})`);
lines.push('');
lines.push(`Generated: ${overallReport.generatedAt} via **${PROVIDER}**`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- **OK:** ${totalOK}`);
lines.push(`- **EDIT_SUGGESTED:** ${totalEdit}`);
lines.push(`- **LOW_CONFIDENCE:** ${totalLowConf}`);
lines.push(`- **Pass rate:** ${total === 0 ? 0 : ((100 * totalOK) / total).toFixed(1)}%`);
lines.push(`- **Threshold:** ${THRESHOLD_PCT}% flagged max`);
lines.push('');
lines.push('## Per-shard breakdown');
lines.push('');
lines.push('| Shard | OK | Edit | Low | Total |');
lines.push('|---|---|---|---|---|');
for (const [shard, s] of Object.entries(overallReport.shards)) {
  lines.push(`| ${shard} | ${s.ok ?? 0} | ${s.edit ?? 0} | ${s.low ?? 0} | ${s.total ?? 0} |`);
}
lines.push('');
lines.push('## Sample of flagged keys');
lines.push('');
let printed = 0;
for (const shardName of shards) {
  const auditPath = join(AUDIT_DIR, shardName);
  if (!existsSync(auditPath)) continue;
  const a = JSON.parse(readFileSync(auditPath, 'utf8'));
  for (const [path, v] of Object.entries(a.verdicts)) {
    if (v.verdict === 'OK') continue;
    if (printed >= 30) break;
    lines.push(`- \`${shardName}:${path}\` — **${v.verdict}** (${(v.confidence ?? 0).toFixed(2)})${v.issue ? ' — ' + v.issue : ''}`);
    if (v.suggested) lines.push(`  - suggested: \`${v.suggested}\``);
    printed++;
  }
  if (printed >= 30) break;
}
writeFileSync(reportPath, lines.join('\n'), 'utf8');

console.log('---');
console.log(`OK:              ${totalOK}`);
console.log(`EDIT_SUGGESTED:  ${totalEdit}`);
console.log(`LOW_CONFIDENCE:  ${totalLowConf}`);
console.log(`Pass rate:       ${total === 0 ? 0 : ((100 * totalOK) / total).toFixed(1)}%`);
console.log(`Flagged:         ${editPct.toFixed(1)}% (threshold ${THRESHOLD_PCT}%)`);
console.log(`Report:          ${reportPath}`);
console.log(`Per-shard:       i18n-audit/${TARGET_LOCALE}/<shard>.json`);

if (editPct > THRESHOLD_PCT) {
  console.error(`[audit] FAIL: ${editPct.toFixed(1)}% flagged > ${THRESHOLD_PCT}% threshold`);
  process.exit(1);
}
console.log('[audit] PASS');
process.exit(0);
