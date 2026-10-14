#!/usr/bin/env node
/**
 * VTID-05183 — the single extraction generator of the native program (Native
 * app Wave 1 N1, plan change 5).
 *
 * Some pure code the native app needs (role ladder, nav items, business-mode
 * rules, tenant brand configs, language options …) is trapped in a web-only
 * file: its data and rules are portable, but the file imports lucide-react,
 * react-router, a PNG or a hook. Until a later move package splits those files
 * in src/ (step 3 of the program's phased extraction), this generator copies
 * the named declarations VERBATIM out of the web source into
 *
 *   packages/core/src/extracted/<entry>.generated.ts
 *
 * driven by packages/core/extract.json. Nothing is hand-copied, and
 * `--check` fails on any drift, so web and native cannot diverge silently.
 *
 * Selectors: a top-level declaration by name (all overloads of a function), or
 * `Function#name` for a `const` declared directly in the body of a named
 * top-level function whose initializer is a pure literal.
 *
 * Exactly three rewrites exist:
 *   (a) iconFields: `icon: Mail` → `icon: 'Mail'`; the field's type becomes
 *       `IconName` (a generated union of every icon used, icons.generated.ts)
 *   (b) stubs: an identifier listed in `stubs` (with a reason) is replaced by
 *       the given expression
 *   (c) a static asset import (`import deFlag from '@/assets/flags/de.png'`)
 *       becomes the asset's repo path; assets.generated.ts maps each path to a
 *       `require()` so Metro bundles exactly those assets
 *
 * The generator FAILS when an extracted declaration references anything that
 * is not another extracted declaration, a stub, a TypeScript/ES global, or an
 * import of a module the extraction analysis classes A (transitively).
 *
 *   node scripts/native/gen-core-extract.mjs            write
 *   node scripts/native/gen-core-extract.mjs --check    fail on drift (NATIVE-CI)
 *   [--root <repo>]                                     fixture trees (tests)
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { analyze, resolveImport } from './extraction-deps.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');
export const EXTRACT_CONFIG = 'packages/core/extract.json';
export const OUT_DIR = 'packages/core/src/extracted';
const CMD = 'node scripts/native/gen-core-extract.mjs';

export const ASSET_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ttf', '.otf', '.mp3', '.mp4', '.wav']);

/** Names a declaration may reference without an import: TypeScript lib types and ES globals. */
export const GLOBALS = new Set([
  'undefined', 'NaN', 'Infinity', 'globalThis',
  'Object', 'Array', 'Set', 'Map', 'WeakMap', 'WeakSet', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Date', 'RegExp',
  'Error', 'TypeError', 'RangeError', 'JSON', 'Math', 'Promise', 'Intl', 'Reflect', 'Proxy',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'URL', 'URLSearchParams',
  'Record', 'Partial', 'Required', 'Readonly', 'ReadonlyArray', 'ReadonlySet', 'ReadonlyMap', 'Pick', 'Omit', 'Exclude',
  'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType', 'Awaited', 'Uppercase', 'Lowercase',
  'Capitalize', 'Uncapitalize', 'PropertyKey', 'Iterable', 'IterableIterator', 'PromiseLike', 'ArrayLike',
]);

const posix = (p) => p.split(sep).join('/');
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// ------------------------------------------------------------- AST helpers

function topLevelIndex(sf) {
  const decls = new Map();
  const add = (name, node) => {
    if (!decls.has(name)) decls.set(name, []);
    decls.get(name).push(node);
  };
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) add(d.name.text, st);
    } else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) {
      add(st.name.text, st);
    }
  }
  return decls;
}

function importIndex(sf) {
  const out = new Map();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause) continue;
    const spec = st.moduleSpecifier.text;
    const c = st.importClause;
    if (c.name) out.set(c.name.text, { spec, imported: 'default', typeOnly: c.isTypeOnly });
    const nb = c.namedBindings;
    if (nb && ts.isNamedImports(nb)) {
      for (const e of nb.elements) out.set(e.name.text, { spec, imported: (e.propertyName ?? e.name).text, typeOnly: c.isTypeOnly || e.isTypeOnly });
    } else if (nb && ts.isNamespaceImport(nb)) out.set(nb.name.text, { spec, imported: '*', typeOnly: c.isTypeOnly });
  }
  return out;
}

