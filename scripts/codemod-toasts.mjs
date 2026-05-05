#!/usr/bin/env node
// Wave 2 codemod: rewrite hardcoded toast() calls to notify/notifyError
// with translation keys. Auto-detects:
//   - toast("X")                              -> notify('toasts.<ns>.<slug>')
//   - toast({title: "X"})                     -> notify('toasts.<ns>.<slug>')
//   - toast({title: "X", description: "Y"})   -> notify('...title', '...desc')
//   - toast({..., variant: "destructive"})    -> notifyError(...)
//
// Side effects:
//   - Edits .ts/.tsx files in place (adds import for notify/notifyError)
//   - Removes `toast` from `@/hooks/use-toast` import if no other uses remain
//   - Writes scripts/.codemod-toasts.manifest.json: { keys: { "toasts.x.y": "english" }, files: [...] }
//
// The translator step (translate-keys-haiku.mjs) reads the manifest to
// generate the DE catalog from the EN strings.
//
// Usage:
//   node scripts/codemod-toasts.mjs                 # dry run, prints diff stats
//   node scripts/codemod-toasts.mjs --apply         # actually edits files
//   node scripts/codemod-toasts.mjs --apply --only=src/components/diary  # scoped run

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const MANIFEST = join(__dirname, '.codemod-toasts.manifest.json');

const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const a = process.argv.find((x) => x.startsWith('--only='));
  return a ? a.slice('--only='.length) : null;
})();

const IGNORED = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]lib[\\/]i18n-(toast|helpers)\.ts$/,
  /[\\/]src[\\/]hooks[\\/]use-toast\.ts$/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function namespaceFor(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  // src/pages/X/... → X (lowercase)
  // src/pages/X.tsx → lowercased X stem
  // src/components/X/... → X
  // src/components/X.tsx → common
  // src/hooks/* → hooks
  // src/lib/* → common
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
  if (!s) return 'message';
  // Strip emojis / non-letters first by extracting ASCII letter words
  const words = s
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 \-_/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 6);
  if (words.length === 0) return 'message';
  const head = words[0].toLowerCase();
  const tail = words
    .slice(1)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  let slug = head + tail;
  // Strip non-identifier
  slug = slug.replace(/[^A-Za-z0-9_]/g, '');
  if (!slug || /^[0-9]/.test(slug)) slug = 'message' + slug;
  return slug.slice(0, 50);
}

// keys: Map<englishStringNormalized, { ns, slug, full, count }>
// allocateKey returns the canonical "toasts.<ns>.<slug>" for a given english string
const keyMap = new Map(); // ns -> Map<slug, { english }>
const englishToKey = new Map(); // english -> "toasts.ns.slug"

function allocateKey(ns, english) {
  const norm = english.trim();
  if (!norm) return null;
  const cached = englishToKey.get(`${ns}|${norm}`);
  if (cached) return cached;
  let baseSlug = slugify(norm);
  if (!keyMap.has(ns)) keyMap.set(ns, new Map());
  const slots = keyMap.get(ns);
  let slug = baseSlug;
  let i = 2;
  while (slots.has(slug) && slots.get(slug).english !== norm) {
    slug = `${baseSlug}${i}`;
    i++;
  }
  slots.set(slug, { english: norm });
  const full = `toasts.${ns}.${slug}`;
  englishToKey.set(`${ns}|${norm}`, full);
  return full;
}

