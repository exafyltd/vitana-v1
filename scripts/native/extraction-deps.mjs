#!/usr/bin/env node
/**
 * VTID-05157 — extraction dependency analysis (Native app Wave 0, plan change 8;
 * program docs/programs/native-app/NATIVE-APP-PLAN.md §3, phased extraction step 1).
 *
 * Maps which `src/` modules the native app could share and what blocks the
 * rest. Read-only: parses every non-test .ts/.tsx under src/ with the
 * TypeScript compiler API (no type checker), builds the runtime import graph
 * and classifies each module:
 *
 *   A  portable as is
 *   B  portable behind an adapter (only Vite env, browser storage or a
 *      production-host literal: inject config + storage)
 *   C  web-only (DOM globals, DOM JSX, web-only packages, stylesheets)
 *
 * The transitive class is the worst class over the module's import closure,
 * with the first (shortest) import chain that reaches a C module.
 *
 *   node scripts/native/extraction-deps.mjs [--root <repo>] [--json <file>] [--md <file>] [--commit <sha>]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

export const WEB_ONLY = JSON.parse(readFileSync(join(HERE, 'web-only-packages.json'), 'utf8'));

/** DOM / browser globals; a reference as an expression root is a `dom` signal. */
export const DOM_GLOBALS = new Set([
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'matchMedia', 'location', 'history',
  'indexedDB', 'getComputedStyle', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'DOMParser',
  'MediaRecorder', 'AudioContext', 'webkitAudioContext', 'Element', 'HTMLElement',
]);
const DOM_PATTERN = /^HTML[A-Za-z]*Element$/;
/** Storage globals: portable behind a storage adapter (class B). */
export const STORAGE_GLOBALS = new Set(['localStorage', 'sessionStorage', 'indexedDB']);

/** Production hosts (apps/mobile/src/config/env.ts, plan change 4). */
const PROD_HOSTS = new Set(['vitanaland.com', 'www.vitanaland.com', 'gateway.vitanaland.com']);
const HOST_RX = /(?<![@\w.-])((?:[a-z0-9-]+\.)*vitanaland\.com)(?![\w-])/gi;
const SUPABASE_PROD_RX = /inmkhvwdcuyhnxkgfvsb\.supabase\.co/i;

const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const ORDER = { A: 0, B: 1, C: 2 };
const worst = (a, b) => (ORDER[a] >= ORDER[b] ? a : b);

export const CANDIDATES = [
  { path: 'src/integrations/supabase/client.ts', note: 'Supabase client (program §3: packages/core)' },
  { path: 'src/lib/gateway-base.ts', note: 'Gateway base URL' },
  { path: 'src/i18n/index.ts', note: 'i18n catalogue loader' },
  { path: 'src/lib/i18n-toast.ts', note: 't() / notify()' },
  { path: 'src/lib/locale-format.ts', note: 'Locale-aware date/number helpers' },
  { path: 'src/lib/business-mode.ts', note: 'Business-mode rules' },
  { path: 'src/config/drawer-nav.config.ts', note: 'Drawer / nav config' },
  { path: 'src/hooks/use-mobile.tsx', note: 'useIsMobile()' },
  { path: 'src/navigation/registry/index.ts', note: 'Screen registry' },
  { path: 'src/lib/query-persist.ts', note: 'React Query persistence' },
];

export const SUMMARY_DIRS = ['src/lib', 'src/hooks', 'src/integrations', 'src/config', 'src/types', 'src/navigation', 'src/i18n', 'src/stores', 'src/context', 'src/contexts'];

const posix = (p) => p.split(sep).join('/');

export function isTestFile(rel) {
  return /\.(test|spec|stories)\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)(__tests__|__mocks__|__regression__)\//.test(rel) || rel.endsWith('.d.ts');
}

export function listSourceFiles(root) {
  const src = join(root, 'src');
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { if (name !== 'node_modules') walk(full); continue; }
      const rel = posix(relative(root, full));
      if (/\.(ts|tsx)$/.test(name) && !isTestFile(rel)) out.push(rel);
    }
  };
  if (existsSync(src)) walk(src);
  return out;
}

export function isWebOnlyPackage(spec, list = WEB_ONLY) {
  const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
  return list.packages.includes(name) || list.prefixes.some((p) => spec.startsWith(p));
}

