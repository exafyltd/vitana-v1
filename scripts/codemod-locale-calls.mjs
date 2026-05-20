#!/usr/bin/env node
// Codemod: rewrite locale-leaking date/number calls to the user-locale helpers.
//
// Two transforms:
//
// (1) Re-route date-fns imports through @/lib/locale-format
//     - format / formatDistance / formatDistanceToNow / formatDistanceStrict /
//       formatRelative get pulled out of `import { ... } from 'date-fns'`.
//     - Calls to those names keep the same identifier; locale-format re-exports
//       them with the user's date-fns locale injected automatically.
//     - Exception: locale-format exports `format` as `formatDate` to avoid
//       collision with other `format` functions in the codebase. Calls are
//       rewritten `format(...)` → `formatDate(...)`.
//
// (2) Rewrite native locale calls
//     - x.toLocaleDateString()                       → fmtDate(x)
//     - x.toLocaleDateString('en-US', opts)          → fmtDate(x, opts)
//     - x.toLocaleTimeString(...)                    → fmtTime(x, ...)
//     - x.toLocaleString(...) on Date receiver       → fmtDateTime(...)
//     - x.toLocaleString(...) on number-looking recv → fmtNumber(...)
//
// Bails (leaves for hand pass):
//     - First arg to toLocaleX is a non-English string literal or a variable.
//     - File imports already include all helpers it needs.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const APPLY = process.argv.includes('--apply');

const IGNORE_RX = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]types[\\/]/,
  /[\\/]src[\\/]pages[\\/]dev[\\/]/,
  /[\\/]src[\\/]lib[\\/]locale-format\.ts$/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

// date-fns name → locale-format helper name
const DF_HELPER_MAP = {
  format: 'formatDate',
  formatDistance: 'formatDistance',
  formatDistanceStrict: 'formatDistance',
  formatDistanceToNow: 'formatDistanceToNow',
  formatDistanceToNowStrict: 'formatDistanceToNow',
  formatRelative: 'formatRelative',
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC).filter((f) => !IGNORE_RX.some((rx) => rx.test(f)));

let totalChanged = 0;
const perPattern = {
  toLocaleDateString: 0,
  toLocaleTimeString: 0,
  toLocaleString_date: 0,
  toLocaleString_number: 0,
  dateFnsFormat_renamed: 0,
  dateFnsImport_rerouted: 0,
};

