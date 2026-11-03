# VTID-05475 — welcome-finish-r2, lane `explicit-intro-choice`: community introductions are an explicit choice

Plan: exafyltd/vitana-platform `.kiro/specs/welcome-finish-r2/`. Sparred over 2 rounds, CONVERGED, policy-approved
(`converged-auto-v1`, final plan hash `be1e29771527a2f52bacac3a8a248bf11b35c4ffaa38738f49b6c6edd47d3ecd`). The record is
copied to `docs/validation/VTID-05475/plan-sparring.md`. Owner decision (supersedes VTID-05206 D1) in
`docs/validation/VTID-05475/owner-decision.md`. Lane tasks D1–D6 are in `tasks.md`.

Owner decision 2026-10-30 (final): nobody is publicly introduced — no News Feed "new member" card, no Say Hello
eligibility — until they actively choose "Yes, introduce me 👋". The change sends nothing and posts nothing. The
migration adds a column, flips the default and backfills recorded-choice-free rows; applying it is an owner stop
(`apply-vtid-05475-community-intro-explicit-choice-migration.yml`, manual dispatch).

AC-1 Migration: adds `global_community_profiles.community_intro_choice_at timestamptz NULL` (the explicit-choice
marker), sets `community_intro_opt_in` DEFAULT false, and backfills rows WITHOUT a recorded choice
(`community_intro_choice_at IS NULL AND community_intro_opt_in`) to false. Rows with a recorded choice (marker set)
are never touched — explicit yes and explicit no are preserved; the 251 pre-rollout rows are already false. A
self-check captures the recorded-choice count before the backfill in a temp table and fails (rolls back) if any
recorded choice changed, if any unmarked row is still introduced, if the column shapes are wrong, or if REPLICA
IDENTITY FULL, the supabase_realtime membership or the owner policy moved. One transaction, idempotent, re-runnable,
passes the PR-GATE migration lint. NOT executed anywhere (owner stop, §7d).
TEST: src/lib/community-intro.vtid-05206.test.ts (PR-GATE migration lint, exported helper)
TEST: docs/validation/VTID-05475/pglite-community-intro-choice-check.mjs (22 checks, outputs/pglite-community-intro-choice-check.txt)

AC-2 Backfill preserves recorded choices and is R2-F1-honest: an explicit-yes row stays true, an explicit-no row stays
false, a pre-migration-window true row with no marker is set to false, a second run is a no-op, and before/after counts
match the migration's own self-check. The window-opt-in revert is disclosed in owner-decision.md.
TEST: docs/validation/VTID-05475/pglite-community-intro-choice-check.mjs

AC-3 Backward-compatible write (sparring R1-F1): `setCommunityIntroOptIn` writes BOTH `community_intro_opt_in` and
`community_intro_choice_at`. On a PGRST204 or 42703 error naming `community_intro_choice_at` (migration not applied
yet) it retries ONCE writing only `community_intro_opt_in`, so the Settings toggle and registration keep working. Any
other error (including a PGRST204 that does not name the marker column) is thrown and NOT retried.
TEST: src/lib/community-intro.explicit-choice.test.ts

AC-4 Registration step (`OnboardingNameForm`): the name step offers two explicit choices as a labelled radio group
(`role="radiogroup"`, each option `role="radio"`, keyboard-accessible with a visible focus ring, tap target min-h-11 =
44px), NEITHER pre-selected. Choosing "Yes, introduce me 👋" records opt-in true (+ marker, via the lib); "Not now"
records false (+ marker); submitting with NO choice records nothing and still completes registration. canSubmit does
not require a choice, and a failed write never blocks finishing. The Yes label keeps the 👋 emoji.
TEST: src/components/onboarding/OnboardingNameForm.community-intro.vtid-05206.test.tsx

AC-5 Settings off-switch (`CommunityIntroToggle`): the switch is off until the member chooses Yes (reads
`getCommunityIntroOptIn`, false until chosen). Every toggle — on AND off — records the choice via
`setCommunityIntroOptIn`, which now writes both columns, so a withdrawal is an explicit false + marker. A failed save
tells the member and keeps the old state; the switch hides itself while loading or when the value cannot be read. It
is mounted on desktop Spotlight, the legacy screen and phone MobileSettings.
TEST: src/components/settings/CommunityIntroToggle.vtid-05206.test.tsx
TEST: src/pages/settings/__tests__/privacy-community-intro.vtid-05206.test.tsx
TEST: src/pages/__tests__/mobile-settings-privacy-phone.vtid-05096.test.tsx
UI: tests/e2e/staging/vtid-05475-community-intro-choice.staging.spec.ts (phone, read-only, switch OFF, never flipped)

AC-6 Texts: new keys `onboarding.nameForm.communityIntroQuestion|communityIntroYes|communityIntroNo` exist in all 11
locales (de, en, es, sr, fr, pl, pt, ru, tr, zh, ar), DE first, du-form (pt in the você form). The Yes label keeps the
👋 emoji in every locale. The existing `communityIntroLabel|Hint` keys are unchanged. German uses du, never Sie. No
stamp files changed — new keys report "never stamped" and `i18n:stale --check-all` stays green (VTID-05206 / VTID-05133
precedent). Every user-visible string goes through `translate()`; no raw JSX text.
TEST: src/lib/community-intro.vtid-05206.test.ts (per-locale key presence + du/Sie check)

AC-7 Types + regression: `src/integrations/supabase/types.ts` gains `community_intro_choice_at: string | null` in
Row/Insert/Update (hand-maintained file). The changed vitest files pass (41 tests, outputs/vitest-green.txt), captured
red-on-base first (11 failures, outputs/red-on-base.txt). `tsc --noEmit` shows 0 errors (outputs/tsc.txt). The
production build passes (outputs/build.txt). ESLint on the touched source shows only the one pre-existing
`@typescript-eslint/no-explicit-any` in OnboardingNameForm (a base-branch baseline error, not added here); the new
radiogroup uses a `design-allow-next-line` for its always-white-card palette and `min-h-11` (a scale token, not an
arbitrary size).
TEST: src/lib/community-intro.explicit-choice.test.ts
UI: tests/e2e/staging/vtid-05475-community-intro-choice.staging.spec.ts

Decisions taken (inside the approved plan, most conservative option):
- **No pre-selected answer.** The registration radio group starts with neither option checked; skipping never blocks
  registration and leaves opt-in false (the migration default). This matches the plan and owner-decision.md.
- **The marker is a new nullable column**, not a `updated_at > created_at` heuristic — an explicit, auditable record of
  a choice, per the owner's conservative choice in §8.0.
- **Migration ships as a file; applying is an owner stop (§7d).** The code is backward-compatible (PGRST204/42703 →
  retry with opt-in only), so the Settings toggle and registration keep working before and after the apply. New signups
  keep the pre-migration default until the apply; stated in the PR and owner-decision.md.
- **R2-F1 revert is disclosed, not engineered around.** The backfill reverts a marker-less window opt-in; the small,
  bounded blast radius is accepted (owner-decision.md), not worked around with added complexity.
- **Raw palette in the onboarding card** keeps the VTID-05206 pattern: the explicit light palette carries a
  `design-allow-next-line` reason; theme tokens would be light-on-white in the always-white card.
- **No stamp files changed**, matching the VTID-05206 precedent; `i18n:stale --check-all` stays green.
- **Types are hand-edited**, matching the VTID-05206 precedent for this file.

Visual check: this sandbox cannot sign in to the app, so no screenshot was taken here. The staging spec writes
`test-results/vtid-05475-community-intro-off-phone.png` during STAGING-VERIFY.
