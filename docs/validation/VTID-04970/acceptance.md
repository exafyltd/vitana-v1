# VTID-04970 — consent screen shows the redirect host; "Connect with ChatGPT" button

Owner decision 2026-10-08 (Gate 1, ChatGPT plugin plan); sparring record in `plan-sparring.md` (copy of the platform repo's `docs/validation/VTID-04968/plan-sparring.md`, plan hash inside).

VALIDATION_PROFILE: frontend

AC-1: The Commerce connect consent screen shows the host the assistant's code is delivered to (from the client's registered redirect URI) above the Approve / Deny buttons, in all 11 shipped locales; nothing shown for a missing or non-web redirect.
  TEST: src/lib/commerce-mcp.test.ts
  TEST: src/components/commerce/connect-authorize.vtid-04970.test.ts
AC-2: "Connect with ChatGPT" appears on the guest landing only when `VITE_CHATGPT_PLUGIN_URL` is an https link on an OpenAI host; otherwise the page is unchanged and the manual connect flow stays the way in. The button opens the link in a new tab with `noopener noreferrer`.
  TEST: src/lib/commerce-mcp.test.ts
  TEST: src/components/commerce/connect-authorize.vtid-04970.test.ts

## Decisions taken
- No What's New card: this is a supplier-only landing button, not a member feature.
- The link is a build-time constant, set once OpenAI approves the plugin and gives us the listing URL.
- The label is a translated string in all 11 locales (du-form where the language has one).

## Not in this VTID
The reviewer sandbox, the plugin package and submission.
