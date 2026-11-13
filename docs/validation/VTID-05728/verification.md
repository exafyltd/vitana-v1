# VTID-05728 — Turkish empty strings (native-followups-20261111/translations)

- `src/i18n/tr/screens.json`: `screens.profile.dancePreferences` = "💃 Dans tercihleri" (same wording as `tr/toasts.json:865`, emoji kept as in de/en), `screens.sharing.stressLevels` = "Stres seviyeleri". Exactly two lines changed.
- New test `src/i18n/tr-screens-no-empty-values.test.ts`: 4 failed on base (`red-on-base.txt`), passes now.
- `npx vitest run src/i18n src/lib/commerce-terms.vtid-04895.test.ts src/components/commerce/PartnerTermsSheet.vtid-04909.test.tsx`: 6 files, 61 tests passed.
- No test asserts the old empty values. `src/i18n/de/**` and the two terms tests untouched.
- Not verified on staging: no read-only Turkish spec exists for these labels; covered by the tests above.
- vitana-v1 PR #1656 pins these two empty keys in a test; its pin list must drop them after this merges.