export function prodHostsIn(text) {
  const hits = [];
  for (const m of text.matchAll(HOST_RX)) {
    const host = m[1].toLowerCase();
    if (PROD_HOSTS.has(host) || /^preview-aws[a-z0-9-]*\.vitanaland\.com$/.test(host)) hits.push(host);
  }
  if (SUPABASE_PROD_RX.test(text)) hits.push('inmkhvwdcuyhnxkgfvsb.supabase.co');
  return [...new Set(hits)];
}

/** Resolves an import specifier; returns { internal: rel } | { pkg } | { missing }. */
export function resolveImport(root, fromRel, spec) {
  const clean = spec.split('?')[0];
  let base;
  if (clean.startsWith('@/')) base = join(root, 'src', clean.slice(2));
  else if (clean.startsWith('.')) base = resolve(join(root, dirname(fromRel)), clean);
  else return { pkg: clean };
  for (const ext of RESOLVE_EXT) {
    const f = base + ext;
    if (existsSync(f) && statSync(f).isFile()) return { internal: posix(relative(root, f)) };
  }
  for (const ext of RESOLVE_EXT.slice(1)) {
    const f = join(base, `index${ext}`);
    if (existsSync(f)) return { internal: posix(relative(root, f)) };
  }
  return { missing: clean };
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function declaredNames(sf) {
  const names = new Set();
  const visit = (n) => {
    if ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isBindingElement(n)) && n.name && ts.isIdentifier(n.name)) names.add(n.name.text);
    if (ts.isImportClause(n) && n.name) names.add(n.name.text);
    if (ts.isImportSpecifier(n) || ts.isNamespaceImport(n)) names.add(n.name.text);
    n.forEachChild(visit);
  };
  visit(sf);
  return names;
}

/** True when `id` is a name position (property, declaration, label …), not a value reference. */
function isNamePosition(id) {
  const p = id.parent;
  if (!p) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
  if (ts.isQualifiedName(p)) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)
    || ts.isMethodSignature(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p) || ts.isEnumMember(p)
    || ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p)
    || ts.isFunctionExpression(p) || ts.isClassExpression(p) || ts.isJsxAttribute(p)) && p.name === id) return true;
  if (ts.isBindingElement(p) && (p.name === id || p.propertyName === id)) return true;
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return true;
  if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return true;
  if ((ts.isJsxOpeningElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxClosingElement(p)) && p.tagName === id) return true;
  return false;
}

function isTypeOnlyImport(node) {
  const c = node.importClause;
  if (!c) return false; // side-effect import
  if (c.isTypeOnly) return true;
  if (c.name) return false;
  const nb = c.namedBindings;
  if (nb && ts.isNamedImports(nb) && nb.elements.length > 0) return nb.elements.every((e) => e.isTypeOnly);
  return false;
}

/** Own signals and runtime import specifiers of one source text. */
export function scanSource(text, rel) {
  const kind = rel.endsWith('.tsx') || rel.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const declared = declaredNames(sf);
  const signals = [];
  const imports = [];
  const sig = (type, detail, node) => signals.push({ type, detail, line: lineOf(sf, node) });

  const visit = (n) => {
    // Type positions never carry runtime coupling.
    if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return;
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;

    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      if (!isTypeOnlyImport(n)) imports.push({ spec: n.moduleSpecifier.text, line: lineOf(sf, n) });
      return;
    }
    if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      if (!n.isTypeOnly) imports.push({ spec: n.moduleSpecifier.text, line: lineOf(sf, n) });
      return;
    }
    if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteralLike(n.arguments[0])) {
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require')) {
        imports.push({ spec: n.arguments[0].text, line: lineOf(sf, n) });
      }
    }
    if (ts.isMetaProperty(n) && n.keywordToken === ts.SyntaxKind.ImportKeyword) {
      const p = n.parent;
      const prop = p && ts.isPropertyAccessExpression(p) && p.expression === n ? p.name.text : 'meta';
      sig('vite', `import.meta.${prop}`, n);
    }
    if (ts.isIdentifier(n) && (DOM_GLOBALS.has(n.text) || DOM_PATTERN.test(n.text)) && !declared.has(n.text) && !isNamePosition(n)) {
      // window.localStorage / window.sessionStorage are storage, not DOM.
      const p = n.parent;
      const viaWindow = n.text === 'window' && p && ts.isPropertyAccessExpression(p) && p.expression === n && STORAGE_GLOBALS.has(p.name.text);
      if (viaWindow) sig('storage', `window.${p.name.text}`, n);
      else sig(STORAGE_GLOBALS.has(n.text) ? 'storage' : 'dom', n.text, n);
    }
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName) && /^[a-z]/.test(n.tagName.text)) {
      sig('dom-jsx', `<${n.tagName.text}>`, n);
    }
    if (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      for (const host of prodHostsIn(n.text)) sig('prod-fallback', host, n);
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return { signals, imports };
}

