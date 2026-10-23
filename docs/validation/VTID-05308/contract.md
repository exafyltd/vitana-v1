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

## Reconciliation with main (VTID-05313) — merge of origin/main into this lane
While this lane was open, `origin/main` landed the SAME root-cause fix under
VTID-05313 — confirming the diagnosis above — in a more robust form:
- it keeps the real `@/lib/i18n-toast` via `vi.mock(..., async (importOriginal)
  => ({ ...(await importOriginal()), t, notify, notifyError }))` instead of
  hardcoding `getI18nLocale: () => 'de-DE'`, so every other real export
  (not just `getI18nLocale`) stays live for the date divider; and
- it makes the fixture timestamps relative to `now` (`NOW_ISO`) so the day
  divider never ages into a different code path over time.
On merging origin/main, the lane takes main's version of
`ConversationView.deeplink-scroll.vtid-05201.test.tsx` verbatim (the merged
blob is byte-identical to `origin/main:` that file, and `ConversationView.tsx`
is likewise identical to main). T1's objective — the VTID-05201 suite green at
the cause with nothing deleted or weakened — is therefore satisfied by the
merged tree, which runs exactly main's already-green required suite. The lane's
competing one-line mock edit is dropped in favour of main's superset fix; no
behaviour is changed beyond the converged plan.
