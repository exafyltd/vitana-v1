#!/usr/bin/env node
/**
 * VTID-03663 — a React.memo'd component that renders catalog strings must
 * subscribe to the locale.
 *
 * WHY THIS CHECK EXISTS
 * ---------------------
 * `lookup()` / `t()` from i18n-toast are plain function calls, not hooks, so a
 * component that renders them subscribes to nothing on its own. LanguageProvider
 * covers that by cascading a re-render through its whole subtree on a language
 * change, which is why 613 of 614 such components need no per-file change.
 *
 * React.memo is the one thing that stops the cascade: it bails out on
 * shallow-equal props, and the locale is not one of them. A memo'd component
 * therefore renders its strings once and never looks again, leaving the page in
 * two languages at once.
 *
 * That failure is invisible in every way that normally catches things. Nothing
 * throws, no key is missing, no test fails, coverage is 100%, and the very first
 * render is correct — it only goes wrong on the SECOND language the user picks.
 * So it needs a check that reads the code, because nothing else will notice.
 *
 * HOW TO SATISFY IT
 * -----------------
 *   import { t, useI18nLocale } from '@/lib/i18n-toast';
 *   const Bubble = React.memo(function Bubble() {
 *     useI18nLocale();               // re-render me when the language changes
 *     return <span>{t('screens.x.y')}</span>;
 *   });
 *
 * `useTranslation()` and `useLanguage()` also count — both read the context, and
 * a context read is a subscription that memo does not block.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync(
  "grep -rl \"from '@/lib/i18n-toast'\" src --include=*.tsx || true",
)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

/**
 * Strip comments before matching.
 *
 * Not cosmetic — without it this check is worthless. Every file it is meant to
 * flag carries a comment EXPLAINING the rule, and those comments name
 * `useI18nLocale`, so the "does it subscribe?" test matched the prose and the
 * guard passed a file whose actual subscription had been deleted. Caught by
 * mutation-testing the guard itself.
 *
 * Deliberately conservative: whole block comments, and only lines that BEGIN
 * with `//` or a JSDoc `*`. A blunt strip-to-end-of-line on `//` would cut a
 * URL inside a string literal and could swallow a real `t(` call after it —
 * trading a false pass for a false miss.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n');
}

// Imports t or lookup (the render-time helpers). notify/notifyError are called
// from event handlers, long after the locale settled, so they are irrelevant.
const IMPORTS_RENDER_HELPER =
  /import\s*\{[^}]*\b(?:t|lookup)\b[^}]*\}\s*from\s*'@\/lib\/i18n-toast'/;
// Renders one inside JSX: {t(...)} or attr={t(...)}.
const RENDERS_IN_JSX = /\{\s*(?:t|lookup)\(|=\{(?:t|lookup)\(/;
// Any of the three subscriptions.
const SUBSCRIBES = /\buseTranslation\b|\buseLanguage\b|\buseI18nLocale\b/;
// memo(...) or React.memo(...) — the thing that blocks the cascade.
const IS_MEMOIZED = /(?:^|[^.\w])(?:React\.)?memo\s*\(/m;

const offenders = [];
for (const file of files) {
  const src = stripComments(readFileSync(file, 'utf8'));
  if (!IMPORTS_RENDER_HELPER.test(src)) continue;
  if (!RENDERS_IN_JSX.test(src)) continue;
  if (!IS_MEMOIZED.test(src)) continue; // the cascade reaches it
  // Subscription must be a CALL, so the import lines are excluded before this
  // test. Importing the hook and not calling it subscribes to nothing, and
  // matching the import made a commented-out call still count as a pass.
  const body = src.replace(/^\s*import\s[\s\S]*?from\s*'[^']*';?\s*$/gm, '');
  if (SUBSCRIBES.test(body)) continue; // it subscribes
  offenders.push(file);
}

if (offenders.length) {
  console.error('[i18n-subscriptions] FAIL\n');
  console.error(
    `  ${offenders.length} React.memo'd component(s) render catalog strings without\n` +
      `  subscribing to the locale. React.memo bails out on shallow-equal props, so the\n` +
      `  LanguageProvider re-render cascade cannot reach them and their text stays in the\n` +
      `  previous language while the rest of the page switches (VTID-03663).\n`,
  );
  for (const f of offenders) console.error(`    - ${f}`);
  console.error(
    `\n  Fix: add useI18nLocale() from '@/lib/i18n-toast' at the top of the component\n` +
      `  body. useTranslation() / useLanguage() also count.\n`,
  );
  process.exit(1);
}

console.log(
  `[i18n-subscriptions] OK — ${files.length} components render catalog strings; ` +
    `every memo'd one subscribes to the locale.`,
);
