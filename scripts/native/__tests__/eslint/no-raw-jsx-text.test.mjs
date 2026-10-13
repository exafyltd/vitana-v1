// VTID-05157 — i18n/no-raw-jsx-text covers React Native's accessibilityLabel /
// accessibilityHint; the existing aria-label behaviour is unchanged.
import { test } from 'node:test';
import { RuleTester } from 'eslint';
import rule from '../../../../eslint-rules/no-raw-jsx-text.js';

RuleTester.describe = (name, fn) => fn();
RuleTester.it = (name, fn) => test(name, fn);
RuleTester.itOnly = (name, fn) => test(name, { only: true }, fn);

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-raw-jsx-text', rule, {
  valid: [
    { code: '<View accessibilityLabel={t("common.close")} />', filename: '/repo/apps/mobile/app/x.tsx' },
    { code: '<View accessibilityHint={t("common.close")} />', filename: '/repo/apps/mobile/app/x.tsx' },
    { code: '<button aria-label={t("common.close")} />', filename: '/repo/src/x.tsx' },
    { code: '<View accessibilityLabel="OK" />', filename: '/repo/apps/mobile/app/x.tsx' },
    { code: '<View testID="close-button" nativeID="close" />', filename: '/repo/apps/mobile/app/x.tsx' },
  ],
  invalid: [
    { code: '<View accessibilityLabel="Close" />', filename: '/repo/apps/mobile/app/x.tsx', errors: [{ messageId: 'jsxAttribute' }] },
    { code: '<View accessibilityHint="Opens the menu" />', filename: '/repo/apps/mobile/app/x.tsx', errors: [{ messageId: 'jsxAttribute' }] },
    { code: '<button aria-label="Close" />', filename: '/repo/src/x.tsx', errors: [{ messageId: 'jsxAttribute' }] },
    { code: '<Text>Hello there</Text>', filename: '/repo/apps/mobile/app/x.tsx', errors: [{ messageId: 'jsxText' }] },
  ],
});
