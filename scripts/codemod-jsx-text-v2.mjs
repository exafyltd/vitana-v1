#!/usr/bin/env node
// Wave 4: extend Wave 3's codemod to cover the harder JSX text patterns.
//
// New patterns this codemod handles:
//   1. Multi-line text inside an element:
//        <Button>
//          Cancel
//        </Button>
//      → <Button>{t('screens.<ns>.cancel')}</Button>
//
//   2. Text followed by an OPENING tag (text-then-element):
//        <div>Click <a href="...">here</a></div>
//      → <div>{t('screens.<ns>.click')}<a href="...">{t('screens.<ns>.here')}</a></div>
//
//   3. Text following a CLOSING tag (element-then-text):
//        <div><Icon /> Save Profile</div>
//      → <div><Icon /> {t('screens.<ns>.saveProfile')}</div>
//
// Conservative bails (same as Wave 3):
//   - TS generics, JS arrow + comparison, single PascalCase identifiers
//   - Text containing JSX expressions {…} (Wave 5 will handle interpolation)
//   - Already-translated cases (existing {t(...)} expressions)
//
// Reuses the t() singleton from src/lib/i18n-toast.ts.
//
// Idempotent: skips files where the matched text is already inside a {t(...)}.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const MANIFEST = join(__dirname, '.codemod-jsx-v2.manifest.json');

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
const PASCAL_IDENT_RX = /^[A-Z][A-Za-z0-9]*$/;

function isAllowed(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!HAS_LETTERS.test(trimmed)) return true;
  if (BRAND_TOKENS.has(trimmed)) return true;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((tok) => BRAND_TOKENS.has(tok.replace(/[^\w]/g, '')))) return true;
  return false;
}

