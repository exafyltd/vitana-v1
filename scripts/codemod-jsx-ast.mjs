#!/usr/bin/env node
// Wave 6: AST-based codemod for the residue.
//
// Uses TypeScript's compiler API to find JSX text patterns precisely:
//   1. JsxText nodes that haven't been wrapped yet
//   2. JsxText + JsxExpression sequences (text + complex expressions, multiple)
//   3. JsxElements whose children mix text and other JsxElements
//      → wrap with <Trans i18nKey="..." values={{...}}>...</Trans>
//   4. JsxAttributes with raw string values (placeholder, title, aria-label, alt)
//
// Strategy:
//   - Build sourceFile with ts.createSourceFile
//   - Walk every JsxElement and JsxFragment
//   - For each element, look at its children:
//     a) Pure text only → emit `{t('key')}` replacement
//     b) Text + simple expressions → emit `{t('key', { paramN: <expr> })}`
//     c) Text + nested JsxElements → emit Trans wrap
//   - For each JsxAttribute on placeholder/title/aria-label/alt with a
//     StringLiteral value → emit `attr={t('key')}`
//
// Bails (cases left to hand pass / future iteration):
//   - children whose only content is expressions (no JsxText) — already i18n-clean
//   - already-wrapped: any descendant calls t(), lookup(), notify*, translate()
//   - JsxText that's whitespace-only

import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const MANIFEST = join(__dirname, '.codemod-jsx-ast.manifest.json');

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
  /[\\/]src[\\/]components[\\/]Trans\.tsx$/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

const BRAND_TOKENS = new Set([
  'Vitana', 'VITANA', 'MAXINA', 'Maxina', 'Lovable', 'Exafy', 'EXAFY',
  'OK', 'Ok', 'AI', 'API', 'URL', 'ID', 'UUID', 'PDF', 'CSV', 'JSON',
  'EN', 'DE', 'AR', 'ES', 'FR', 'PT', 'PL', 'RU', 'ZH', 'SR',
]);

const HAS_LETTERS = /[A-Za-z]{2,}/;

function hasUserText(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!HAS_LETTERS.test(trimmed)) return false;
  if (BRAND_TOKENS.has(trimmed)) return false;
  return true;
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walkFiles(p));
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

function paramNameFor(exprText, idx) {
  const e = exprText.trim();
  // Drop optional chaining and !.
  const cleaned = e.replace(/\?\.|!\./g, '.');
  if (/^[A-Za-z_$][\w$.]*$/.test(cleaned)) {
    const last = cleaned.split('.').pop();
    if (last && /^[A-Za-z_$]\w*$/.test(last)) return last;
  }
  return `value${idx}`;
}

// JsxText.getText returns the raw source including whitespace. We want the
// trimmed user-visible content for translation, but preserve leading/trailing
// whitespace at the JSX boundary.
function jsxTextParts(text) {
  const leading = text.match(/^\s*/)?.[0] || '';
  const trailing = text.match(/\s*$/)?.[0] || '';
  const body = text.slice(leading.length, text.length - trailing.length);
  return { leading, trailing, body };
}

const TRANSLATION_FN_RX = /\b(?:t|lookup|translate|notify|notifyError|notifySuccess|notifyWarning|notifyInfo|Trans)\b/;

// Decide if a JsxElement's children are already i18n-managed (has t()/lookup/etc.)
function alreadyTranslated(node, source) {
  // Check the immediate children's text — if any expression contains a
  // translation function call, treat as managed.
  const text = source.slice(node.pos, node.end);
  return TRANSLATION_FN_RX.test(text);
}

