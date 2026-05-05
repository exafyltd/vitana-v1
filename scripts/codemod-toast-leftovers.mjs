#!/usr/bin/env node
// Wave 2.x: handle the toast/notify leaks the main codemod conservatively
// skipped (multi-line JSX, dynamic args, notify.error("Error", "...") with
// literal first args).
//
// Strategy:
//   - Replace each raw string literal with `lookup('toasts.<ns>.<slug>')`
//     so rich toasts (with action/duration/JSX) keep their full shape.
//   - Add the key to src/i18n/en/toasts.json with the English source.
//   - Mark the DE side _pending_review (translator drains separately).
//   - Add `import { lookup } from '@/lib/i18n-toast';` if missing.
//
// Reads scripts/.leftover-leaks.json (manifest of {file, lineNumber, raw})
// produced by extract-leftover-leaks.mjs. Run with --apply to write changes.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

// --- read ESLint output and produce manifest -----------------------------
const lintOut = readFileSync('/tmp/leftover-toasts.txt', 'utf8');
// awk-prefixed format: <file>:  <line>:<col>  warning  i18n: raw string passed to <fn>("<text>") — ...
// or, plain ESLint format. Rebuild with awk-prefixed using the same approach.

// Parse the awk-prefixed output:
const LEAK_RX = /^(\/[^:]+):\s*(\d+):\d+\s+warning\s+i18n: raw string passed to (\w+(?:\.\w+)?)\("(.+?)"\)/;
const leaks = [];
for (const line of lintOut.split('\n')) {
  const m = line.match(LEAK_RX);
  if (!m) continue;
  leaks.push({
    file: m[1],
    line: parseInt(m[2], 10),
    callee: m[3],
    truncated: m[4], // ESLint output truncates at 60 chars
  });
}
console.log(`[leftovers] parsed ${leaks.length} leak entries`);

// --- group by file -------------------------------------------------------
const byFile = new Map();
for (const l of leaks) {
  if (!byFile.has(l.file)) byFile.set(l.file, []);
  byFile.get(l.file).push(l);
}

// --- helpers -------------------------------------------------------------
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
  if (!s) return 'message';
  const words = s
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 \-_/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 6);
  if (words.length === 0) return 'message';
  const head = words[0].toLowerCase();
  const tail = words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
  let slug = (head + tail).replace(/[^A-Za-z0-9_]/g, '');
  if (!slug || /^[0-9]/.test(slug)) slug = 'message' + slug;
  return slug.slice(0, 50);
}

// --- build catalog updates and source edits ------------------------------
const enPath = join(ROOT, 'src/i18n/en/toasts.json');
const dePath = join(ROOT, 'src/i18n/de/toasts.json');
const enCat = JSON.parse(readFileSync(enPath, 'utf8'));
const deCat = JSON.parse(readFileSync(dePath, 'utf8'));
if (!enCat.toasts) enCat.toasts = {};
if (!deCat.toasts) deCat.toasts = {};

let totalReplaced = 0;
const filesTouched = [];
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
  return `toasts.${ns}.${slug}`;
}

