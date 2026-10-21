# VTID-05308 — stale-tests, T1 (vitana-v1): ConversationView deeplink-scroll

## The permanently-red suite
`src/components/messages/ConversationView.deeplink-scroll.vtid-05201.test.tsx`
(runs in the vitest `test:unit` job). Red on `origin/main`.

## Current contract the changed line now matches
The real `@/lib/i18n-toast` module (src/lib/i18n-toast.ts:34) exports
`getI18nLocale(): string`, returning a BCP-47 locale. `@/lib/locale-format`
(src/lib/locale-format.ts:16, 56) imports and calls it inside `currentBcp47()`,
which every `formatDate`/`fmtDate`/`fmtNumber` helper uses. `ConversationView`
renders day dividers with `formatDate(messageDate, 'd MMMM')`
(ConversationView.tsx:1124). So any test that renders `ConversationView` must
provide `getI18nLocale` on its `@/lib/i18n-toast` mock, or the component throws
before the behaviour under test runs.

## Fix (cause, not symptom)
Added `getI18nLocale: () => 'de-DE'` to the test's `@/lib/i18n-toast` mock
(the module's own default locale). The behavioural assertion is unchanged:

```
expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
```

The deep-link effect (ConversationView.tsx:466-481) finds the `#msg-<id>`
wrapper div (rendered by ConversationView itself at :1136, not inside the
mocked `MessageBubble`) and calls `scrollIntoView` with exactly those options.

## No weakening
- Test cases: 1 → 1. `expect()` calls: 1 → 1. `.skip/.only/.todo`: 0 → 0.
- PR-GATE `evaluateWeakening` (scripts/ci/pr-gate/lib.mjs:184) passes with no
  exemption.