export function ownClass(signals) {
  let c = 'A';
  for (const s of signals) c = worst(c, s.type === 'vite' || s.type === 'storage' || s.type === 'prod-fallback' ? 'B' : 'C');
  return c;
}

/** Full analysis of <root>/src. */
export function analyze(root, { webOnly = WEB_ONLY } = {}) {
  const modules = {};
  const queue = listSourceFiles(root);
  const seen = new Set(queue);
  while (queue.length) {
    const rel = queue.shift();
    const ext = extname(rel);
    const mod = { own: 'A', signals: [], imports: [], packages: [], unresolved: [] };
    modules[rel] = mod;
    if (!CODE_EXT.includes(ext)) continue; // json / assets: leaves
    const { signals, imports } = scanSource(readFileSync(join(root, rel), 'utf8'), rel);
    mod.signals = signals;
    for (const im of imports) {
      if (/\?(raw|url|worker|inline|react)\b/.test(im.spec)) mod.signals.push({ type: 'vite', detail: `import "${im.spec}"`, line: im.line });
      const r = resolveImport(root, rel, im.spec);
      if (r.pkg) {
        if (!mod.packages.includes(r.pkg)) mod.packages.push(r.pkg);
        if (isWebOnlyPackage(r.pkg, webOnly)) mod.signals.push({ type: 'web-pkg', detail: r.pkg, line: im.line });
      } else if (r.internal) {
        if (STYLE_EXT.has(extname(r.internal))) { mod.signals.push({ type: 'web-pkg', detail: `stylesheet ${r.internal}`, line: im.line }); continue; }
        if (!mod.imports.includes(r.internal)) mod.imports.push(r.internal);
        if (!seen.has(r.internal) && r.internal.startsWith('src/')) { seen.add(r.internal); queue.push(r.internal); }
      } else mod.unresolved.push(r.missing);
    }
    mod.signals.sort((a, b) => a.line - b.line || a.type.localeCompare(b.type));
    mod.own = ownClass(mod.signals);
  }
  for (const m of Object.values(modules)) m.imports = m.imports.filter((i) => modules[i]);

  for (const [rel, m] of Object.entries(modules)) {
    // BFS: closure, worst class, shortest chain to a C module.
    const parent = new Map([[rel, null]]);
    const order = [rel];
    let cls = m.own;
    let blocker = m.own === 'C' ? rel : null;
    for (let i = 0; i < order.length; i++) {
      for (const dep of modules[order[i]].imports) {
        if (parent.has(dep)) continue;
        parent.set(dep, order[i]);
        order.push(dep);
        cls = worst(cls, modules[dep].own);
        if (!blocker && modules[dep].own === 'C') blocker = dep;
      }
    }
    const chain = [];
    for (let at = blocker; at; at = parent.get(at)) chain.unshift(at);
    m.class = cls;
    m.closure_size = order.length - 1;
    m.blocking_chain = blocker ? chain : null;
  }
  return { modules, cycles: findCycles(modules) };
}