for (const [file, fileLeaks] of byFile.entries()) {
  if (!existsSync(file)) {
    console.warn(`[leftovers] missing: ${file}`);
    continue;
  }
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const ns = namespaceFor(file);

  // Find every string-literal on the reported lines and collect the FULL
  // (non-truncated) value. ESLint truncates to 60 chars; we look for any
  // string literal on that line whose first 60 chars (with " escaping
  // un-escaped) match the truncated text.
  const edits = []; // [{ row, col, oldLiteral, newCall, fullText, key }]

  for (const { line, truncated, callee } of fileLeaks) {
    const row = line - 1; // 0-indexed
    const lineText = lines[row];
    if (!lineText) continue;
    // Match every "..." or '...' on the line; pick one whose contents start with truncated
    const litRx = /(["'])((?:\\.|(?!\1).)*)\1/g;
    let pick = null;
    let m;
    while ((m = litRx.exec(lineText)) !== null) {
      const inside = m[2];
      // ESLint shows truncated[:60]; compare unescaped
      const stripped = inside.replace(/\\(.)/g, '$1');
      const truncatedStripped = truncated.replace(/\\(.)/g, '$1');
      if (stripped.startsWith(truncatedStripped) || truncatedStripped.startsWith(stripped.slice(0, 60))) {
        pick = { col: m.index, full: m[0], inside: stripped };
        break;
      }
    }
    if (!pick) {
      console.warn(`  ?? ${relative(ROOT, file)}:${line} — could not locate "${truncated}…"`);
      continue;
    }
    const key = allocateKey(ns, pick.inside);
    // notify(...) (useI18nNotify) expects a translation KEY as first arg.
    // toast(...) / sonner expect a translated STRING.
    const isNotify = callee.startsWith('notify');
    const replacement = isNotify ? `'${key}'` : `lookup('${key}')`;
    edits.push({ row, col: pick.col, oldLen: pick.full.length, replacement, fullText: pick.inside, key, isNotify });
  }

  if (edits.length === 0) continue;

  // Apply edits per line, right-to-left so columns stay valid
  const editsByRow = new Map();
  for (const e of edits) {
    if (!editsByRow.has(e.row)) editsByRow.set(e.row, []);
    editsByRow.get(e.row).push(e);
  }
  for (const [row, rowEdits] of editsByRow.entries()) {
    rowEdits.sort((a, b) => b.col - a.col);
    let lineText = lines[row];
    for (const e of rowEdits) {
      lineText = lineText.slice(0, e.col) + e.replacement + lineText.slice(e.col + e.oldLen);
    }
    lines[row] = lineText;
  }

  // Insert `import { lookup } from '@/lib/i18n-toast';` only if any edit
  // in this file uses lookup (notify edits use bare string keys, no import needed)
  let next = lines.join('\n');
  const needsLookup = edits.some((e) => !e.isNotify);
  if (!needsLookup) {
    if (APPLY) writeFileSync(file, next, 'utf8');
    filesTouched.push({ file: relative(ROOT, file), edits: edits.length });
    totalReplaced += edits.length;
    continue;
  }
  const importRx = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/i18n-toast['"]/;
  const existing = next.match(importRx);
  if (existing) {
    const present = new Set(existing[1].split(',').map((s) => s.trim()).filter(Boolean));
    if (!present.has('lookup')) {
      present.add('lookup');
      next = next.replace(importRx, `import { ${[...present].sort().join(', ')} } from '@/lib/i18n-toast'`);
    }
  } else {
    // Find last import end-line (handling multi-line imports)
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
    const importLine = `import { lookup } from '@/lib/i18n-toast';`;
    if (lastImportEndIdx >= 0) ll.splice(lastImportEndIdx + 1, 0, importLine);
    else ll.unshift(importLine);
    next = ll.join('\n');
  }

  filesTouched.push({ file: relative(ROOT, file), edits: edits.length });
  totalReplaced += edits.length;
  if (APPLY) writeFileSync(file, next, 'utf8');
}

// Update catalog
function setNested(cat, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = cat;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
function getNested(cat, dotPath) {
  const parts = dotPath.split('.');
  let cur = cat;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

let keysAdded = 0;
for (const [ns, slots] of allocated.entries()) {
  for (const [slug, en] of slots.entries()) {
    const key = `toasts.${ns}.${slug}`;
    if (getNested(enCat, key) !== undefined) continue;
    setNested(enCat, key, en);
    setNested(deCat, key, en); // placeholder
    if (!deCat.toasts[ns]) deCat.toasts[ns] = {};
    if (!deCat.toasts[ns]._pending_review) deCat.toasts[ns]._pending_review = {};
    deCat.toasts[ns]._pending_review[slug] = true;
    keysAdded++;
  }
}

if (APPLY) {
  writeFileSync(enPath, JSON.stringify(enCat, null, 2) + '\n', 'utf8');
  writeFileSync(dePath, JSON.stringify(deCat, null, 2) + '\n', 'utf8');
}

console.log(`[leftovers] ${APPLY ? 'APPLIED' : 'DRY RUN'}`);
console.log(`  files: ${filesTouched.length}`);
console.log(`  string replacements: ${totalReplaced}`);
console.log(`  new catalog keys: ${keysAdded}`);
for (const t of filesTouched) console.log(`  - ${t.file} (${t.edits})`);
