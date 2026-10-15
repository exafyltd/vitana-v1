# VTID-05212 — Vitana card actions that work

Plan `profile-vitana-cards`, lane `card-actions` (Lane C). The owner asked on 2026-10-15 that every action button in
every Vitana card actually work, and approved the plan at Gate 1. Sparring record: `plan-sparring.md` (CONVERGED, 2
rounds, plan hash `92964488a27e7401`). The sparring decisions that bind this lane are G1 reading only the cached profile
list, F4's ORB-first logic living once in `TalkToVitanaCard`, and C5 adding `?return=mobile`.

Frontend only. No new i18n key (Instagram and Facebook are brand names in the bounce overlay), no new route, no
migration. The deep links for F4 and E8/E9 change; every target is an existing route that is in the screen registry.

VALIDATION_PROFILE: frontend_ui

## Acceptance criteria

AC-1 (C1): G1 "Complete your profile" opens the first open profile step from the cached `screen=profile` list. It falls
back to `/me/profile#about` when the list is uncached or has no editor step. On `/me/profile` the tap opens the editor,
again on a second tap. The old behaviour was to navigate to the page the member was already on.
  TEST: npx vitest run src/components/vitana/card-actions.vtid-05212.test.tsx -t "C1"

AC-2 (C2): F4 "Ask Vitana" opens the ORB (`activateOrb()`). Without the widget it opens `/comm/talk-to-vitana`, not
the `/assistant` settings page. It behaves the same inside a chat.
  TEST: npx vitest run src/components/vitana/card-actions.vtid-05212.test.tsx -t "C2"

AC-3 (C3): E8 and E9 open `/connectors?tab=productivity#calendar` and `#contacts`. The page scrolls to the Mail,
Calendar & Contacts section on desktop and on mobile, and consumes the hash, so the link works again.
  TEST: npx vitest run src/hooks/useHashScroll.vtid-05212.test.tsx

AC-4 (C4): F8 "Did you know" never stays disabled when the tip has no destination. It sends no second, contradicting
decline.
  TEST: npx vitest run src/components/vitana/card-actions.vtid-05212.test.tsx -t "C4"

AC-5 (C5): Instagram/Facebook connect inside Appilix sends `?return=mobile`, shows the bounce overlay and polls until
the connection appears. A completed connect re-reads the card lists. Nothing changes in a browser. The gateway already
honours `return=mobile` for every provider through the signed OAuth state (`routes/social-connect.ts`
`buildCallbackRedirect`).
  TEST: npx vitest run src/hooks/useGoogleConnect.social-appilix.vtid-05212.test.tsx

AC-6 (C6): every registry card's button has a click test, both standalone and inside `VitanaChatCard`. Each test
asserts either the deep link or the card's own action.
  TEST: npx vitest run src/components/vitana/card-actions.vtid-05212.test.tsx src/components/enrichment/ src/components/feature/feature-cards.test.tsx src/components/vitana/card-deeplinks.test.ts

AC-7 (C7, staging, read-only), on a phone and a desktop viewport:
- the E8/E9 deep links land on the section;
- G1 on `/me/profile` opens an editor (when the server shows G1 to the test user).

The per-card result matrix is in `card-actions.md`.
  TEST: tests/e2e/staging/vtid-05212-card-actions.staging.spec.ts
