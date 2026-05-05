#!/usr/bin/env node
// Walks src/pages/**/*.tsx and emits docs/SCREEN_INVENTORY.md — one section
// per page listing the i18n namespaces it consumes, the catalog status, and
// any hardcoded UI string suspects.
//
// Detection is regex-based (not AST). The ESLint rule no-raw-jsx-text owns
// the precise PR-time check; this script gives the user a proofreadable map.
//
// Run before opening a PR: `node scripts/generate-screen-inventory.mjs`
// CI re-runs it and fails if the output diff is non-empty.

import { readFileSync, readdirSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PAGES_DIR = join(ROOT, 'src', 'pages');
const I18N_DE = join(ROOT, 'src', 'i18n', 'de');
const OUT_PATH = join(ROOT, 'docs', 'SCREEN_INVENTORY.md');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(p);
  }
  return out;
}

const TRANSLATE_CALL_RX = /\btranslate\s*\(\s*['"`]([^'"`)]+)['"`]/g;
const T_DOT_RX = /\bt\.(?!toString|valueOf|hasOwnProperty)([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)/g;
// Wave 2: notify('toasts.x.y'), notifyError('toasts.x.y'), etc.
const NOTIFY_CALL_RX = /\bnotify(?:Error|Success|Info|Warning)?\s*\(\s*['"`]([^'"`)]+)['"`](?:\s*,\s*['"`]([^'"`)]+)['"`])?/g;

// Heuristic for hardcoded JSX text. Cheap and intentionally narrow — the
// authoritative check is the ESLint rule.
const RAW_JSX_TEXT_RX = />([^<{}\n][^<{}]{2,}?)</g;
const RAW_ATTR_RX = /\b(placeholder|title|aria-label|alt)\s*=\s*"([^"{}]{2,})"/g;
const RAW_TOAST_RX = /\b(toast|alert|confirm)\s*\(\s*"([^"{}]{2,})"/g;

const ENGLISH_HINT_RX = /\b(Save|Cancel|Delete|Edit|Confirm|Submit|Done|Close|Loading|Failed|Error|Success|Settings|Profile|Search|Welcome|Continue|Retry|Refresh|Next|Back)\b/;

function extractNamespacesFromKey(key) {
  return key.split('.')[0];
}

function shardExists(namespace) {
  return existsSync(join(I18N_DE, `${namespace}.json`));
}

function loadDeShard(namespace) {
  try {
    return JSON.parse(readFileSync(join(I18N_DE, `${namespace}.json`), 'utf8'));
  } catch {
    return null;
  }
}

function flattenKeys(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, p));
    else out.push(p);
  }
  return out;
}

const files = walk(PAGES_DIR).sort();
const sections = [];
let totalRawText = 0;
let totalKeysUsed = 0;
const namespaceUsage = new Map(); // namespace -> count of pages using it

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');

  const keysUsed = new Set();
  for (const m of src.matchAll(TRANSLATE_CALL_RX)) keysUsed.add(m[1]);
  for (const m of src.matchAll(T_DOT_RX)) keysUsed.add(m[1]);
  for (const m of src.matchAll(NOTIFY_CALL_RX)) {
    keysUsed.add(m[1]);
    if (m[2]) keysUsed.add(m[2]);
  }

  const namespacesUsed = new Set([...keysUsed].map(extractNamespacesFromKey));

  // Hardcoded string suspects: JSX text + attrs + toast args matching English hint
  const rawHits = [];
  for (const m of src.matchAll(RAW_JSX_TEXT_RX)) {
    const text = m[1].trim();
    if (text && ENGLISH_HINT_RX.test(text)) rawHits.push(text.slice(0, 80));
  }
  for (const m of src.matchAll(RAW_ATTR_RX)) {
    const text = m[2].trim();
    if (text && ENGLISH_HINT_RX.test(text)) rawHits.push(`[${m[1]}] ${text.slice(0, 80)}`);
  }
  for (const m of src.matchAll(RAW_TOAST_RX)) {
    const text = m[2].trim();
    if (text && ENGLISH_HINT_RX.test(text)) rawHits.push(`[${m[1]}()] ${text.slice(0, 80)}`);
  }

  totalRawText += rawHits.length;
  totalKeysUsed += keysUsed.size;
  for (const ns of namespacesUsed) namespaceUsage.set(ns, (namespaceUsage.get(ns) || 0) + 1);

  // Per-namespace coverage in DE
  const namespaceLines = [];
  for (const ns of [...namespacesUsed].sort()) {
    if (!shardExists(ns)) {
      namespaceLines.push(`- \`${ns}\` — **MISSING SHARD** in src/i18n/de/`);
      continue;
    }
    const deShard = loadDeShard(ns);
    const allKeys = new Set(flattenKeys(deShard));
    const usedFromNs = [...keysUsed].filter((k) => k.startsWith(ns + '.'));
    const missing = usedFromNs.filter((k) => !allKeys.has(k));
    namespaceLines.push(
      `- \`${ns}\` — used: ${usedFromNs.length}, total in shard: ${allKeys.size}` +
        (missing.length ? `, **MISSING:** ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}` : '')
    );
  }

  const status = rawHits.length === 0 ? '✅ clean' : `⚠️ ${rawHits.length} hardcoded suspect${rawHits.length === 1 ? '' : 's'}`;

  sections.push({
    rel,
    keysUsed: keysUsed.size,
    namespaces: [...namespacesUsed].sort(),
    namespaceLines,
    rawHits,
    status,
  });
}

