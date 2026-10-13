// VTID-05107 — shared helpers for the Spotlight design rules
// (docs/design-system/SPOTLIGHT_RULES.md §C).
//
// Escape hatch, same pattern as the i18n rules' `i18n-allow-next-line`:
//   // design-allow-next-line: <reason>
//   {/* design-allow-next-line: <reason> */}
// on the line directly above the reported code. A reason is mandatory; a
// bare `design-allow-next-line` is itself reported.

export const ALLOW_RX = /design-allow-next-line(?::\s*(\S.*))?/;

const CLASS_CALLEES = new Set(['cn', 'clsx', 'cva', 'twMerge', 'classNames']);

function sourceOf(context) {
  return context.sourceCode ?? context.getSourceCode();
}

export function filenameOf(context) {
  return (context.filename ?? context.getFilename()).replace(/\\/g, '/');
}

/** The allow comment on the line right above `node`, if any. */
export function allowComment(context, node) {
  const line = node.loc.start.line;
  for (const c of sourceOf(context).getAllComments()) {
    if (c.loc.end.line === line - 1 && ALLOW_RX.test(c.value)) return c;
  }
  return null;
}

/**
 * Report unless an allow comment with a reason sits on the line above.
 * An allow comment without a reason is reported instead of the finding.
 */
export function reportUnlessAllowed(context, node, data) {
  const c = allowComment(context, node);
  if (c) {
    const reason = ALLOW_RX.exec(c.value)?.[1];
    if (reason && reason.trim()) return;
    context.report({ node, message: 'design-allow-next-line needs a reason: `// design-allow-next-line: <why>`.' });
    return;
  }
  context.report({ node, ...data });
}

/** True when a string literal / template chunk is (part of) a CSS class list. */
export function isClassString(node) {
  let p = node.parent;
  for (let depth = 0; p && depth < 8; depth++, p = p.parent) {
    if (p.type === 'JSXAttribute') return p.name && (p.name.name === 'className' || p.name.name === 'class');
    if (p.type === 'CallExpression') {
      const c = p.callee;
      const name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property ? c.property.name : null;
      if (name && CLASS_CALLEES.has(name)) return true;
    }
    if (p.type === 'Program' || p.type === 'JSXElement' || /Statement$|Declaration$/.test(p.type)) return false;
  }
  return false;
}

/** Split a class string into utility tokens with variants (`md:`, `hover:`) and `!` stripped. */
export function classTokens(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const parts = t.split(':');
      return parts[parts.length - 1].replace(/^!/, '');
    });
}

/** Visitors that call `check(node, stringValue)` for every class string in a file. */
export function classStringVisitors(check) {
  return {
    Literal(node) {
      if (typeof node.value === 'string' && isClassString(node)) check(node, node.value);
    },
    TemplateElement(node) {
      if (isClassString(node)) check(node, node.value.cooked ?? node.value.raw);
    },
  };
}

export const OPERATOR_PAGES_RX = /\/src\/pages\/(admin|backoffice|dev|professional|staff)\//;
export const isPageFile = (f) => /\/src\/pages\//.test(f) && !/\.test\.[jt]sx?$/.test(f);