function hasExport(node) {
  return !!ts.getModifiers?.(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** True for a literal built only of strings, numbers, booleans, null, arrays and objects (`as const` allowed). */
export function isPureLiteral(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
    if (ts.isAsExpression(node) && !(ts.isTypeReferenceNode(node.type) && node.type.typeName.getText() === 'const')) return false;
    return isPureLiteral(node.expression);
  }
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return true;
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) return true;
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((e) => isPureLiteral(e));
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every((p) => ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && isPureLiteral(p.initializer));
  }
  return false;
}

/** Names declared anywhere inside `node` (params, locals, type params, catch vars, function names). */
function localNames(node) {
  const names = new Set();
  const visit = (n) => {
    if ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isClassDeclaration(n) || ts.isBindingElement(n) || ts.isTypeParameterDeclaration(n)) && n.name && ts.isIdentifier(n.name)) names.add(n.name.text);
    n.forEachChild(visit);
  };
  visit(node);
  return names;
}

/** True when `id` is a name position (property, declaration, label …), not a reference. */
function isNamePosition(id) {
  const p = id.parent;
  if (!p) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
  if (ts.isQualifiedName(p) && p.right === id) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)
    || ts.isMethodSignature(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p) || ts.isEnumMember(p)
    || ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p)
    || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isTypeParameterDeclaration(p)
    || ts.isFunctionExpression(p) || ts.isClassExpression(p) || ts.isJsxAttribute(p) || ts.isEnumDeclaration(p)) && p.name === id) return true;
  if (ts.isBindingElement(p) && (p.name === id || p.propertyName === id)) return true;
  if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return true;
  return false;
}

function inTypePosition(id, stop) {
  for (let n = id.parent; n && n !== stop; n = n.parent) {
    if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return true;
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return true;
    if (ts.isHeritageClause(n)) return true;
  }
  return ts.isInterfaceDeclaration(stop) || ts.isTypeAliasDeclaration(stop);
}

function propName(p) {
  return p.name && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ? p.name.text : null;
}

// ------------------------------------------------------------- config

export function loadConfig(root) {
  const cfg = JSON.parse(readFileSync(join(root, EXTRACT_CONFIG), 'utf8'));
  if (!cfg.entries || typeof cfg.entries !== 'object') throw new Error(`gen-core-extract: ${EXTRACT_CONFIG} needs "entries"`);
  return cfg;
}

const normTake = (t) => (typeof t === 'string' ? { name: t } : t);

// ------------------------------------------------------------- build

/**
 * Builds every generated file in memory. `analysis` (from extraction-deps
 * analyze()) is computed on demand; tests may pass one in.
 */