function balancedClose(src, openIdx) {
  let depth = 0, i = openIdx, inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i += 2; continue; } if (c === inStr) inStr = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function splitTopArgs(s) {
  const out = []; let buf = '', depth = 0, inStr = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { buf += c; if (c === '\\') { buf += s[++i] ?? ''; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; buf += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; buf += c; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; buf += c; continue; }
    if (c === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function rewriteToLocaleCalls(src) {
  const methodRx = /\.(toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(/g;
  const replacements = [];
  let m;
  while ((m = methodRx.exec(src)) !== null) {
    const method = m[1];
    const dotIdx = m.index;
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = balancedClose(src, openIdx);
    if (closeIdx === -1) continue;
    const argString = src.slice(openIdx + 1, closeIdx);
    const args = argString.trim() === '' ? [] : splitTopArgs(argString);
    // Walk back to capture receiver
    let recvStart = dotIdx, depth = 0, inStr = null;
    while (recvStart > 0) {
      const c = src[recvStart - 1];
      if (inStr) { if (c === inStr) inStr = null; recvStart--; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; recvStart--; continue; }
      if (c === ')' || c === ']') { depth++; recvStart--; continue; }
      if (c === '(' || c === '[') { depth--; if (depth < 0) break; recvStart--; continue; }
      if (depth > 0) { recvStart--; continue; }
      if (/[A-Za-z0-9_$.]/.test(c)) { recvStart--; continue; }
      break;
    }
    let receiver = src.slice(recvStart, dotIdx);
    if (!receiver) continue;
    // Include preceding `new ` keyword if present.
    {
      let p = recvStart;
      while (p > 0 && /\s/.test(src[p - 1])) p--;
      if (p >= 3 && src.slice(p - 3, p) === 'new' && (p === 3 || /[^A-Za-z0-9_$]/.test(src[p - 4]))) {
        recvStart = p - 3;
        receiver = src.slice(recvStart, dotIdx);
      }
    }
    // Determine: dynamic locale arg → skip
    let optsArg = null;
    let skip = false;
    if (args.length >= 1) {
      const a0 = args[0];
      const isStrLit = /^['"`]/.test(a0);
      const isUndef = a0 === 'undefined';
      if (isStrLit) {
        const v = a0.slice(1, -1);
        if (!/^en(-|$)/i.test(v) && v !== '') skip = true;
      } else if (!isUndef) {
        skip = true;
      }
      optsArg = args[1] ?? null;
    }
    if (skip) continue;
    let helper;
    if (method === 'toLocaleDateString') { helper = 'fmtDate'; perPattern.toLocaleDateString++; }
    else if (method === 'toLocaleTimeString') { helper = 'fmtTime'; perPattern.toLocaleTimeString++; }
    else {
      const recv = receiver.trim();
      const recvLooksNumeric = /(\.length|count|price|total|amount|sum|balance|fee|cost|value|rate|num|qty|quantity|tokens?|score|index|usd|eur|krw|amt|earnings|payout)$/i.test(recv) || /^\d/.test(recv) || /\.(toFixed|toString)$/.test(recv);
      const optsLooksNumeric = optsArg && /(style|minimumFractionDigits|maximumFractionDigits|currency|notation|signDisplay|useGrouping)/.test(optsArg);
      if (optsLooksNumeric || recvLooksNumeric) { helper = 'fmtNumber'; perPattern.toLocaleString_number++; }
      else { helper = 'fmtDateTime'; perPattern.toLocaleString_date++; }
    }
    const helperArgs = [receiver];
    if (optsArg != null) helperArgs.push(optsArg);
    const replacement = `${helper}(${helperArgs.join(', ')})`;
    replacements.push({ start: recvStart, end: closeIdx + 1, replacement, helper });
  }
  replacements.sort((a, b) => b.start - a.start);
  let out = src;
  const helpersUsed = new Set();
  for (const r of replacements) {
    out = out.slice(0, r.start) + r.replacement + out.slice(r.end);
    helpersUsed.add(r.helper);
  }
  return { out, helpersUsed };
}

function rerouteDateFnsImports(src) {
  // Parse each `import { X, Y } from 'date-fns'` and split into:
  //   - keepers (other date-fns funcs)
  //   - movers (matched in DF_HELPER_MAP) → into locale-format
  const helpersToAdd = new Set();
  const renames = []; // { local, newLocal } — call-site renames needed

  let out = src;
  const rx = /import\s*\{([^}]+)\}\s*from\s*['"]date-fns['"]\s*;?\s*\n?/g;
  const importBlocks = [];
  let m;
  while ((m = rx.exec(src)) !== null) {
    importBlocks.push({ start: m.index, end: m.index + m[0].length, body: m[1], full: m[0] });
  }
  for (let i = importBlocks.length - 1; i >= 0; i--) {
    const b = importBlocks[i];
    const specs = b.body.split(',').map(s => s.trim()).filter(Boolean);
    const keepers = [];
    const movedFromThis = [];
    for (const spec of specs) {
      const parts = spec.split(/\s+as\s+/);
      const imported = parts[0].trim();
      const local = (parts[1] ?? parts[0]).trim();
      if (DF_HELPER_MAP[imported]) {
        const helper = DF_HELPER_MAP[imported];
        helpersToAdd.add(helper);
        movedFromThis.push({ imported, local, helper });
        // If the helper name differs from the local binding, we need to rename
        // call sites: e.g. import `format` (local: `format`), helper is
        // `formatDate` — so all `format(...)` → `formatDate(...)`.
        if (helper !== local) renames.push({ local, newLocal: helper, imported });
      } else {
        keepers.push(spec);
      }
    }
    if (movedFromThis.length === 0) continue;
    perPattern.dateFnsImport_rerouted += movedFromThis.length;
    if (keepers.length > 0) {
      // Rebuild keeper-only date-fns import
      const indent = (b.full.match(/^\s*/) || [''])[0];
      const newImport = `${indent}import { ${keepers.join(', ')} } from 'date-fns';\n`;
      out = out.slice(0, b.start) + newImport + out.slice(b.end);
    } else {
      // Remove the date-fns import entirely
      out = out.slice(0, b.start) + out.slice(b.end);
    }
  }

  // Apply call-site renames (only for differently-named helpers: format → formatDate)
  for (const r of renames) {
    const callRx = new RegExp(`(?<![A-Za-z0-9_$.])${r.local}\\s*\\(`, 'g');
    out = out.replace(callRx, `${r.newLocal}(`);
    perPattern.dateFnsFormat_renamed += (src.match(callRx) || []).length;
  }

  return { out, helpersToAdd };
}

function ensureLocaleFormatImport(src, helpers) {
  if (helpers.size === 0) return src;
  const existing = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/locale-format['"]\s*;?\s*\n?/);
  const needed = Array.from(helpers).sort();
  if (existing) {
    const present = new Set(existing[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()));
    const missing = needed.filter(h => !present.has(h));
    if (missing.length === 0) return src;
    const merged = Array.from(new Set([...present, ...missing])).sort().join(', ');
    return src.replace(existing[0], `import { ${merged} } from '@/lib/locale-format';\n`);
  }
  // Insert after the LAST existing import
  const lastImport = [...src.matchAll(/^import\s.*?from\s.*?;?\s*\n/gm)].pop();
  const importLine = `import { ${needed.join(', ')} } from '@/lib/locale-format';\n`;
  if (lastImport) {
    const idx = lastImport.index + lastImport[0].length;
    return src.slice(0, idx) + importLine + src.slice(idx);
  }
  return importLine + src;
}

let changedFiles = 0;
for (const f of files) {
  const orig = readFileSync(f, 'utf8');
  let next = orig;
  const helpers = new Set();

  const toLocaleRes = rewriteToLocaleCalls(next);
  next = toLocaleRes.out;
  for (const h of toLocaleRes.helpersUsed) helpers.add(h);

  const dfRes = rerouteDateFnsImports(next);
  next = dfRes.out;
  for (const h of dfRes.helpersToAdd) helpers.add(h);

  if (next === orig) continue;
  next = ensureLocaleFormatImport(next, helpers);

  changedFiles++;
  if (APPLY) writeFileSync(f, next);
}

console.log(`\n=== Locale-call codemod ===`);
console.log(`Mode:           ${APPLY ? 'APPLY' : 'DRY RUN'}`);
console.log(`Files changed:  ${changedFiles}`);
console.log(`Per-pattern:`);
for (const [k, v] of Object.entries(perPattern)) console.log(`  ${k.padEnd(36)} ${v}`);