// Group sections by top-level page directory for readability
const grouped = new Map();
for (const s of sections) {
  const parts = s.rel.split('/');
  // src/pages/foo/Bar.tsx → group "foo"; src/pages/Bar.tsx → group "_root"
  const group = parts.length > 3 ? parts[2] : '_root';
  if (!grouped.has(group)) grouped.set(group, []);
  grouped.get(group).push(s);
}

const lines = [];
lines.push('# Vitana V1 — Screen Inventory');
lines.push('');
lines.push('> Auto-generated by `scripts/generate-screen-inventory.mjs`. Do not hand-edit.');
lines.push('> Run before opening a PR: `npm run i18n:inventory`. CI fails if this diff is non-empty.');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- **Pages scanned:** ${sections.length}`);
lines.push(`- **Distinct i18n keys consumed:** ${totalKeysUsed}`);
lines.push(`- **Namespaces in use:** ${namespaceUsage.size}`);
lines.push(`- **Hardcoded string suspects (regex heuristic):** ${totalRawText}`);
lines.push('');
lines.push('Pages with hardcoded suspects need migration into the catalog. The authoritative PR-time check is the ESLint rule `i18n/no-raw-jsx-text`.');
lines.push('');
lines.push('---');
lines.push('');

for (const [group, items] of [...grouped.entries()].sort()) {
  lines.push(`## ${group === '_root' ? 'Root pages' : group + '/'}`);
  lines.push('');
  for (const s of items) {
    lines.push(`### ${s.rel}`);
    lines.push('');
    lines.push(`**Status:** ${s.status} — keys consumed: ${s.keysUsed}, namespaces: ${s.namespaces.length || '_(none)_'}`);
    lines.push('');
    if (s.namespaceLines.length) {
      lines.push('**i18n namespaces:**');
      lines.push('');
      lines.push(...s.namespaceLines);
      lines.push('');
    }
    if (s.rawHits.length) {
      lines.push('<details><summary>Hardcoded suspects (top 10)</summary>');
      lines.push('');
      for (const h of s.rawHits.slice(0, 10)) lines.push(`- \`${h.replace(/`/g, '\\`')}\``);
      if (s.rawHits.length > 10) lines.push(`- _…and ${s.rawHits.length - 10} more_`);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }
}

lines.push('## Namespace usage across all pages');
lines.push('');
lines.push('| Namespace | Pages using it |');
lines.push('|---|---|');
for (const [ns, count] of [...namespaceUsage.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`| \`${ns}\` | ${count} |`);
}
lines.push('');

if (!existsSync(dirname(OUT_PATH))) mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

console.log(`[generate-screen-inventory] Wrote ${OUT_PATH}`);
console.log(`  pages: ${sections.length}, keys: ${totalKeysUsed}, namespaces: ${namespaceUsage.size}, suspects: ${totalRawText}`);