export function build(root = REPO, { analysis } = {}) {
  const cfg = loadConfig(root);
  const errors = [];
  const fail = (msg) => errors.push(msg);
  let modules = analysis?.modules;
  const classOf = (rel) => {
    if (!modules) modules = analyze(root).modules;
    return modules[rel];
  };

  // 1. Locate every selected declaration.
  const parsed = new Map(); // file -> { sf, text, decls, imports }
  const parse = (file) => {
    if (!parsed.has(file)) {
      const full = join(root, file);
      if (!existsSync(full)) throw new Error(`gen-core-extract: source ${file} does not exist (${EXTRACT_CONFIG})`);
      const text = readFileSync(full, 'utf8');
      const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
      parsed.set(file, { sf, text, decls: topLevelIndex(sf), imports: importIndex(sf) });
    }
    return parsed.get(file);
  };

  const items = []; // { entry, file, name, exportAs, exported, nodes, inner }
  const taken = new Map(); // `${file}::${name}` -> entry
  const entries = Object.entries(cfg.entries);
  for (const [entry, spec] of entries) {
    for (const src of spec.sources ?? []) {
      const p = parse(src.file);
      for (const t of (src.take ?? []).map(normTake)) {
        let nodes;
        let declName = t.name;
        let inner = false;
        if (t.name.includes('#')) {
          const [fn, local] = t.name.split('#');
          declName = local;
          inner = true;
          const fnNode = (p.decls.get(fn) ?? []).find((n) => ts.isFunctionDeclaration(n) && n.body);
          if (!fnNode) { fail(`${entry}: ${src.file} has no top-level function ${fn} (selector ${t.name})`); continue; }
          const st = fnNode.body.statements.find((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === local));
          if (!st) { fail(`${entry}: ${fn} in ${src.file} declares no const ${local} directly in its body (selector ${t.name})`); continue; }
          const d = st.declarationList.declarations.find((x) => x.name.text === local);
          if (!(st.declarationList.flags & ts.NodeFlags.Const) || !d.initializer || !isPureLiteral(d.initializer)) {
            fail(`${entry}: ${t.name} in ${src.file} is not a const with a pure literal initializer`);
            continue;
          }
          nodes = [st];
        } else {
          nodes = p.decls.get(t.name);
          if (!nodes?.length) { fail(`${entry}: ${src.file} has no top-level declaration ${t.name}`); continue; }
        }
        const key = `${src.file}::${declName}`;
        if (taken.has(key)) { fail(`${t.name} from ${src.file} is extracted twice (${taken.get(key)}, ${entry})`); continue; }
        taken.set(key, entry);
        items.push({ entry, file: src.file, name: declName, exportAs: t.as ?? null, exported: t.export !== false, nodes, inner, src });
      }
    }
  }

  // 2. Render each item with its rewrites; record cross-entry imports, icons and assets.
  const icons = new Set();
  const assets = new Set();
  const perEntry = new Map(entries.map(([e]) => [e, { items: [], imports: new Map(), keptImports: new Map(), usesIconName: false, sources: new Map() }]));

  const stubsUsed = new Map(); // source spec -> stubs applied (a stub must be used: "applied only where listed")
  for (const it of items) {
    const p = parsed.get(it.file);
    const out = perEntry.get(it.entry);
    const spec = cfg.entries[it.entry];
    const iconFields = new Set(spec.iconFields ?? []);
    const stubs = it.src.stubs ?? {};
    for (const [name, s] of Object.entries(stubs)) {
      if (!s || typeof s.expression !== 'string' || !s.reason) fail(`${it.entry}: stub ${name} in ${it.file} needs "expression" and "reason"`);
    }
    out.sources.set(it.file, sha256(p.text));
    const rendered = [];
    for (const node of it.nodes) {
      const locals = localNames(node);
      const edits = [];
      const skip = new Set();
      const stubUsed = new Set();
      // (a) icon fields: types first, so identifiers inside a replaced type are skipped.
      const visitIcons = (n) => {
        if (ts.isPropertySignature(n) && iconFields.has(propName(n)) && n.type) {
          edits.push({ start: n.type.getStart(p.sf), end: n.type.end, text: 'IconName' });
          out.usesIconName = true;
          const mark = (x) => { skip.add(x); x.forEachChild(mark); };
          mark(n.type);
        }
        if (ts.isPropertyAssignment(n) && iconFields.has(propName(n)) && ts.isIdentifier(n.initializer)) {
          const icon = n.initializer.text;
          edits.push({ start: n.initializer.getStart(p.sf), end: n.initializer.end, text: `'${icon}'` });
          skip.add(n.initializer);
          icons.add(icon);
        }
        n.forEachChild(visitIcons);
      };
      visitIcons(node);

      const visit = (n) => {
        if (ts.isIdentifier(n) && !skip.has(n) && !isNamePosition(n)) {
          const name = n.text;
          const typePos = inTypePosition(n, node);
          if (locals.has(name) || (name === 'const' && ts.isTypeReferenceNode(n.parent))) { /* declared inside the declaration, or `as const` */ }
          else if (name in stubs) {
            edits.push({ start: n.getStart(p.sf), end: n.end, text: `(${stubs[name].expression})` });
            stubUsed.add(name);
          } else if (taken.get(`${it.file}::${name}`) === it.entry) { /* same entry */ }
          else if (taken.has(`${it.file}::${name}`)) {
            const other = taken.get(`${it.file}::${name}`);
            const prev = out.imports.get(name);
            out.imports.set(name, { from: other, typeOnly: (prev ? prev.typeOnly : true) && typePos });
          } else if (p.imports.has(name)) {
            const im = p.imports.get(name);
            const r = resolveImport(root, it.file, im.spec);
            const targetEntry = r.internal ? taken.get(`${r.internal}::${im.imported}`) : undefined;
            if (r.internal && ASSET_EXT.has(extname(r.internal).toLowerCase())) {
              edits.push({ start: n.getStart(p.sf), end: n.end, text: `'${r.internal}'` });
              assets.add(r.internal);
            } else if (targetEntry === it.entry) { /* the imported declaration is extracted into this same file */ }
            else if (targetEntry) {
              const prev = out.imports.get(name);
              out.imports.set(name, { from: targetEntry, imported: im.imported, typeOnly: (prev ? prev.typeOnly : true) && typePos });
            } else if (r.internal && r.internal.startsWith('src/')) {
              const m = classOf(r.internal);
              if (!m || m.class !== 'A') {
                fail(`${it.entry}: ${it.name} (${it.file}) references ${name}, imported from ${im.spec} (${r.internal}), which is class ${m ? m.class : '?'}${m?.blocking_chain ? ` via ${m.blocking_chain.join(' → ')}` : ''} — only transitively class-A imports may be kept`);
              } else {
                const prev = out.keptImports.get(name);
                out.keptImports.set(name, { spec: `@/${r.internal.slice(4).replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '')}`, imported: im.imported, typeOnly: (prev ? prev.typeOnly : true) && (typePos || im.typeOnly), rel: r.internal });
              }
            } else {
              fail(`${it.entry}: ${it.name} (${it.file}) references ${name}, imported from package ${im.spec} — not allowed in an extract (add it to iconFields, stub it, or move the code)`);
            }
          } else if (GLOBALS.has(name)) { /* global */ }
          else if (p.decls.has(name)) {
            fail(`${it.entry}: ${it.name} (${it.file}) references ${name}, a declaration of the same file that is not extracted — add it to ${EXTRACT_CONFIG}`);
          } else {
            fail(`${it.entry}: ${it.name} (${it.file}) references the unknown free identifier ${name}`);
          }
        }
        n.forEachChild(visit);
      };
      visit(node);
      if (!stubsUsed.has(it.src)) stubsUsed.set(it.src, new Set());
      for (const s of stubUsed) stubsUsed.get(it.src).add(s);

      // Leading comments (JSDoc and line comments) come along verbatim.
      const fullStart = node.getFullStart();
      const ranges = ts.getLeadingCommentRanges(p.text, fullStart) ?? [];
      const start = ranges.length ? ranges[0].pos : node.getStart(p.sf);
      const codeStart = node.getStart(p.sf);
      let text = p.text.slice(start, node.end);
      for (const e of edits.sort((a, b) => b.start - a.start)) {
        text = text.slice(0, e.start - start) + e.text + text.slice(e.end - start);
      }
      // Export handling, then re-indent a Function#name const to the top level.
      const codeOffset = codeStart - start;
      let head = text.slice(0, codeOffset);
      let code = text.slice(codeOffset);
      const wantsExport = it.exported && !it.exportAs;
      if (hasExport(node) && !wantsExport) code = code.replace(/^export\s+/, '');
      if (!hasExport(node) && wantsExport) code = `export ${code}`;
      if (it.inner) {
        const lineStart = p.text.lastIndexOf('\n', codeStart - 1) + 1;
        const indent = /^[ \t]*/.exec(p.text.slice(lineStart, codeStart))[0];
        const dedent = (l) => (l.startsWith(indent) ? l.slice(indent.length) : l);
        head = head.split('\n').map(dedent).join('\n');
        code = code.split('\n').map((l, i) => (i === 0 ? l : dedent(l))).join('\n');
      }
      rendered.push(head + code);
    }
    if (it.exportAs) rendered.push(`export { ${it.name} as ${it.exportAs} };`);
    out.items.push({ ...it, pos: it.nodes[0].pos, text: rendered.join('\n') });
  }

  for (const [, spec] of entries) for (const src of spec.sources ?? []) {
    for (const s of Object.keys(src.stubs ?? {})) if (!stubsUsed.get(src)?.has(s)) fail(`stub ${s} for ${src.file} is never used by the declarations taken from it`);
  }
  if (errors.length) throw new Error(`gen-core-extract: ${errors.length} problem(s):\n- ${errors.join('\n- ')}`);

  // 3. Files.
  const files = {};
  const header = (lines) => [
    `// AUTO-GENERATED by ${CMD} (VTID-05183). Do not edit.`,
    ...lines,
    `// After changing a source run \`${CMD}\` (then \`node scripts/native/core-closure.mjs --write\`); NATIVE-CI fails on drift.`,
    '/* eslint-disable */',
    '',
  ];
  const fileOrder = new Map();
  for (const [entry, out] of perEntry) {
    const srcOrder = (cfg.entries[entry].sources ?? []).map((s) => s.file);
    out.items.sort((a, b) => srcOrder.indexOf(a.file) - srcOrder.indexOf(b.file) || a.pos - b.pos);
    fileOrder.set(entry, srcOrder);
    const lines = header([
      `// Entry "${entry}" of ${EXTRACT_CONFIG}. Declarations are copied verbatim from:`,
      ...[...out.sources].sort((a, b) => srcOrder.indexOf(a[0]) - srcOrder.indexOf(b[0])).map(([f, h]) => `//   ${f} (sha256 ${h.slice(0, 16)})`),
    ]);
    const imps = [];
    if (out.usesIconName) imps.push("import type { IconName } from './icons.generated';");
    const byFrom = new Map();
    for (const [name, im] of out.imports) {
      const key = `${im.from}|${im.typeOnly}`;
      if (!byFrom.has(key)) byFrom.set(key, []);
      byFrom.get(key).push(im.imported && im.imported !== name ? `${im.imported} as ${name}` : name);
    }
    for (const [key, names] of [...byFrom].sort()) {
      const [from, typeOnly] = key.split('|');
      imps.push(`import ${typeOnly === 'true' ? 'type ' : ''}{ ${names.sort().join(', ')} } from './${from}.generated';`);
    }
    const kept = new Map();
    for (const [name, im] of out.keptImports) {
      const key = `${im.spec}|${im.typeOnly}`;
      if (!kept.has(key)) kept.set(key, []);
      kept.get(key).push(im.imported === 'default' ? `default as ${name}` : im.imported !== name ? `${im.imported} as ${name}` : name);
    }
    for (const [key, names] of [...kept].sort()) {
      const [spec, typeOnly] = key.split('|');
      imps.push(`import ${typeOnly === 'true' ? 'type ' : ''}{ ${names.sort().join(', ')} } from '${spec}';`);
    }
    if (imps.length) lines.push(...imps, '');
    for (const item of out.items) lines.push(item.text, '');
    files[`${OUT_DIR}/${entry}.generated.ts`] = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  }

  const iconList = [...icons].sort();
  files[`${OUT_DIR}/icons.generated.ts`] = [
    ...header([`// Every icon named in an "iconFields" property of ${EXTRACT_CONFIG} (lucide-react names on the web).`]),
    '/** The icon names the extracted nav data uses; N2 maps each to a native icon. */',
    `export const ICON_NAMES = ${iconList.length ? `[\n${iconList.map((n) => `  '${n}',`).join('\n')}\n]` : '[]'} as const;`,
    '',
    'export type IconName = (typeof ICON_NAMES)[number];',
    '',
  ].join('\n');

  const assetList = [...assets].sort();
  const toAsset = (rel) => {
    let r = posix(relative(join(root, OUT_DIR), join(root, rel)));
    if (!r.startsWith('.')) r = `./${r}`;
    return r;
  };
  files[`${OUT_DIR}/assets.generated.ts`] = [
    ...header([`// Static assets the extracts reference (rewrite (c)): repo path → Metro asset module.`]),
    '/** Repo path (as it appears in the extracted data) → the bundled asset (`require()` result). */',
    `export const ASSETS: Readonly<Record<string, number>> = {${assetList.length ? '\n' + assetList.map((a) => `  '${a}': require('${toAsset(a)}'),`).join('\n') + '\n' : ''}};`,
    '',
  ].join('\n');

  return { files, assets: assetList, icons: iconList, sources: [...parsed.keys()].sort() };
}