/** Strongly connected components with more than one module (or a self-import). */
export function findCycles(modules) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const stack = [];
  const on = new Set();
  const out = [];
  const strong = (v) => {
    // Iterative Tarjan (the graph is deep enough to overflow recursion).
    const work = [[v, 0]];
    idx.set(v, index); low.set(v, index); index++; stack.push(v); on.add(v);
    while (work.length) {
      const top = work[work.length - 1];
      const [node, i] = top;
      const deps = modules[node].imports;
      if (i < deps.length) {
        top[1]++;
        const w = deps[i];
        if (!idx.has(w)) {
          idx.set(w, index); low.set(w, index); index++; stack.push(w); on.add(w);
          work.push([w, 0]);
        } else if (on.has(w)) low.set(node, Math.min(low.get(node), idx.get(w)));
        continue;
      }
      work.pop();
      if (work.length) {
        const p = work[work.length - 1][0];
        low.set(p, Math.min(low.get(p), low.get(node)));
      }
      if (low.get(node) === idx.get(node)) {
        const comp = [];
        let w;
        do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== node);
        if (comp.length > 1 || modules[node].imports.includes(node)) out.push(comp.sort());
      }
    }
  };
  for (const v of Object.keys(modules).sort()) if (!idx.has(v)) strong(v);
  return out.sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
}

function closureOf(modules, rel) {
  const seen = new Set([rel]);
  const q = [rel];
  while (q.length) for (const d of modules[q.shift()].imports) if (!seen.has(d)) { seen.add(d); q.push(d); }
  return seen;
}

/** Recommended Wave 1 action for a module. */
export function recommend(modules, rel) {
  const m = modules[rel];
  if (!m) return 'not found at this commit';
  if (m.class === 'A') return 're-export as is';
  const own = m.signals;
  let action;
  if (m.own === 'C') {
    const hard = own.filter((s) => s.type === 'dom' || s.type === 'dom-jsx');
    const pkgs = [...new Set(own.filter((s) => s.type === 'web-pkg').map((s) => s.detail))];
    if (hard.length) action = 'native-only replacement';
    else if (pkgs.length && pkgs.every((p) => p === 'lucide-react')) action = 'split data from icons';
    else action = `split the portable part from its web-only imports (${pkgs.join(', ')})`;
    if (own.some((s) => s.type === 'vite' || s.type === 'storage' || s.type === 'prod-fallback')) action += '; inject config+storage';
  } else if (m.own === 'B') {
    action = own.some((s) => s.detail === 'import.meta.glob')
      ? 'native-only loader (Metro has no import.meta.glob; a generated static map, as apps/mobile/src/i18n does)'
      : 'inject config+storage';
  }
  else action = 're-export after its dependencies';
  if (m.own !== 'C' && m.class === 'C') action += ` — blocked transitively via ${m.blocking_chain.join(' → ')}`;
  return action;
}

function gitMeta(root, commit) {
  try {
    const sha = commit || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const date = execFileSync('git', ['show', '-s', '--format=%cI', sha], { cwd: root, encoding: 'utf8' }).trim();
    return { commit: sha, date };
  } catch {
    return { commit: commit || 'unknown', date: 'unknown' };
  }
}

const fmtSignals = (signals, max = 6) => {
  const s = signals.slice(0, max).map((x) => `${x.type} \`${x.detail}\` L${x.line}`).join('; ');
  return signals.length > max ? `${s}; … (+${signals.length - max})` : s || '—';
};

