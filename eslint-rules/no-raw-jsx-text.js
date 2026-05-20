// Custom ESLint rule: no-raw-jsx-text
//
// Flags user-visible English strings that bypass the i18n catalog.
// Catches:
//   - <Button>Save</Button>          (JSXText)
//   - <input placeholder="Search" /> (JSXAttribute on placeholder/title/aria-label/alt)
//   - toast("Failed to save")        (string-literal first arg of toast/alert/confirm)
//
// Allowlist:
//   - File path patterns in IGNORED_FILE_PATTERNS
//   - Inline comment: // i18n-allow-next-line: <reason>
//   - Whitelisted brand tokens (Vitana, MAXINA, Lovable, Exafy, OK)
//   - Strings without 2+ consecutive ASCII letters (numbers, symbols, emojis)
//
// Wave 1: registered at "warn" level.
// Wave 2+: graduates to "error" first for toast first-args, then globally.

const IGNORED_FILE_PATTERNS = [
  /[\\/]src[\\/]i18n[\\/]/,
  /[\\/]src[\\/]lib[\\/]i18n-helpers\.ts$/,
  /[\\/]src[\\/]types[\\/]/,
  /[\\/]src[\\/]pages[\\/]dev[\\/]/,
  /\.test\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];

// Brand/short tokens that don't need translation.
const BRAND_ALLOWLIST = new Set([
  'Vitana', 'VITANA', 'MAXINA', 'Maxina', 'Lovable', 'Exafy', 'EXAFY',
  'OK', 'Ok', 'AI', 'API', 'URL', 'ID', 'UUID', 'PDF', 'CSV', 'JSON',
  'EN', 'DE', 'AR', 'ES', 'FR', 'PT', 'PL', 'RU', 'ZH', 'SR',
]);

const I18N_FUNCTION_CALLS = new Set([
  'toast', 'alert', 'confirm', 'notify',
]);

const I18N_ATTRIBUTES = new Set([
  'placeholder', 'title', 'aria-label', 'aria-description', 'alt',
]);
// TODO(i18n): expand to catch `description`/`label`/`subtitle`/`heading` props on
// shared component primitives (StandardHeader/SEO/card subtitles). Current sweep
// shows ~578 sites — needs a dedicated codemod PR before promoting to error.

// 2+ consecutive ASCII letters anywhere → text we'd want to translate.
const HAS_LETTERS = /[A-Za-z]{2,}/;

// Dotted identifier path with no whitespace = obviously already a translation key
// (e.g. "toasts.diary.entrySaved", "liveRooms.goLivePopup.errors.fileTooLargeTitle")
const TRANSLATION_KEY_RX = /^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)+$/;

function isAllowed(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!HAS_LETTERS.test(trimmed)) return true;
  if (BRAND_ALLOWLIST.has(trimmed)) return true;
  if (TRANSLATION_KEY_RX.test(trimmed)) return true;
  // Allow strings made entirely of brand tokens + punctuation
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every(t => BRAND_ALLOWLIST.has(t.replace(/[^\w]/g, '')))) {
    return true;
  }
  return false;
}

function hasInlineSuppression(node, sourceCode) {
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some(c => /i18n-allow-next-line/.test(c.value));
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw user-visible strings in JSX, attributes, and toast/alert/confirm calls',
      category: 'Internationalization',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedAttributes: { type: 'array', items: { type: 'string' } },
          allowedCallees: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      jsxText: 'i18n: raw user-visible string "{{text}}" — move to src/i18n/de/<namespace>.json and use translate() / t.<key>.',
      jsxAttribute: 'i18n: raw string in {{attr}}="{{text}}" — move to src/i18n/de/<namespace>.json and use translate().',
      callArg: 'i18n: raw string passed to {{callee}}("{{text}}") — use createI18nToast(translate) from src/lib/i18n-helpers.ts.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (IGNORED_FILE_PATTERNS.some(rx => rx.test(filename))) {
      return {};
    }

    const sourceCode = context.getSourceCode();

    return {
      JSXText(node) {
        const text = node.value;
        if (isAllowed(text)) return;
        if (hasInlineSuppression(node, sourceCode)) return;
        context.report({
          node,
          messageId: 'jsxText',
          data: { text: text.trim().slice(0, 60) },
        });
      },

      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (typeof name !== 'string') return;
        if (!I18N_ATTRIBUTES.has(name)) return;
        const value = node.value;
        if (!value || value.type !== 'Literal') return;
        if (typeof value.value !== 'string') return;
        if (isAllowed(value.value)) return;
        if (hasInlineSuppression(node, sourceCode)) return;
        context.report({
          node: value,
          messageId: 'jsxAttribute',
          data: { attr: name, text: value.value.slice(0, 60) },
        });
      },

      // CallExpression handling moved to no-raw-toast-arg (error-level in Wave 2.x)
    };
  },
};
