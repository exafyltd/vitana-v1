# VTID-05210 — Vitana cards on the own profile: only profile-enriching cards, below the profile

Plan `profile-vitana-cards`, lane `frontend-placement` (Lane A). Owner request and Gate 1 approval on 2026-10-15.
Sparring: `plan-sparring.md` (CONVERGED, 2 rounds, plan hash `92964488a27e7401`). Frontend only. This lane adds no
i18n key, no route and no migration.

VALIDATION_PROFILE: frontend_ui

## Acceptance criteria

AC-1 (R1): `CARD_SCREENS.profile` is `{ server: 'profile', allow: [E1–E7, E11, G1], boost: ['G1'], features: [] }`.
  TEST: npx vitest run src/components/feature/feature-cards.test.tsx

AC-2 (R1): On the profile the carousel shows E1–E7 and E11 in server order and never E8, E9 or E10. The stacked half
is G1 only, with no Vitana Index (F2), Talk to Vitana (F4) or Invite (F7). No feature card reaches the profile,
whatever the server sends.
  TEST: npx vitest run src/components/vitana/EnrichmentCardStrip.profile.vtid-05210.test.tsx

AC-3 (R2): The member's profile comes first.
- Mobile: both strips sit in the Posts tab, after the ID card, the stats, the tabs and the Autopilot banner, and
  before the Cover Library tile and the posts.
- Desktop: both strips sit below `<ProfileLayout>`, before the Cover Library tile.
- Each layout mounts each strip once; G1 comes before the carousel.
  TEST: npx vitest run src/pages/EditProfilePage.card-placement.vtid-05210.test.ts

AC-4 (R3): Dismiss, auto-hide when complete and drawer-close refresh are unchanged. Every other screen's card list is
unchanged.
  TEST: npx vitest run src/components/vitana/ src/components/enrichment/ src/hooks/useProfileEditorDeepLink.test.tsx

AC-5 (R4): `PublicProfilePage` still mounts no card strip. This file is untouched by the lane.
  TEST: ! grep -n "EnrichmentCardStrip" src/pages/PublicProfilePage.tsx

AC-6 (staging, read-only): signed in as the test user on `/me/profile`, phone (390×844) and desktop (1440×900):
- the ID card is first;
- every strip comes after it;
- only profile cards appear, and G1 alone in the stacked half.
  TEST: tests/e2e/staging/vtid-05210-profile-card-placement.staging.spec.ts
