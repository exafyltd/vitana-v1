# VTID-04911 — Acceptance (vitana-v1 part)

The staging fixture `tests/e2e/staging/fixtures/partner-terms-2026-10-draft.json` is regenerated from the final
v1 text in exafyltd/vitana-platform `docs/legal/partner-terms/2026-10` (platform PR #3928, same VTID): all 11
languages carry `legal@vitanaland.com` in §21.1 and no `FINAL LEGAL COUNSEL` marker or placeholder. No app code
changes. The plan-sparring record lives in the platform repo at `docs/validation/VTID-04911/plan-sparring.md`
(converged, plan hash `cf9344a3fc2bf09ecd25a024db9e98a67eaed4666915f2b077ac1d9d591d3c93`).

AC-1 — the spec's assertions (title, `Supplier ID` in Arabic, lang/dir, checkbox/Accept state) still hold on
the final text. TEST: tests/e2e/staging/vtid-04909-partner-terms-language.staging.spec.ts