// Find the matching closing paren starting at index i (where source[i] === '(')
function matchParen(source, openIdx) {
  let depth = 0;
  let inStr = null;
  let inTpl = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (inTpl) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTpl = false;
      // Note: not handling ${} substitutions properly — toast args rarely use templates
      continue;
    }
    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTpl = true;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractStringLiteral(text) {
  // First non-whitespace token after `=` or `:` or start
  // We accept "X", 'X' (single line); reject template strings with ${} or multi-line
  const m = text.match(/^\s*("([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)')\s*,?\s*$/);
  if (!m) return null;
  // Unescape \" and \' minimally
  return (m[2] !== undefined ? m[2] : m[3]).replace(/\\"/g, '"').replace(/\\'/g, "'");
}

// Parse argument(s) inside toast(...) — try the two main shapes.
// Returns: { kind: 'string'|'object', title?, description?, variant?, raw }
function parseToastArgs(argText) {
  const trimmed = argText.trim();
  if (!trimmed) return null;
  // Object form: starts with {
  if (trimmed.startsWith('{')) {
    // Strip outermost { } and find top-level keys
    if (!trimmed.endsWith('}')) return null;
    const inner = trimmed.slice(1, -1);
    // Walk the inner text and extract top-level title:..., description:..., variant:...
    const fields = {};
    let depth = 0;
    let inStr = null;
    let inTpl = false;
    let buf = '';
    const flush = () => {
      const s = buf.trim();
      if (s) {
        const eq = s.indexOf(':');
        if (eq > 0) {
          const k = s.slice(0, eq).trim().replace(/^['"]|['"]$/g, '');
          const v = s.slice(eq + 1).trim();
          fields[k] = v;
        }
      }
      buf = '';
    };
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      const nxt = inner[i + 1];
      if (inStr) {
        if (c === '\\') {
          buf += c + (nxt || '');
          i++;
          continue;
        }
        if (c === inStr) inStr = null;
        buf += c;
        continue;
      }
      if (inTpl) {
        if (c === '\\') {
          buf += c + (nxt || '');
          i++;
          continue;
        }
        if (c === '`') inTpl = false;
        buf += c;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        buf += c;
        continue;
      }
      if (c === '`') {
        inTpl = true;
        buf += c;
        continue;
      }
      if (c === '{' || c === '[' || c === '(') depth++;
      if (c === '}' || c === ']' || c === ')') depth--;
      if (c === ',' && depth === 0) {
        flush();
        continue;
      }
      buf += c;
    }
    flush();
    const out = { kind: 'object' };
    if (fields.title) {
      const s = extractStringLiteral(fields.title);
      if (s !== null) out.title = s;
    }
    if (fields.description) {
      const s = extractStringLiteral(fields.description);
      if (s !== null) out.description = s;
    }
    if (fields.variant) {
      const s = extractStringLiteral(fields.variant);
      if (s !== null) out.variant = s;
    }
    // If we couldn't extract a title, bail (likely dynamic)
    if (!out.title) return null;
    return out;
  }
  // String form
  const s = extractStringLiteral(trimmed);
  if (s === null) return null;
  return { kind: 'string', title: s };
}

function rewriteFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const ns = namespaceFor(filePath);
  const edits = [];

  // Find all `toast(` occurrences (also `toast.error(`, `toast.success(` as a safety net)
  const callRx = /\btoast(?:\s*\.\s*(?:error|success|info|warning))?\s*\(/g;
  let m;
  while ((m = callRx.exec(source)) !== null) {
    const callStart = m.index;
    const openParen = source.indexOf('(', callStart);
    const closeParen = matchParen(source, openParen);
    if (closeParen < 0) continue;
    const argText = source.slice(openParen + 1, closeParen);
    // Conservative: bail on toast calls that contain JSX, JSX expressions,
    // newlines spanning >5 lines, or nested function bodies. Humans handle
    // these in the next pass.
    if (/<[A-Za-z]/.test(argText)) continue; // JSX tag inside args
    if (/=>\s*\{/.test(argText)) continue;   // arrow function body
    if (argText.split('\n').length > 6) continue; // overly long block
    const parsed = parseToastArgs(argText);
    if (!parsed) continue;

    const titleKey = allocateKey(ns, parsed.title);
    if (!titleKey) continue;
    let descKey = null;
    if (parsed.description) descKey = allocateKey(ns, parsed.description);

    // Determine notify variant
    let fnName = 'notify';
    const dotMatch = source.slice(callStart, openParen).match(/\.(\w+)/);
    if (dotMatch) {
      const v = dotMatch[1];
      if (v === 'error') fnName = 'notifyError';
      else if (v === 'success') fnName = 'notifySuccess';
      else if (v === 'warning') fnName = 'notifyWarning';
      else if (v === 'info') fnName = 'notifyInfo';
    }
    if (parsed.variant === 'destructive') fnName = 'notifyError';

    let replacement;
    if (descKey) replacement = `${fnName}('${titleKey}', '${descKey}')`;
    else replacement = `${fnName}('${titleKey}')`;

    edits.push({
      start: callStart,
      end: closeParen + 1,
      replacement,
      fnName,
      titleKey,
      descKey,
    });
  }

  if (edits.length === 0) return null;

  // Sort descending so we can splice right-to-left without index drift
  edits.sort((a, b) => b.start - a.start);

  let next = source;
  for (const e of edits) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);

  // Add imports of whichever notify* variants we used
  const importNeeds = [...new Set(edits.map((e) => e.fnName))];
  const existingImportRx = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/i18n-toast['"]/;
  const existingImport = next.match(existingImportRx);
  if (existingImport) {
    const present = new Set(existingImport[1].split(',').map((s) => s.trim()).filter(Boolean));
    for (const n of importNeeds) present.add(n);
    const newLine = `import { ${[...present].sort().join(', ')} } from '@/lib/i18n-toast'`;
    next = next.replace(existingImportRx, newLine);
  } else {
    // Insert after the LAST import statement. Handles multi-line imports by
    // tracking when we are inside an unterminated import block (open brace
    // without a closing `from '...';` on the same line).
    const lines = next.split('\n');
    let lastImportEndIdx = -1;
    let inImport = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inImport && /^\s*import\b/.test(line)) {
        inImport = true;
      }
      if (inImport) {
        // Heuristic for end-of-import: line contains `from '...'` or `from "..."`,
        // OR is a side-effect import (`import './foo';`).
        if (/from\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(line) ||
            /^\s*import\s+['"][^'"]+['"]\s*;?\s*(\/\/.*)?$/.test(line)) {
          lastImportEndIdx = i;
          inImport = false;
        }
      }
    }
    const importLine = `import { ${importNeeds.sort().join(', ')} } from '@/lib/i18n-toast';`;
    if (lastImportEndIdx >= 0) {
      lines.splice(lastImportEndIdx + 1, 0, importLine);
    } else {
      lines.unshift(importLine);
    }
    next = lines.join('\n');
  }

  // Strip `toast` from import lists if no remaining toast(/toast. reference exists.
  // Handles `@/hooks/use-toast`, `sonner`, and aliased forms `toast as X`.
  if (!/\btoast\s*[.(]/.test(next)) {
    const importRx = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*\n?/g;
    next = next.replace(importRx, (full, group, source) => {
      // Only touch toast-providing modules
      if (source !== 'sonner' && source !== '@/hooks/use-toast') return full;
      const remaining = group
        .split(',')
        .map((s) => s.trim())
        .filter((s) => {
          if (!s) return false;
          // strip aliases: "toast as X" → "toast"
          const base = s.split(/\s+as\s+/)[0].trim();
          return base !== 'toast';
        });
      if (remaining.length === 0) return '';
      return `import { ${remaining.join(', ')} } from '${source}';\n`;
    });
  }

  return { source, next, edits };
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
  if (APPLY) {
    writeFileSync(file, result.next, 'utf8');
  }
}

// Build manifest
const manifest = {
  generatedAt: new Date().toISOString(),
  totalFiles: touched,
  totalEdits,
  keys: {},
  filesByNamespace: {},
};
for (const [ns, slots] of keyMap.entries()) {
  manifest.filesByNamespace[ns] = slots.size;
  for (const [slug, info] of slots.entries()) {
    manifest.keys[`toasts.${ns}.${slug}`] = info.english;
  }
}

if (APPLY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
}

console.log(`[codemod-toasts] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files touched: ${touched}`);
console.log(`  toast() rewrites: ${totalEdits}`);
console.log(`  unique keys: ${Object.keys(manifest.keys).length}`);
console.log(`  namespaces: ${Object.keys(manifest.filesByNamespace).length}`);
if (APPLY) console.log(`  manifest: ${MANIFEST}`);
console.log('  top namespaces:');
const top = Object.entries(manifest.filesByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [ns, count] of top) console.log(`    ${ns}: ${count} keys`);