export function toMarkdown(result, meta) {
  const { modules, cycles } = result;
  const L = [];
  L.push('# Native app — extraction dependency analysis');
  L.push('');
  L.push(`Generated by \`node scripts/native/extraction-deps.mjs --md <file>\` (VTID-05157) at commit \`${meta.commit}\` (${meta.date}).`);
  L.push('It is the input for the Wave 1 extraction plan (program §3, step 1). It is a snapshot: CI regenerates it on every');
  L.push('push to `main` as an artefact and never fails when this file drifts from `src/`.');
  L.push('');
  L.push('Classes: **A** portable as is · **B** portable behind an adapter (Vite env, browser storage, production-host');
  L.push('literal → inject config+storage) · **C** web-only (DOM globals, DOM JSX, web-only packages from');
  L.push('`scripts/native/web-only-packages.json`, stylesheets). *Own* = the module itself; *transitive* = worst over its');
  L.push('runtime import closure (type-only imports ignored).');
  L.push('');
  const all = Object.keys(modules).filter((r) => /\.(tsx?|jsx?|mjs)$/.test(r));
  const count = (rels, f) => rels.reduce((c, r) => ((c[modules[r][f]] += 1), c), { A: 0, B: 0, C: 0 });
  const tot = count(all, 'class');
  const own = count(all, 'own');
  L.push(`**${all.length} source modules.** Own: A ${own.A} · B ${own.B} · C ${own.C}. Transitive: A ${tot.A} · B ${tot.B} · C ${tot.C}.`);
  L.push('');
  L.push('## Candidates (program §3)');
  L.push('');
  L.push('| module | own | transitive | closure | own signals | recommended Wave 1 action |');
  L.push('|---|---|---|---|---|---|');
  for (const c of CANDIDATES) {
    const m = modules[c.path];
    if (!m) { L.push(`| \`${c.path}\` | — | — | — | — | not found at this commit |`); continue; }
    L.push(`| \`${c.path}\` (${c.note}) | ${m.own} | ${m.class} | ${m.closure_size} | ${fmtSignals(m.signals)} | ${recommend(modules, c.path)} |`);
  }
  L.push('');
  L.push('## By directory');
  L.push('');
  L.push('| directory | modules | own A / B / C | transitive A / B / C |');
  L.push('|---|---|---|---|');
  for (const d of SUMMARY_DIRS) {
    const rels = all.filter((r) => r.startsWith(`${d}/`));
    const o = count(rels, 'own');
    const t = count(rels, 'class');
    L.push(`| \`${d}\` | ${rels.length} | ${o.A} / ${o.B} / ${o.C} | ${t.A} / ${t.B} / ${t.C} |`);
  }
  L.push('');
  L.push('## Most frequent blockers');
  L.push('');
  L.push('Web-only (C) modules that end the blocking chain of the most otherwise-portable (own A/B) modules in the');
  L.push('directories above — removing or splitting these unblocks the most code.');
  L.push('');
  const blockers = {};
  for (const r of all.filter((x) => SUMMARY_DIRS.some((d) => x.startsWith(`${d}/`)))) {
    const m = modules[r];
    if (m.own !== 'C' && m.blocking_chain) {
      const b = m.blocking_chain[m.blocking_chain.length - 1];
      blockers[b] = (blockers[b] || 0) + 1;
    }
  }
  L.push('| blocker | blocks | its own signals |');
  L.push('|---|---|---|');
  for (const [b, n] of Object.entries(blockers).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 15)) {
    L.push(`| \`${b}\` | ${n} | ${fmtSignals(modules[b].signals, 3)} |`);
  }
  L.push('');
  L.push('## Import cycles inside candidate closures');
  L.push('');
  const inCandidates = new Set();
  for (const c of CANDIDATES) if (modules[c.path]) for (const r of closureOf(modules, c.path)) inCandidates.add(r);
  const relevant = cycles.filter((cyc) => cyc.some((r) => inCandidates.has(r)));
  L.push(`${cycles.length} import cycle(s) in \`src/\` in total; ${relevant.length} touch a candidate closure.`);
  L.push('');
  for (const cyc of relevant) {
    const shown = cyc.slice(0, 8).map((r) => `\`${r}\``).join(', ');
    L.push(`- ${cyc.length} modules: ${shown}${cyc.length > 8 ? `, … (+${cyc.length - 8})` : ''}`);
  }
  L.push('');
  return L.join('\n');
}

export function toJson(result, meta) {
  const modules = {};
  for (const [rel, m] of Object.entries(result.modules).sort(([a], [b]) => (a < b ? -1 : 1))) {
    modules[rel] = { own: m.own, class: m.class, closure_size: m.closure_size, signals: m.signals, blocking_chain: m.blocking_chain, imports: m.imports, packages: m.packages.sort(), unresolved: m.unresolved };
  }
  return { ...meta, generated_by: 'scripts/native/extraction-deps.mjs (VTID-05157)', cycles: result.cycles, modules };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const root = resolve(opt('root') || REPO);
  const result = analyze(root);
  const meta = gitMeta(root, opt('commit'));
  const write = (file, text) => { mkdirSync(dirname(resolve(file)), { recursive: true }); writeFileSync(resolve(file), text); };
  if (opt('json')) write(opt('json'), `${JSON.stringify(toJson(result, meta), null, 1)}\n`);
  const md = toMarkdown(result, meta);
  if (opt('md')) write(opt('md'), md);
  if (!opt('json') && !opt('md')) console.log(md);
  else console.log(`extraction-deps: ${Object.keys(result.modules).length} modules, ${result.cycles.length} cycles at ${meta.commit.slice(0, 9)}`);
}
