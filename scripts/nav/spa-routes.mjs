/**
 * VTID-04502 — SPA route inventory for the navigation registry checks.
 *
 * Walks src/App.tsx with the TypeScript compiler API and returns every
 * <Route>, with nested paths JOINED to their parents (the older
 * scripts/extract-routes.mjs reports nested children like "sell-earn" without
 * their "/business" prefix) and with <Navigate to="..."> redirects recorded,
 * so the registry can be checked against the route a user actually lands on.
 *
 *   { path, redirectTo?, index?: boolean, requiredRole? }
 *
 * Pure: takes source text, returns data. Used by
 * src/navigation/registry/registry.routes.test.ts and scripts/nav/*.
 */
import ts from 'typescript';

function attr(opening, sf, name) {
  for (const a of opening.attributes.properties) {
    if (ts.isJsxAttribute(a) && a.name.getText(sf) === name) return a;
  }
  return null;
}

function stringAttr(opening, sf, name) {
  const a = attr(opening, sf, name);
  if (!a || !a.initializer) return null;
  if (ts.isStringLiteral(a.initializer)) return a.initializer.text;
  if (ts.isJsxExpression(a.initializer) && a.initializer.expression && ts.isStringLiteral(a.initializer.expression)) {
    return a.initializer.expression.text;
  }
  return null;
}

function joinPath(parent, child) {
  if (child.startsWith('/')) return child;
  if (!parent || parent === '/') return '/' + child;
  return parent.replace(/\/\*$/, '').replace(/\/$/, '') + '/' + child;
}

/** Find a <Navigate to="..."> that is the Route's whole element. */
function redirectTarget(opening, sf) {
  const el = attr(opening, sf, 'element');
  if (!el || !el.initializer || !ts.isJsxExpression(el.initializer)) return null;
  const expr = el.initializer.expression;
  if (!expr) return null;
  const node = ts.isJsxSelfClosingElement(expr) ? expr : ts.isJsxElement(expr) ? expr.openingElement : null;
  if (!node || node.tagName.getText(sf) !== 'Navigate') return null;
  return stringAttr(node, sf, 'to');
}

function requiredRoleOf(opening, sf) {
  const el = attr(opening, sf, 'element');
  if (!el) return null;
  let role = null;
  el.forEachChild(function walk(n) {
    if (role) return;
    if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
      if (n.tagName.getText(sf) === 'ProtectedRoute') role = stringAttr(n, sf, 'requiredRole');
    }
    n.forEachChild(walk);
  });
  return role;
}

export function extractSpaRoutes(source, filename = 'src/App.tsx') {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];

  function visit(node, parentPath) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      if (opening.tagName.getText(sf) === 'Route') {
        const own = stringAttr(opening, sf, 'path');
        const isIndex = !!attr(opening, sf, 'index');
        const full = own != null ? joinPath(parentPath, own) : parentPath;
        if (own != null || isIndex) {
          const redirectTo = redirectTarget(opening, sf);
          const requiredRole = requiredRoleOf(opening, sf);
          out.push({
            path: full || '/',
            ...(isIndex ? { index: true } : {}),
            ...(redirectTo ? { redirectTo } : {}),
            ...(requiredRole ? { requiredRole } : {}),
          });
        }
        if (ts.isJsxElement(node)) {
          for (const child of node.children) visit(child, full);
        }
        return;
      }
    }
    node.forEachChild((c) => visit(c, parentPath));
  }

  visit(sf, '');
  const seen = new Set();
  return out.filter((r) => {
    const key = `${r.path}|${r.index ? 'i' : ''}|${r.redirectTo || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
