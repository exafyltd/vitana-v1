// Stricter sibling of no-raw-jsx-text. Wave 2.x: graduates toast/sonner/notify
// first-arg literals from warn to error so any new untranslated toast added
// in future code blocks the PR.
//
// Catches the same patterns no-raw-jsx-text was flagging on CallExpressions:
//   - toast("X")
//   - toast.error("X"), toast.success("X"), etc.
//   - toast({title: "X", description: "Y"})
//   - notify("X"), notify.error("X", ...), etc.
//
// Allowlist:
//   - Dotted translation keys (toasts.diary.entrySaved)
//   - Brand tokens (Vitana, MAXINA, etc.)
//   - Inline `// i18n-allow-next-line: <reason>`

const IGNORED_FILE_PATTERNS = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]lib[\\/]i18n-(toast|helpers)\.ts$/,
  /[\\/]src[\\/]hooks[\\/]use(I18nNotify|Translation|-toast)\.ts$/,
  /[\\/]src[\\/]types[\\/]/,
  /[\\/]src[\\/]pages[\\/]dev[\\/]/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

const BRAND_ALLOWLIST = new Set([
  'Vitana', 'VITANA', 'MAXINA', 'Maxina', 'Lovable', 'Exafy', 'EXAFY',
  'OK', 'Ok', 'AI', 'API', 'URL', 'ID', 'UUID', 'PDF', 'CSV', 'JSON',
  'EN', 'DE', 'AR', 'ES', 'FR', 'PT', 'PL', 'RU', 'ZH', 'SR',
]);

const I18N_FUNCTION_CALLS = new Set(['toast', 'alert', 'confirm', 'notify']);

const HAS_LETTERS = /[A-Za-z]{2,}/;
const TRANSLATION_KEY_RX = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/;

function isAllowed(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!HAS_LETTERS.test(trimmed)) return true;
  if (BRAND_ALLOWLIST.has(trimmed)) return true;
  if (TRANSLATION_KEY_RX.test(trimmed)) return true;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((t) => BRAND_ALLOWLIST.has(t.replace(/[^\w]/g, '')))) return true;
  return false;
}

function hasInlineSuppression(node, sourceCode) {
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some((c) => /i18n-allow-next-line/.test(c.value));
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw user-visible strings as the first argument of toast/sonner/notify/alert/confirm calls (Wave 2.x: error-level)',
      category: 'Internationalization',
    },
    schema: [],
    messages: {
      callArg:
        'i18n: raw string passed to {{callee}}("{{text}}") — pass a translation key. For sonner/toast: lookup(\'toasts.x.y\'). For notify (useI18nNotify): \'toasts.x.y\' directly.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (IGNORED_FILE_PATTERNS.some((rx) => rx.test(filename))) return {};
    const sourceCode = context.getSourceCode();

    return {
      CallExpression(node) {
        let calleeName = null;
        if (node.callee.type === 'Identifier') {
          calleeName = node.callee.name;
        } else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          if (node.callee.object.type === 'Identifier' && I18N_FUNCTION_CALLS.has(node.callee.object.name)) {
            calleeName = node.callee.object.name;
          }
        }
        if (!calleeName || !I18N_FUNCTION_CALLS.has(calleeName)) return;

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        if (firstArg.type === 'ObjectExpression') {
          for (const prop of firstArg.properties) {
            if (prop.type !== 'Property') continue;
            const key = prop.key && (prop.key.name || prop.key.value);
            if (key !== 'title' && key !== 'description' && key !== 'message') continue;
            const v = prop.value;
            if (v.type === 'Literal' && typeof v.value === 'string' && !isAllowed(v.value)) {
              if (!hasInlineSuppression(node, sourceCode)) {
                context.report({
                  node: v,
                  messageId: 'callArg',
                  data: { callee: calleeName, text: v.value.slice(0, 60) },
                });
              }
            }
          }
          return;
        }

        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string' && !isAllowed(firstArg.value)) {
          if (!hasInlineSuppression(node, sourceCode)) {
            context.report({
              node: firstArg,
              messageId: 'callArg',
              data: { callee: calleeName, text: firstArg.value.slice(0, 60) },
            });
          }
        }
      },
    };
  },
};
