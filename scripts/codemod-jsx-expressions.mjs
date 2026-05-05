#!/usr/bin/env node
// Wave 5: handle JSX text adjacent to JSX expressions ({someVar}).
//
// Patterns this codemod handles (one expression per match — multiple
// expressions are treated separately):
//
//   <p>Hey {user.name}!</p>
//     → <p>{t('screens.<ns>.heyName', { name: user.name })}</p>
//     en: "Hey {name}!"
//
//   <p>Balance: {amount}</p>
//     → <p>{t('screens.<ns>.balanceAmount', { amount })}</p>
//     en: "Balance: {amount}"
//
//   <p>{count} results</p>
//     → <p>{t('screens.<ns>.resultsCount', { count })}</p>
//     en: "{count} results"
//
// The lookup() helper in src/lib/i18n-toast.ts already supports {paramName}
// placeholder substitution.
//
// Conservative bails:
//   - Expression contains anything but identifier/property-access (no calls,
//     ternaries, JSX, template strings, math)
//   - Surrounding text doesn't contain user-visible letters
//   - Already-wrapped {t(...)} calls
//   - JS code context (same checks as Wave 4)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const MANIFEST = join(__dirname, '.codemod-jsx-expr.manifest.json');

const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const a = process.argv.find((x) => x.startsWith('--only='));
  return a ? a.slice('--only='.length) : null;
})();

const IGNORED = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]lib[\\/]i18n-(toast|helpers)\.ts$/,
  /[\\/]src[\\/]hooks[\\/]use(I18nNotify|Translation|-toast)\.ts$/,
  /[\\/]src[\\/]types[\\/]/,
  /[\\/]src[\\/]pages[\\/]dev[\\/]/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

const BRAND_TOKENS = new Set([
  'Vitana', 'VITANA', 'MAXINA', 'Maxina', 'Lovable', 'Exafy', 'EXAFY',
  'OK', 'Ok', 'AI', 'API', 'URL', 'ID', 'UUID', 'PDF', 'CSV', 'JSON',
  'EN', 'DE', 'AR', 'ES', 'FR', 'PT', 'PL', 'RU', 'ZH', 'SR',
]);

const HAS_LETTERS = /[A-Za-z]{2,}/;

function isAllowed(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!HAS_LETTERS.test(trimmed)) return true;
  if (BRAND_TOKENS.has(trimmed)) return true;
  return false;
}