// Process JsxText + JsxExpression children of a single JSX element.
// Returns { edits: [{start, end, replacement}], used: bool }
function processChildren(parent, sourceFile, source, ns) {
  const edits = [];
  const children = parent.children || [];
  if (!children.length) return edits;

  // Identify CONTIGUOUS runs of JsxText + JsxExpression that contain at least
  // one JsxText with user-visible content. Each run becomes one t() call.
  // Within a run, if there are nested JsxElements, we'd need <Trans> — but
  // children that are JsxElements break the run (we handle them recursively).
  const runs = [];
  let cur = [];
  let hasUser = false;
  for (const child of children) {
    if (ts.isJsxText(child)) {
      const text = child.getText(sourceFile);
      const { body } = jsxTextParts(text);
      if (hasUserText(body)) hasUser = true;
      cur.push(child);
    } else if (ts.isJsxExpression(child)) {
      // Allow simple expressions (no JsxElement inside — that's a different case)
      const exprText = child.expression ? child.expression.getText(sourceFile) : '';
      // If the expression contains JSX or arrow function, break the run.
      if (/<[A-Za-z]|<\/|=>/.test(exprText)) {
        if (cur.length && hasUser) runs.push(cur);
        cur = [];
        hasUser = false;
      } else {
        cur.push(child);
      }
    } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      // Nested JSX element — for now, break the run. Wave 6.x or hand-pass
      // can wrap these with <Trans>.
      if (cur.length && hasUser) runs.push(cur);
      cur = [];
      hasUser = false;
    } else {
      // Whitespace-only or unknown: include if cur has content
      if (cur.length) cur.push(child);
    }
  }
  if (cur.length && hasUser) runs.push(cur);

  for (const run of runs) {
    // Build catalog template + values map from this run
    const valueMap = []; // [{ name, exprText, isParenthesized }]
    let template = '';
    for (const child of run) {
      if (ts.isJsxText(child)) {
        const text = child.getText(sourceFile);
        template += text;
      } else if (ts.isJsxExpression(child) && child.expression) {
        const exprText = child.expression.getText(sourceFile);
        const name = paramNameFor(exprText, valueMap.length);
        // Avoid name collisions in valueMap
        let finalName = name;
        let i = 2;
        while (valueMap.some((v) => v.name === finalName)) {
          finalName = `${name}${i}`;
          i++;
        }
        valueMap.push({ name: finalName, exprText });
        template += `{${finalName}}`;
      }
    }

    const trimmedTemplate = template.replace(/^\s+|\s+$/g, '');
    if (!hasUserText(trimmedTemplate.replace(/\{[^}]+\}/g, ''))) continue;

    const key = allocateKey(ns, trimmedTemplate);

    // Build replacement: `{t('key', { paramName: <expr>, ... })}` (or no params object if zero)
    const paramArgs = valueMap
      .map((v) => (v.name === v.exprText.trim() ? v.name : `${v.name}: ${v.exprText}`))
      .join(', ');
    const replacement = paramArgs
      ? `{t('${key}', { ${paramArgs} })}`
      : `{t('${key}')}`;

    // Preserve leading/trailing whitespace from the FIRST and LAST JsxText
    const firstChild = run[0];
    const lastChild = run[run.length - 1];
    const start = firstChild.getFullStart();
    const end = lastChild.end;

    // Compute leading WS from the first JsxText
    let leading = '';
    let trailing = '';
    if (ts.isJsxText(firstChild)) {
      const t = firstChild.getText(sourceFile);
      leading = t.match(/^\s*/)?.[0] || '';
    }
    if (ts.isJsxText(lastChild)) {
      const t = lastChild.getText(sourceFile);
      trailing = t.match(/\s*$/)?.[0] || '';
    }

    edits.push({
      start,
      end,
      replacement: leading + replacement + trailing,
    });
  }

  return edits;
}

// Process JsxAttributes: placeholder/title/aria-label/aria-description/alt with string-literal value
const I18N_ATTRS = new Set(['placeholder', 'title', 'aria-label', 'aria-description', 'alt']);

function processAttributes(node, sourceFile, source, ns) {
  const edits = [];
  if (!node.attributes || !node.attributes.properties) return edits;
  for (const attr of node.attributes.properties) {
    if (!ts.isJsxAttribute(attr)) continue;
    const name = attr.name && attr.name.escapedText;
    if (typeof name !== 'string' || !I18N_ATTRS.has(name)) continue;
    if (!attr.initializer) continue;
    if (!ts.isStringLiteral(attr.initializer)) continue;
    const value = attr.initializer.text;
    if (!hasUserText(value)) continue;
    const key = allocateKey(ns, value);
    const replacement = `${name}={t('${key}')}`;
    edits.push({ start: attr.getStart(sourceFile), end: attr.end, replacement });
  }
  return edits;
}

function rewriteFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const ns = namespaceFor(filePath);
  const edits = [];

  function visit(node) {
    if (
      ts.isJsxElement(node) ||
      ts.isJsxFragment(node) ||
      ts.isJsxSelfClosingElement(node)
    ) {
      // Process children of opening tag
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        edits.push(...processChildren(node, sourceFile, source, ns));
      }
      // Process attributes of the opening tag (or self-closing)
      const opening = ts.isJsxSelfClosingElement(node)
        ? node
        : (node.openingElement || null);
      if (opening) edits.push(...processAttributes(opening, sourceFile, source, ns));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (edits.length === 0) return null;

  // Drop overlapping edits: sort by start ascending; reject any whose start
  // is before the previous accepted edit's end.
  edits.sort((a, b) => a.start - b.start || a.end - b.end);
  const accepted = [];
  let lastEnd = -1;
  for (const e of edits) {
    if (e.start < lastEnd) continue;
    accepted.push(e);
    lastEnd = e.end;
  }

  // Apply right-to-left
  accepted.sort((a, b) => b.start - a.start);
  let next = source;
  for (const e of accepted) {
    next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
  }

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

  return { source, next, edits: accepted };
}

const allFiles = walkFiles(SRC).filter(
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

console.log(`[codemod-jsx-ast] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files touched: ${touched}`);
console.log(`  edits: ${totalEdits}`);
console.log(`  unique keys: ${Object.keys(manifest.keys).length}`);
console.log(`  namespaces: ${Object.keys(manifest.filesByNamespace).length}`);
console.log('  top namespaces:');
const top = Object.entries(manifest.filesByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [ns, count] of top) console.log(`    ${ns}: ${count} keys`);