// Detect JS code patterns inside a captured "text" run — strong signal that
// our regex bridged across non-JSX context (e.g. ternary, comment, statement).
function looksLikeJsCode(text) {
  if (/=>/.test(text)) return true;        // arrow function
  if (/\/\*|\*\//.test(text)) return true; // block comment
  if (/;\s*\n/.test(text)) return true;    // statement terminator across lines
  if (/\)\s*:\s*\(/.test(text)) return true; // ternary close-then-reopen
  if (/\?\s*\(/.test(text)) return true;     // ternary then opening paren
  if (/\}\s*else\s*\{/.test(text)) return true;
  if (/\b(?:if|else|return|const|let|var|function|import|export|from|await|async|throw|type|interface|enum|class|new|typeof|instanceof)\s/.test(text)) return true;
  // Heavy parens often indicate JS expression boundaries leaking in
  if ((text.match(/[()]/g) || []).length > 3) return true;
  // JS object-literal property: comma followed by identifier:
  if (/,\s*\w+\s*:/.test(text)) return true;
  // JS object-literal property at the start of a line: identifier: (multi-line obj)
  if (/^\s*\w+\s*:\s*$/m.test(text)) return true;
  // JS assignment: identifier or property = value
  if (/\b\w+(\.\w+)*\s*=\s*[\w'"`]/.test(text)) return true;
  // Trimmed text starting with `)` — closing of a JS expression
  if (/^\s*\)/.test(text)) return true;
  // Conservative cap: very long bridged text is suspicious
  if (text.length > 150) return true;
  return false;
}

// PascalCase identifier check applies ONLY in contexts where TS generics are
// possible. We'll guard the "text + opening tag" pattern with this check.
function looksLikeTsGeneric(text, source, idx) {
  if (!PASCAL_IDENT_RX.test(text.trim())) return false;
  // Look back for a TS-position cue near the leading `<`
  const beforeStart = Math.max(0, idx - 50);
  const before = source.slice(beforeStart, idx);
  return /[:=]\s*<\s*$|\bas\s+<\s*$|\bextends\s+<\s*$|Record\s*<\s*$|Partial\s*<\s*$|Pick\s*<\s*$|Omit\s*<\s*$|Array\s*<\s*$|Promise\s*<\s*$|Map\s*<\s*$|Set\s*<\s*$|Awaited\s*<\s*$|ReturnType\s*<\s*$/.test(before);
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

// --- Patterns -----------------------------------------------------------
//
// Accept text containing newlines (multi-line spans). Limit total length to
// 200 chars to avoid catching gigantic blobs. The text class excludes
// `<`, `>`, `{`, `}` so it won't cross JSX boundaries or hit interpolations.
//
// Pattern A: text + closing tag      `>TEXT</`
// Pattern B: text + opening tag      `>TEXT<X`  (X = capital letter — JSX component or HTML lowercase tag)
//
// Pattern C: closing tag + text      `</X>TEXT<` (handled implicitly via Pattern A or B if the next char fits)

const JSX_TEXT_CLOSING_RX = />([^<>{}]{2,200}?)<(\/)/g;
const JSX_TEXT_OPENING_RX = />([^<>{}]{2,200}?)<([A-Za-z])/g;

function isJsxStartContext(source, idx) {
  // The `>` at idx must be the close of a JSX opening tag (or fragment
  // opener `>`). Heuristic: look back ~200 chars for `<TagName ...` without
  // an intervening `>` between the tag start and idx.
  const start = Math.max(0, idx - 200);
  const before = source.slice(start, idx);
  // Bail if leading char is `=` (i.e., `=>`) — JS arrow
  if (idx > 0 && source[idx - 1] === '=') return false;
  // Find the last unmatched `<` before idx
  const lastTagOpen = before.lastIndexOf('<');
  if (lastTagOpen < 0) return false;
  const absoluteTagOpen = start + lastTagOpen;
  const between = before.slice(lastTagOpen);

  // TS generic detector: if the `<` is directly preceded by an identifier
  // character (no whitespace), it's a TS generic like `useState<X>`,
  // `Array<T>`, `Promise<void>`, etc. JSX tags are preceded by whitespace,
  // `{`, `(`, `,`, `=`, `>`, `?`, `:` (ternary), `&&`, `||`, etc.
  if (absoluteTagOpen > 0) {
    const prevChar = source[absoluteTagOpen - 1];
    if (/[A-Za-z0-9_$]/.test(prevChar)) return false;
  }

  // TS-content detector: if the `<...>` contains union-type markers (` | `)
  // or generic-style nested types, it's TS not JSX.
  if (/\s\|\s|\s&\s/.test(between)) return false;

  // If between contains `>` after the `<`, the tag closed before our match
  if (/>[^<]*$/.test(between)) {
    return true;
  }
  // The lastTagOpen char must be the start of a JSX tag — followed by a letter
  if (!/^<[A-Za-z]/.test(between)) return false;
  return true;
}

function isInsideExpressionAtPosition(source, idx) {
  // Look back ~120 chars for the nearest `{` or `}` to determine if we're
  // inside a JSX expression container.
  const start = Math.max(0, idx - 120);
  const before = source.slice(start, idx);
  const lastBrace = Math.max(before.lastIndexOf('{'), before.lastIndexOf('}'));
  if (lastBrace < 0) return false;
  return before[lastBrace] === '{';
}

// Reject if the matched `>` is inside a // line comment or /* ... */ block.
function isInsideComment(source, idx) {
  // Find the start of the line containing idx
  const lineStart = source.lastIndexOf('\n', idx - 1) + 1;
  const lineToHere = source.slice(lineStart, idx);
  // Line comment: // appears before idx without an intervening string
  if (/(^|[^:])\/\//.test(lineToHere)) {
    // Verify the // isn't inside a string literal on this line
    // Cheap: count quotes before the //; if odd, we're inside a string
    const sliceBeforeComment = lineToHere.slice(0, lineToHere.search(/(^|[^:])\/\//) + 1);
    const quotes = (sliceBeforeComment.match(/(?<!\\)"/g) || []).length;
    const ticks = (sliceBeforeComment.match(/(?<!\\)`/g) || []).length;
    if (quotes % 2 === 0 && ticks % 2 === 0) return true;
  }
  // Block comment: scan back for the nearest /* and */; if /* is closer, we're inside
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

  // Track positions covered by Pattern A so Pattern B doesn't double-match
  const coveredStarts = new Set();

  // Pattern A: closing tag
  let m;
  JSX_TEXT_CLOSING_RX.lastIndex = 0;
  while ((m = JSX_TEXT_CLOSING_RX.exec(source)) !== null) {
    const fullText = m[1];
    const trimmed = fullText.trim();
    if (isAllowed(trimmed)) continue;
    if (looksLikeTsGeneric(trimmed, source, m.index)) continue;
    if (looksLikeJsCode(fullText)) continue;
    if (!isJsxStartContext(source, m.index)) continue;
    if (isInsideExpressionAtPosition(source, m.index)) continue;
    if (isInsideComment(source, m.index)) continue;
    const key = allocateKey(ns, trimmed);
    const leading = fullText.match(/^\s*/)[0];
    const trailing = fullText.match(/\s*$/)[0];
    const replacement = `>${leading}{t('${key}')}${trailing}</`;
    edits.push({ start: m.index, end: m.index + m[0].length, replacement });
    coveredStarts.add(m.index);
  }

  // Pattern B: opening tag (text-then-element)
  JSX_TEXT_OPENING_RX.lastIndex = 0;
  while ((m = JSX_TEXT_OPENING_RX.exec(source)) !== null) {
    if (coveredStarts.has(m.index)) continue;
    const fullText = m[1];
    const nextChar = m[2];
    const trimmed = fullText.trim();
    if (isAllowed(trimmed)) continue;
    if (looksLikeTsGeneric(trimmed, source, m.index)) continue;
    if (looksLikeJsCode(fullText)) continue;
    if (!isJsxStartContext(source, m.index)) continue;
    if (isInsideExpressionAtPosition(source, m.index)) continue;
    if (isInsideComment(source, m.index)) continue;
    const key = allocateKey(ns, trimmed);
    const leading = fullText.match(/^\s*/)[0];
    const trailing = fullText.match(/\s*$/)[0];
    const replacement = `>${leading}{t('${key}')}${trailing}<${nextChar}`;
    edits.push({ start: m.index, end: m.index + m[0].length, replacement });
  }

  if (edits.length === 0) return null;

  // Sort descending so splices don't shift indices — and dedupe overlaps
  edits.sort((a, b) => b.start - a.start);
  const final = [];
  let lastStart = Infinity;
  for (const e of edits) {
    if (e.end > lastStart) continue; // overlaps with previous (later) edit
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

console.log(`[codemod-jsx-text-v2] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files touched: ${touched}`);
console.log(`  edits: ${totalEdits}`);
console.log(`  unique keys: ${Object.keys(manifest.keys).length}`);
console.log(`  namespaces: ${Object.keys(manifest.filesByNamespace).length}`);
console.log(`  manifest: ${MANIFEST}`);
console.log('  top namespaces:');
const top = Object.entries(manifest.filesByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [ns, count] of top) console.log(`    ${ns}: ${count} keys`);