/** Writes (or checks) the generated files; extra *.generated.ts files in the output dir count as stale. */
export function run({ root = REPO, check = false, analysis } = {}) {
  const { files, assets, icons, sources } = build(root, { analysis });
  const stale = [];
  for (const [rel, text] of Object.entries(files)) {
    const full = join(root, rel);
    const before = existsSync(full) ? readFileSync(full, 'utf8') : null;
    if (before === text) continue;
    stale.push(rel);
    if (!check) {
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, text);
    }
  }
  const outDir = join(root, OUT_DIR);
  if (existsSync(outDir)) {
    for (const f of readdirSync(outDir)) {
      const rel = `${OUT_DIR}/${f}`;
      if (f.endsWith('.generated.ts') && !(rel in files)) {
        stale.push(rel);
        if (!check) rmSync(join(outDir, f));
      }
    }
  }
  return { stale, files: Object.keys(files), assets, icons, sources };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : REPO;
  const check = args.includes('--check');
  try {
    const r = run({ root, check });
    if (check && r.stale.length) {
      console.error(`gen-core-extract: out of date: ${r.stale.join(', ')}\nRun \`${CMD}\` and \`node scripts/native/core-closure.mjs --write\`, then commit the result.`);
      process.exit(1);
    }
    console.log(`gen-core-extract: ${r.files.length} files from ${r.sources.length} sources, ${r.icons.length} icons, ${r.assets.length} assets${check ? ' — up to date' : r.stale.length ? ` → wrote ${r.stale.join(', ')}` : ' (unchanged)'}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
