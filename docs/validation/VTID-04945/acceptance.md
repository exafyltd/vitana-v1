# VTID-04945 — Commerce connector listing assets (item 5 of 7)

Owner instruction 2026-10-07 ("item 5 move ahead"). Sparring: `plan-sparring.md`.
Not part of this VTID: the directory submission itself, the reviewer account, any gateway change.

VALIDATION_PROFILE: community_app

ROUTE_MOUNT: /commerce/connect and /commerce/connect/privacy (public, no sign-in).

FINAL_URL: https://preview-aws.vitanaland.com/commerce/connect (staging build); production https://vitanaland.com/commerce/connect after PUBLISH.

CURL_PROOF: n/a (single-page app; proven by the staging Playwright spec).

OASIS_PROOF: n/a (static pages, no state change).

## Acceptance criteria

AC-1: A signed-out visitor opens /commerce/connect, sees the connection address ending in /mcp and the nine tools, with a link to the privacy notice, and no horizontal overflow at 1400 and 390 px.
  TEST: tests/e2e/staging/vtid-04945-commerce-connect-docs.staging.spec.ts
AC-2: /commerce/connect/privacy is public and has one contact link and a link to the full privacy policy.
  TEST: tests/e2e/staging/vtid-04945-commerce-connect-docs.staging.spec.ts
AC-3: German and English catalogs carry the same keys, German keeps the du-form, every listed tool is described, and the page promises nothing the connector does not do (no payments, no passwords, drafts only, terms accepted on Vitanaland).
  TEST: src/pages/CommerceConnectDocs.test.tsx
AC-4: The tool list shown to users equals what the gateway serves.
  TEST: src/lib/commerce-mcp.test.ts
