#!/usr/bin/env node
/**
 * VTID-05186 — native shell source pins (Native app Wave 1 / N3, plan changes 3 + 14).
 *
 * Some shell rules live inside web component/hook bodies, which no extractor
 * can export. apps/mobile/src/shell/logic/* mirrors them by hand; this script
 * keeps the copies honest. It is a CHECKER only — it generates nothing.
 *
 *   scripts/native/shell-pins.json records, per mirrored web range: the web
 *   file, the enclosing top-level declaration, optionally the inner variable
 *   declarations inside it, the native file, and a sha256 of that range's
 *   token stream (TypeScript scanner, comments and whitespace skipped, so
 *   formatting and comment edits never trip it).
 *
 *   It also compares apps/mobile/src/navigation/guest-paths.ts (GUEST_PATHS)
 *   with the App.tsx routes wrapped in <AuthGuard allowGuest>.
 *
 *   node scripts/native/check-shell-pins.mjs           check (CI); exit 1 on drift
 *   node scripts/native/check-shell-pins.mjs --print   print the current hash of every pin
 *   [--root <repo root>]                               (fixture trees in tests)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');
export const PINS_FILE = 'scripts/native/shell-pins.json';

const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/**
 * A node's text as its token stream: whitespace and comments dropped, a
 * trailing comma before a closing bracket dropped. Formatting-only edits
 * (prettier, reflowed arrays, reworded comments) never change it.
 */
function tokenText(sf, node) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, sf.languageVariant, sf.text.slice(node.getStart(sf), node.end));
  const tokens = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const text = scanner.getTokenText();
    const closing = kind === ts.SyntaxKind.CloseBracketToken || kind === ts.SyntaxKind.CloseBraceToken || kind === ts.SyntaxKind.CloseParenToken;
    if (closing && tokens[tokens.length - 1] === ',') tokens.pop();
    tokens.push(text);
  }
  return tokens.join(' ');
}

function declaredNames(stmt) {
  if (ts.isVariableStatement(stmt)) return stmt.declarationList.declarations.map((d) => (ts.isIdentifier(d.name) ? d.name.text : null)).filter(Boolean);
  if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) return [stmt.name.text];
  return [];
}

function findTopLevel(sf, name) {
  for (const stmt of sf.statements) {
    if (!declaredNames(stmt).includes(name)) continue;
    if (ts.isVariableStatement(stmt)) return stmt.declarationList.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === name);
    return stmt;
  }
  return null;
}

function findInner(root, name) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(root, visit);
  return found;
}

/** The normalised AST text of a pin's web range, or an error string. */
export function pinText(root, pin) {
  const file = join(root, pin.web);
  if (!existsSync(file)) return { error: `${pin.web} no longer exists` };
  const sf = parse(pin.web, readFileSync(file, 'utf8'));
  const decl = findTopLevel(sf, pin.declaration);
  if (!decl) return { error: `${pin.web}: declaration "${pin.declaration}" not found` };
  const nodes = [];
  for (const inner of pin.inner ?? []) {
    const n = findInner(decl, inner);
    if (!n) return { error: `${pin.web}: "${pin.declaration}" no longer declares "${inner}"` };
    nodes.push(n);
  }
  if (nodes.length === 0) nodes.push(decl);
  return { text: nodes.map((n) => tokenText(sf, n)).join('\n') };
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** App.tsx paths whose `element` is an <AuthGuard allowGuest> … tree. */
export function allowGuestPaths(appText) {
  const sf = parse('App.tsx', appText);
  const out = [];
  const attr = (el, name) => el.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === name);
  const hasGuestGuard = (node) => {
    let hit = false;
    const visit = (n) => {
      if (hit) return;
      const opening = ts.isJsxElement(n) ? n.openingElement : ts.isJsxSelfClosingElement(n) ? n : null;
      if (opening && opening.tagName.getText(sf) === 'AuthGuard' && attr(opening, 'allowGuest')) hit = true;
      ts.forEachChild(n, visit);
    };
    visit(node);
    return hit;
  };
  const visit = (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && opening.tagName.getText(sf) === 'Route') {
      const path = attr(opening, 'path');
      const element = attr(opening, 'element');
      if (path?.initializer && ts.isStringLiteral(path.initializer) && element?.initializer && hasGuestGuard(element.initializer)) out.push(path.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...new Set(out)].sort();
}

/** The string array exported as `name` from a native TS file. */
export function exportedStringArray(text, name) {
  const sf = parse('guest-paths.ts', text);
  const decl = findTopLevel(sf, name);
  let init = decl?.initializer;
  while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
  if (!init || !ts.isArrayLiteralExpression(init)) return null;
  return init.elements.filter(ts.isStringLiteral).map((e) => e.text).sort();
}

export function check(root = REPO) {
  const failures = [];
  const pinsPath = join(root, PINS_FILE);
  if (!existsSync(pinsPath)) return [`${PINS_FILE} is missing`];
  const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  for (const pin of pins.pins ?? []) {
    if (!existsSync(join(root, pin.native))) {
      failures.push(`pin "${pin.id}": native file ${pin.native} does not exist`);
      continue;
    }
    const r = pinText(root, pin);
    if (r.error) {
      failures.push(`pin "${pin.id}": ${r.error} — web shell rule changed — update ${pin.native} and its pin`);
      continue;
    }
    const now = sha256(r.text);
    if (now !== pin.sha256) {
      failures.push(`pin "${pin.id}" (${pin.web} → ${pin.declaration}${pin.inner?.length ? ` › ${pin.inner.join(', ')}` : ''}): web shell rule changed — update ${pin.native} and its pin (sha256 now ${now})`);
    }
  }
  const g = pins.guest_paths;
  if (g) {
    const web = allowGuestPaths(readFileSync(join(root, g.web), 'utf8'));
    const nativeText = existsSync(join(root, g.native)) ? readFileSync(join(root, g.native), 'utf8') : '';
    const native = exportedStringArray(nativeText, g.export);
    if (!native) failures.push(`guest paths: ${g.native} has no string array "${g.export}"`);
    else {
      const missing = web.filter((p) => !native.includes(p));
      const extra = native.filter((p) => !web.includes(p));
      if (missing.length || extra.length) {
        failures.push(
          `guest paths: ${g.native} ${g.export} differs from the <AuthGuard allowGuest> routes in ${g.web}` +
            `${missing.length ? ` — missing ${missing.join(', ')}` : ''}${extra.length ? ` — not guest on the web ${extra.join(', ')}` : ''}`,
        );
      }
    }
  }
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--root');
  const root = i >= 0 ? resolve(args[i + 1]) : REPO;
  if (args.includes('--print')) {
    const pins = JSON.parse(readFileSync(join(root, PINS_FILE), 'utf8'));
    for (const pin of pins.pins ?? []) {
      const r = pinText(root, pin);
      console.log(`${pin.id}\t${r.error ? `ERROR ${r.error}` : sha256(r.text)}`);
    }
    process.exit(0);
  }
  const failures = check(root);
  if (failures.length) {
    console.error(`check-shell-pins: ${failures.length} problem(s)`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('check-shell-pins: OK — every mirrored web shell rule matches its pin; guest paths match App.tsx');
}
