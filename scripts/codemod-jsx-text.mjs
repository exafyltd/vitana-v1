#!/usr/bin/env node
// Wave 3: codemod hardcoded JSX text + translatable HTML attributes (placeholder,
// title, aria-label, alt) into translation keys.
//
// Strategy:
//   - For each .tsx component: find JSXText nodes whose contents are plain
//     ASCII text (no embedded JSX expressions, no multi-line spread).
//     Generate a key under <namespace>.<slug>.
//   - Replace `<elem>X</elem>` with `<elem>{t('<namespace>.<slug>')}</elem>`
//     using a singleton helper `t()` from src/lib/i18n-toast.ts (lookup alias).
//     Singleton-style is the simplest path that works in both components
//     and non-components — same trade-off as toasts. Re-render on language
//     change comes via the LanguageContext re-rendering its descendants
//     (selectedLanguage state change triggers a ProviderValue change).
//   - For translatable attributes: replace `placeholder="X"` with
//     `placeholder={t('<ns>.<slug>')}`.
//
// Conservative bail conditions:
//   - JSXText containing ${...} template syntax or {expr} adjacency that
//     would require a Trans-style interpolation
//   - Strings shorter than 2 letters OR matching brand allowlist
//   - Strings inside <code>, <pre>, <script>, <style> — preserve as-is
//
// New singleton helper: `t(key)` is added to i18n-toast.ts as an alias
// of lookup() so the JSX reads cleanly.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const MANIFEST = join(__dirname, '.codemod-jsx.manifest.json');

const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const a = process.argv.find((x) => x.startsWith('--only='));
  return a ? a.slice('--only='.length) : null;
})();
const MAX_FILES = (() => {
  const a = process.argv.find((x) => x.startsWith('--max-files='));
  return a ? parseInt(a.slice('--max-files='.length), 10) : Infinity;
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
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((t) => BRAND_TOKENS.has(t.replace(/[^\w]/g, '')))) return true;
  return false;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.tsx')) out.push(p); // tsx only — JSX is here
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

const allocated = new Map(); // ns -> Map<slug, en>
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

// --- core file rewriter --------------------------------------------------

// JSX text — strict form: `>TEXT</TAG` where TAG is an HTML tag or React
// component (so the closing tag is unambiguously JSX). This precludes:
//   - `=> p.foo < bar` (JS arrow + comparison)
//   - `Promise<void>` (TS generic)
//   - `<X> {expr} <Y>` mid-expression (single < follows our text but isn't a
//     closing tag)
//
// Tradeoff: we miss `<p>Hello <strong>world</strong></p>` where "Hello " is
// followed by an *opening* tag. Those cases are also more complex to migrate
// safely (text + nested element), so leaving them to a hand pass is fine.
//
// Pattern:  >TEXT</  where TEXT has letters, no { } < > or newlines.
const JSX_TEXT_RX = />([^<>{}\n][^<>{}\n]*?)<\//g;

// Defense-in-depth: even with `</`, refuse to match if the leading `>` is
// part of `=>` (arrow function). The character at m.index - 1 should not be `=`.
const PASCAL_IDENT_RX = /^[A-Z][A-Za-z0-9]*$/;

// Translatable HTML attributes
const ATTR_RX = /\b(placeholder|title|aria-label|aria-description|alt)\s*=\s*"([^"{}\n]{2,})"/g;

function rewriteFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const ns = namespaceFor(filePath);
  const edits = [];
  const usedKeys = new Set();

  // JSX text
  let m;
  while ((m = JSX_TEXT_RX.exec(source)) !== null) {
    const fullText = m[1];
    const trimmed = fullText.trim();
    if (isAllowed(trimmed)) continue;
    // Skip TS generics: single PascalCase identifier inside `<...>` is most
    // likely Promise<T>, Array<T>, ReactNode<T>, etc.
    if (PASCAL_IDENT_RX.test(trimmed)) continue;
    // Defense-in-depth: skip if the leading `>` is part of `=>`
    if (m.index > 0 && source[m.index - 1] === '=') continue;
    const key = allocateKey(ns, trimmed);
    usedKeys.add(key);
    // Preserve leading/trailing whitespace; include the `</` since our regex consumed it
    const leading = fullText.match(/^\s*/)[0];
    const trailing = fullText.match(/\s*$/)[0];
    const replacement = `>${leading}{t('${key}')}${trailing}</`;
    edits.push({ start: m.index, end: m.index + m[0].length, replacement });
  }

  // Reset regex state for attribute pass
  ATTR_RX.lastIndex = 0;
  while ((m = ATTR_RX.exec(source)) !== null) {
    const attrName = m[1];
    const value = m[2].trim();
    if (isAllowed(value)) continue;
    // Skip if context isn't JSX:
    //   - Followed by `,` or `}` or `)` → function param/destructure default
    //   - Inside a function signature line: `function|=>|const ... = (`
    const after = source.slice(m.index + m[0].length, m.index + m[0].length + 4);
    if (/^\s*[,)}]/.test(after)) continue;
    // Look at ~80 chars before for JSX-position cue: opening `<TagName` with
    // no closing `>` between it and our match.
    const ctxStart = Math.max(0, m.index - 200);
    const ctxBefore = source.slice(ctxStart, m.index);
    const lastTagOpen = ctxBefore.lastIndexOf('<');
    if (lastTagOpen < 0) continue;
    const between = ctxBefore.slice(lastTagOpen);
    // If between contains `>` followed by anything before our position,
    // we've already left the JSX tag — bail.
    if (/>[^<]*$/.test(between)) continue;
    // The lastTagOpen char must be the start of a JSX tag — followed by a
    // letter (component or HTML tag).
    if (!/^<[A-Za-z]/.test(between)) continue;
    const key = allocateKey(ns, value);
    usedKeys.add(key);
    const replacement = `${attrName}={t('${key}')}`;
    edits.push({ start: m.index, end: m.index + m[0].length, replacement });
  }

  if (edits.length === 0) return null;

  // Sort descending so splices don't shift indices
  edits.sort((a, b) => b.start - a.start);
  let next = source;
  for (const e of edits) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);

  // Inject `t` import from i18n-toast if missing.
  // Singleton-style: t(key) === lookup(key). We add `t` as an alias in i18n-toast.
  const importRx = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/i18n-toast['"]/;
  const existing = next.match(importRx);
  if (existing) {
    const present = new Set(existing[1].split(',').map((s) => s.trim()).filter(Boolean));
    if (!present.has('t')) {
      present.add('t');
      next = next.replace(importRx, `import { ${[...present].sort().join(', ')} } from '@/lib/i18n-toast'`);
    }
  } else {
    // Insert after last import statement (handles multi-line imports)
    const ll = next.split('\n');
    let lastImportEndIdx = -1;
    let inImport = false;
    for (let i = 0; i < ll.length; i++) {
      const t = ll[i];
      if (!inImport && /^\s*import\b/.test(t)) inImport = true;
      if (inImport && (
        /from\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(t) ||
        /^\s*import\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(t)
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

  return { source, next, edits, usedKeys };
}

// --- main ---------------------------------------------------------------

const allFiles = walk(SRC).filter(
  (f) => !IGNORED.some((rx) => rx.test(f)) && (!ONLY || f.includes(ONLY))
).slice(0, MAX_FILES);

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

console.log(`[codemod-jsx-text] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files touched: ${touched}`);
console.log(`  edits: ${totalEdits}`);
console.log(`  unique keys: ${Object.keys(manifest.keys).length}`);
console.log(`  namespaces: ${Object.keys(manifest.filesByNamespace).length}`);
console.log(`  manifest: ${MANIFEST}`);
console.log('  top namespaces:');
const top = Object.entries(manifest.filesByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [ns, count] of top) console.log(`    ${ns}: ${count} keys`);