function looksLikeJsCode(text) {
  if (/=>/.test(text)) return true;
  if (/\/\*|\*\//.test(text)) return true;
  if (/;\s*\n/.test(text)) return true;
  if (/\)\s*:\s*\(/.test(text)) return true;
  if (/\?\s*\(/.test(text)) return true;
  if (/\}\s*else\s*\{/.test(text)) return true;
  if (/\b(?:if|else|return|const|let|var|function|import|export|from|await|async|throw|type|interface|enum|class|new|typeof|instanceof)\s/.test(text)) return true;
  return false;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function namespaceFor(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  let m = rel.match(/^src\/(?:pages|components)\/([A-Za-z][A-Za-z0-9-]+)\//);
  if (m) return m[1].toLowerCase();
  m = rel.match(/^src\/pages\/([A-Za-z][A-Za-z0-9-]+)\.tsx$/);
  if (m) return m[1].toLowerCase();
  if (rel.startsWith('src/hooks/')) return 'hooks';
  return 'common';
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'is', 'are',
  'was', 'were', 'be', 'been', 'being',
]);

function slugify(s) {
  if (!s) return 'text';
  const words = s
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 \-_/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 6);
  if (words.length === 0) return 'text';
  const head = words[0].toLowerCase();
  const tail = words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
  let slug = (head + tail).replace(/[^A-Za-z0-9_]/g, '');
  if (!slug || /^[0-9]/.test(slug)) slug = 'text' + slug;
  return slug.slice(0, 50);
}

const allocated = new Map();
function allocateKey(ns, en) {
  if (!allocated.has(ns)) allocated.set(ns, new Map());
  const slots = allocated.get(ns);
  let baseSlug = slugify(en);
  let slug = baseSlug;
  let i = 2;
  while (slots.has(slug) && slots.get(slug) !== en) {
    slug = `${baseSlug}${i}`;
    i++;
  }
  slots.set(slug, en);
  return `screens.${ns}.${slug}`;
}

// Derive a placeholder name from an expression.
// `user.name`     → `name`
// `count`         → `count`
// `obj.foo.bar`   → `bar`
// `getName()`     → null (function call — not simple)
// `a + b`         → null
function paramNameFor(expr) {
  const e = expr.trim();
  if (!/^[A-Za-z_$][\w$.]*$/.test(e)) return null;
  const last = e.split('.').pop();
  if (!last || !/^[A-Za-z_$]\w*$/.test(last)) return null;
  return last;
}

// Patterns:
//   Pattern A: `>TEXT_BEFORE{expr}TEXT_AFTER</`
//   Pattern B: `>TEXT_BEFORE{expr}TEXT_AFTER<X` (next opening tag)
// Combined regex: leading `>` with optional whitespace handling.
//
// Text class excludes `<`, `>`, `{`, `}`. Expression is a single
// non-nested identifier/property-access only.
const TEXT_EXPR_TEXT_RX = />([^<>{}\n]{0,100})\{([A-Za-z_$][\w$.]{0,60})\}([^<>{}\n]{0,100})<(\/|[A-Za-z])/g;

function isJsxStartContext(source, idx) {
  const start = Math.max(0, idx - 200);
  const before = source.slice(start, idx);
  if (idx > 0 && source[idx - 1] === '=') return false;
  const lastTagOpen = before.lastIndexOf('<');
  if (lastTagOpen < 0) return false;
  const absoluteTagOpen = start + lastTagOpen;
  const between = before.slice(lastTagOpen);
  if (absoluteTagOpen > 0) {
    const prevChar = source[absoluteTagOpen - 1];
    if (/[A-Za-z0-9_$]/.test(prevChar)) return false;
  }
  if (/\s\|\s|\s&\s/.test(between)) return false;
  if (/>[^<]*$/.test(between)) return true;
  if (!/^<[A-Za-z]/.test(between)) return false;
  return true;
}

function isInsideComment(source, idx) {
  const lineStart = source.lastIndexOf('\n', idx - 1) + 1;
  const lineToHere = source.slice(lineStart, idx);
  if (/(^|[^:])\/\//.test(lineToHere)) {
    const sliceBeforeComment = lineToHere.slice(0, lineToHere.search(/(^|[^:])\/\//) + 1);
    const quotes = (sliceBeforeComment.match(/(?<!\\)"/g) || []).length;
    const ticks = (sliceBeforeComment.match(/(?<!\\)`/g) || []).length;
    if (quotes % 2 === 0 && ticks % 2 === 0) return true;
  }
  const lastBlockOpen = source.lastIndexOf('/*', idx);
  if (lastBlockOpen >= 0) {
    const lastBlockClose = source.lastIndexOf('*/', idx);
    if (lastBlockOpen > lastBlockClose) return true;
  }
  return false;
}

function rewriteFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const ns = namespaceFor(filePath);
  const edits = [];

  let m;
  TEXT_EXPR_TEXT_RX.lastIndex = 0;
  while ((m = TEXT_EXPR_TEXT_RX.exec(source)) !== null) {
    const fullMatch = m[0];
    const before = m[1];
    const expr = m[2];
    const after = m[3];
    const nextChar = m[4];

    // Need at least SOME user-visible text in before+after (else the expression
    // stands alone — already correct JSX)
    const combined = (before + after).trim();
    if (isAllowed(combined)) continue;
    // Bail if combined text suggests JS code
    if (looksLikeJsCode(before + after)) continue;
    // Bail if not in JSX context
    if (!isJsxStartContext(source, m.index)) continue;
    if (isInsideComment(source, m.index)) continue;

    const paramName = paramNameFor(expr);
    if (!paramName) continue;

    // Catalog value: text_before + {paramName} + text_after
    const value = `${before}{${paramName}}${after}`;
    const slugSrc = (before.trim() + ' ' + paramName + ' ' + after.trim()).trim();
    const key = allocateKey(ns, value);
    // Use the slug derived from text-with-name for readability
    // (The allocateKey already builds a slug from `value`, which preserves
    // {paramName} as plain text — that gives reasonable slugs like
    // "heyNameWelcome" for "Hey {name} Welcome".)

    // Build the replacement: `>{t('key', { paramName: <expr> })}<X`
    const paramArg = paramName === expr ? `${paramName}` : `${paramName}: ${expr}`;
    const replacement = `>{t('${key}', { ${paramArg} })}<${nextChar}`;
    edits.push({ start: m.index, end: m.index + fullMatch.length, replacement });
  }

  if (edits.length === 0) return null;

  edits.sort((a, b) => b.start - a.start);
  const final = [];
  let lastStart = Infinity;
  for (const e of edits) {
    if (e.end > lastStart) continue;
    final.push(e);
    lastStart = e.start;
  }

  let next = source;
  for (const e of final) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);

  // Add `t` import if missing
  const importRx = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/i18n-toast['"]/;
  const existing = next.match(importRx);
  if (existing) {
    const present = new Set(existing[1].split(',').map((s) => s.trim()).filter(Boolean));
    if (!present.has('t')) {
      present.add('t');
      next = next.replace(importRx, `import { ${[...present].sort().join(', ')} } from '@/lib/i18n-toast'`);
    }
  } else {
    const ll = next.split('\n');
    let lastImportEndIdx = -1;
    let inImport = false;
    for (let i = 0; i < ll.length; i++) {
      const tl = ll[i];
      if (!inImport && /^\s*import\b/.test(tl)) inImport = true;
      if (inImport && (
        /from\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(tl) ||
        /^\s*import\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(tl)
      )) {
        lastImportEndIdx = i;
        inImport = false;
      }
    }
    const importLine = `import { t } from '@/lib/i18n-toast';`;
    if (lastImportEndIdx >= 0) ll.splice(lastImportEndIdx + 1, 0, importLine);
    else ll.unshift(importLine);
    next = ll.join('\n');
  }

  return { source, next, edits: final };
}

const allFiles = walk(SRC).filter(
  (f) => !IGNORED.some((rx) => rx.test(f)) && (!ONLY || f.includes(ONLY))
);

let touched = 0;
let totalEdits = 0;
const touchedFiles = [];

for (const file of allFiles) {
  const result = rewriteFile(file);
  if (!result) continue;
  touched++;
  totalEdits += result.edits.length;
  touchedFiles.push({ file: relative(ROOT, file), edits: result.edits.length });
  if (APPLY) writeFileSync(file, result.next, 'utf8');
}

const manifest = {
  generatedAt: new Date().toISOString(),
  totalFiles: touched,
  totalEdits,
  keys: {},
  filesByNamespace: {},
};
for (const [ns, slots] of allocated.entries()) {
  manifest.filesByNamespace[ns] = slots.size;
  for (const [slug, english] of slots.entries()) {
    manifest.keys[`screens.${ns}.${slug}`] = english;
  }
}
if (APPLY) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`[codemod-jsx-expressions] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files touched: ${touched}`);
console.log(`  edits: ${totalEdits}`);
console.log(`  unique keys: ${Object.keys(manifest.keys).length}`);
console.log(`  namespaces: ${Object.keys(manifest.filesByNamespace).length}`);
console.log(`  manifest: ${MANIFEST}`);
console.log('  top namespaces:');
const top = Object.entries(manifest.filesByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [ns, count] of top) console.log(`    ${ns}: ${count} keys`);
