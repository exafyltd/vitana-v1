// Custom ESLint rule: no-raw-locale-call
//
// Catches date/number formatters that hardcode an English locale or omit a
// locale, leaking English month/weekday names + US date layout into the
// German UI even when the surrounding text is translated correctly.
//
// Flags:
//   - x.toLocaleDateString()                       — implicit user locale (browser default), but on Appilix WebView default = en
//   - x.toLocaleDateString('en-US' | 'en-GB' | 'en')
//   - x.toLocaleString('en-...')                   — same family
//   - x.toLocaleTimeString('en-...')               — same family
//   - format(date, 'PPP')                          — date-fns: format() with no locale arg
//   - formatDistance / formatRelative / formatDuration without locale
//
// Allows:
//   - x.toLocaleDateString(locale, opts)           — *any* dynamic locale variable
//   - format(date, 'PPP', { locale: deLocale })    — locale provided
//   - File paths in IGNORED_FILE_PATTERNS (i18n machinery, tests, types)
//   - Inline escape: // i18n-allow-next-line: <reason>
//
// Severity: starts at "warn" — graduates to "error" after the initial codemod sweep.

const IGNORED_FILE_PATTERNS = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]types[\\/]/,
  /[\\/]src[\\/]pages[\\/]dev[\\/]/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

const EN_LOCALE_RX = /^en(-|$)/i;

const DATE_FNS_LOCALE_AWARE = new Set([
  'format',
  'formatDistance',
  'formatDistanceStrict',
  'formatDistanceToNow',
  'formatDistanceToNowStrict',
  'formatRelative',
  'formatDuration',
]);

const LOCALE_METHODS = new Set([
  'toLocaleDateString',
  'toLocaleTimeString',
  'toLocaleString',
]);

function isFileIgnored(filename) {
  if (!filename) return false;
  return IGNORED_FILE_PATTERNS.some((rx) => rx.test(filename));
}

function getFirstArg(node) {
  return node.arguments && node.arguments[0];
}

function isHardcodedEnLocale(arg) {
  if (!arg) return false;
  if (arg.type === 'Literal' && typeof arg.value === 'string') {
    return EN_LOCALE_RX.test(arg.value);
  }
  return false;
}

function hasI18nAllowComment(node, context) {
  const sourceCode = context.getSourceCode ? context.getSourceCode() : context.sourceCode;
  if (!sourceCode) return false;
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some((c) => /i18n-allow-next-line/.test(c.value));
}

function reportLocaleMethod(node, context, method) {
  const arg = getFirstArg(node);
  // toLocaleX() with no arg = browser default. On Appilix WebView the default
  // is system locale; on desktop it follows browser. In neither case is it
  // user-controllable from the app, so it ignores selectedLanguage.
  if (!arg) {
    context.report({
      node,
      message: `\`${method}()\` with no locale arg ignores the user's selected language. Pass an explicit locale or use a localized helper.`,
    });
    return;
  }
  if (isHardcodedEnLocale(arg)) {
    context.report({
      node,
      message: `\`${method}('${arg.value}')\` hardcodes an English locale. Use the user's selected language.`,
    });
  }
}

function reportDateFns(node, context, name) {
  const args = node.arguments || [];
  // format(date, fmt, opts?) — opts is arg #2; we need `locale` key inside
  const optsArg = args.length >= 3 ? args[args.length - 1] : null;
  if (optsArg && optsArg.type === 'ObjectExpression') {
    const hasLocale = optsArg.properties.some(
      (p) =>
        p.type === 'Property' &&
        ((p.key.type === 'Identifier' && p.key.name === 'locale') ||
          (p.key.type === 'Literal' && p.key.value === 'locale')),
    );
    if (hasLocale) return; // locale provided
  }
  // formatDistanceToNow(date, opts?) — opts is arg #1
  if (args.length >= 2) {
    const last = args[args.length - 1];
    if (last && last.type === 'ObjectExpression') {
      const hasLocale = last.properties.some(
        (p) =>
          p.type === 'Property' &&
          ((p.key.type === 'Identifier' && p.key.name === 'locale') ||
            (p.key.type === 'Literal' && p.key.value === 'locale')),
      );
      if (hasLocale) return;
    }
  }
  context.report({
    node,
    message: `\`${name}(...)\` from date-fns called without a \`locale\` option — output will be English regardless of the user's selected language.`,
  });
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Date/date-fns formatters without a user locale.',
    },
    schema: [],
    messages: {},
  },
  create(context) {
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (isFileIgnored(filename)) return {};

    // Track date-fns imports so we know `format` is the date-fns one, not Intl.NumberFormat etc.
    const dateFnsImports = new Set();

    return {
      ImportDeclaration(node) {
        if (
          node.source &&
          typeof node.source.value === 'string' &&
          /^date-fns(\/|$)/.test(node.source.value)
        ) {
          for (const spec of node.specifiers || []) {
            if (spec.type === 'ImportSpecifier' && DATE_FNS_LOCALE_AWARE.has(spec.imported.name)) {
              dateFnsImports.add(spec.local.name);
            }
          }
        }
      },
      CallExpression(node) {
        if (hasI18nAllowComment(node, context)) return;
        // toLocaleDateString / toLocaleTimeString / toLocaleString
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          LOCALE_METHODS.has(node.callee.property.name)
        ) {
          reportLocaleMethod(node, context, node.callee.property.name);
          return;
        }
        // date-fns calls (identifier matches imported binding)
        if (node.callee.type === 'Identifier' && dateFnsImports.has(node.callee.name)) {
          reportDateFns(node, context, node.callee.name);
        }
      },
    };
  },
};

export default rule;
