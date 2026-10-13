# VTID-05136 — Commerce manual flow: honest setup screen + submit / resubmit

Owner goal (2026-10-07): a supplier can go from registration to go-live readiness on the web, not only through the AI
assistant. "Get ready to sell" (`src/components/commerce/SetupHub.tsx`) showed EXAFY "Complete verification — Needs
your attention" although its verification was done, and the web app had no way to submit or resubmit.
Frontend only; the gateway contract (`POST /api/v1/partner-onboarding/:orgId/submit`) is unchanged.

- AC-1: the verification row follows the checklist's verification step (first match wins): done → done; failed →
  attention; todo with a reviewer note → attention; in_progress → in review; lifecycle submitted/verifying → in review;
  rejected → attention; otherwise to do. Without a checklist the old lifecycle mapping applies.
- AC-2: when the business is not live, "Still needed" lists the required steps the server reports as todo or failed,
  in plain words. `complete_offering` has its own static label. done / in_progress / not_required are never listed.
- AC-3: a reviewer's request-changes note shows on the verification row as plain text.
- AC-4: Submit (draft) / Resubmit (needs_action) is shown only when the server says `submit_ready`; it opens a confirm
  dialog; confirming sends exactly one POST (button disabled while it runs); the hub then shows the state the server
  returned (live / needs changes / in review / unchanged). Any error shows "couldn't submit" and reloads the hub, whose
  fresh checklist drives "Still needed". Hidden for submitted, verifying, live, rejected and exception.
- AC-5: all copy in every shipped locale (DE first, du-form); logical classes only (RTL); design tokens only.
- AC-6: no What's New card (supplier-admin only; plan F6).

Tests:
- Vitest rules: `src/components/commerce/SetupHub.test.ts`.
- Vitest whole flow with a mocked `adminFetch` (no network, no DB): `src/components/commerce/SetupHub.vtid-05136.test.tsx`.
- Staging, read-only: `tests/e2e/staging/vtid-05136-setup-hub-submit.staging.spec.ts` — demo business served in the
  browser, Resubmit opens the dialog, Cancel; the submit route is aborted and the spec asserts no request was sent.

Decisions taken (inside the approved plan):
- A submit with no lifecycle transition (the server's review-sandbox path, VTID-04971) shows "Received. Your status has
  not changed." rather than "submitted"; the result is decided from the response's `transitions`, so a resubmit that
  ends in needs_action again still reads "needs changes".
- An unknown checklist step key is still listed in "Still needed", with a generic "One more step" label.
- The submit response (same shape as GET) updates the hub directly; products/shop facts are kept from the last load.
