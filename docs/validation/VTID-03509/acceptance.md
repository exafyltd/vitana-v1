# VTID-03509 — staging suite for translation propagation commits

The i18n workflow commits `chore(i18n): propagate source change to all
languages (VTID-03509)` straight to `main` as github-actions[bot]. STAGING-VERIFY
(rule 47) fails any range containing a commit whose VTID has no
`staging-tests.json`, so every such bot commit blocked the next community-app
verification (measured: run 36482249511, 8/8 tests passed, failed only on
"Missing change suite … 4feb8ffa37d3 VTID-03509").

This suite covers every bot commit under that VTID:

- AC-1: every locale directory on disk is registered in `src/i18n/index.ts`.
  TEST: npx vitest run src/i18n/locale-registration.test.ts
- AC-2: source stamps and flags stay consistent.
  TEST: npx vitest run src/i18n/stamp-flag-contract.test.ts
- AC-3: the staging build is served.
  CURL: GET preview-aws.vitanaland.com/ → 200 with the app root
