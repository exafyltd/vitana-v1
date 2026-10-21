# VTID-05206 — New-member welcome, lane `new-member-card-optin`: "Introduce me to the community"

Plan: exafyltd/vitana-platform `.kiro/specs/new-member-welcome/`. It was sparred over 4 rounds, CONVERGED, and the owner approved it at Gate 1 on 2026-10-15 (plan hash `f7cdefc3043249c5`; owner decision D1 = default ON). The record is copied to `docs/validation/VTID-05206/plan-sparring.md`. Lane tasks B1–B4 are in `tasks.md`, and the design is in the plan block, Part B and S3.

The News Feed's "new member" card now appears only for newcomers who agreed to be introduced. The change sends nothing and posts nothing. The migration only adds a column, and it is applied after merge with `apply-vtid-05206-community-intro-opt-in-migration.yml` (manual dispatch).

AC-1 Migration (B1): `global_community_profiles.community_intro_opt_in boolean NOT NULL`. Every row that exists when the migration runs gets `false`. The default then becomes `true`, so every member who registers afterwards is introduced. `handle_new_user()` inserts `(user_id, display_name, is_visible)` only, and nothing deletes and re-inserts a row, so no member's choice is ever reset. The migration has no backfill and no change to policies, grants, triggers, REPLICA IDENTITY or the realtime publication. A self-check fails it, and rolls it back, if the column, REPLICA IDENTITY FULL, the `supabase_realtime` membership or the owner policy is wrong. It is one transaction, idempotent and re-runnable, and passes the PR-GATE migration lint.
TEST: src/lib/community-intro.vtid-05206.test.ts
TEST: docs/validation/VTID-05206/pglite-community-intro-check.mjs (17 checks, outputs/pglite-community-intro-check.txt)

AC-2 Who may change it: a member writes the setting on their own row through the existing owner policy "Users can manage their own global profile". A member cannot change another member's setting. NULL is rejected.
TEST: docs/validation/VTID-05206/pglite-community-intro-check.mjs

AC-3 Feed source (B2): both new-member listings ask the server for `community_intro_opt_in = true` next to `is_visible = true`. They are the All tab (`useAllNewsFeed.fetchNewsFeedCandidates`) and the Community tab (`useNewsFeed.fetchCommunityNews`). The All tab also skips any row whose value is not an explicit `true`. A failed new-members read shows no card, never an unfiltered list.
TEST: src/hooks/community-intro-feed.vtid-05206.test.ts
TEST: src/hooks/useAllNewsFeed.new-members.test.ts

AC-4 Settings off-switch (B3): Settings → Privacy → Profile visibility carries "Introduce me to the community". This applies to desktop, both the Spotlight and the legacy screen, and to the phone (`MobileSettings`, `?mode=privacy` / `privacy.visibility`). The switch shows the member's own value; a missing row shows as off. Switching writes only `community_intro_opt_in` on the member's own row. A failed save tells the member (`screens.settings.communityIntroSaveFailed`) and keeps the old state. The switch hides itself when the value cannot be read.
TEST: src/components/settings/CommunityIntroToggle.vtid-05206.test.tsx
TEST: src/pages/settings/__tests__/privacy-community-intro.vtid-05206.test.tsx
TEST: src/pages/__tests__/mobile-settings-privacy-phone.vtid-05096.test.tsx
UI: tests/e2e/staging/vtid-05206-community-intro.staging.spec.ts (phone, on and off, with screenshots)

AC-5 Registration step (B3): the name step of `/onboarding/welcome` (`OnboardingNameForm`) carries the same choice, on by default. Leaving it on writes nothing, because the new row already defaults to true. Switching it off saves `false`. A failed save never blocks finishing the step. The step therefore can never opt in a member who existed before the rollout.
TEST: src/components/onboarding/OnboardingNameForm.community-intro.vtid-05206.test.tsx

AC-6 Texts (B3): new keys `screens.settings.communityIntroTitle|Body|SaveFailed` and `onboarding.nameForm.communityIntroLabel|Hint` exist in all 11 locales (de, en, es, sr, fr, pt, ru, pl, zh, tr, ar). German uses du, never Sie, and the i18n register check passes in every locale (Portuguese in the você form). No German word is longer than 22 characters. The i18n audit reports the same 17,193 pre-existing errors as `main` and none on these keys.
TEST: src/lib/community-intro.vtid-05206.test.ts

AC-7 Regression: the full unit suite passes (443 files, 3,526 tests). The production build passes, with one chunk per lazy locale. `tsc` shows no new error (177 on head vs 178 on `main`). ESLint shows no new error in a touched file (OnboardingNameForm 20 = baseline; the three new raw-palette uses carry a `design-allow-next-line` reason).
TEST: src/hooks/useAllNewsFeed.new-members.test.ts
TEST: src/hooks/useNewsFeed.community-error-logging.test.ts

Decisions taken (inside the approved plan, most conservative option):
- **"Rollout" means the moment the migration is applied.** Rows that exist then get `false`; rows created afterwards get `true`. Read-only check 2026-10-16: 239 rows, 1 visible member joined in the last 7 days. That member's card disappears after the migration until they switch it on. This is the plan's "false for everyone else", taken literally.
- **Order: migration before deploy.** Before the column exists, both feed queries fail and the card shows for nobody (fail closed), and the Settings switch stays hidden. Nobody can opt out before the column exists, so showing no card is the conservative state. The staging spec answers the switch's read in the browser, so STAGING-VERIFY passes in either order.
- **The registration step writes only "no".** A member who registered before the rollout and still sees the name step will see the switch on but stay not introduced unless they switch it on in Settings. This mismatch is accepted so the step can never opt in a pre-existing member.
- **A missing row reads as not introduced** in the Settings switch, and the All tab skips any row whose value is not `true`.
- **Raw palette in the onboarding card.** The new block uses the same `border-gray-200` / `text-gray-700` / `text-gray-500` as the rest of that always-white card (`bg-white/95`). Each use carries a `design-allow-next-line` reason. Theme tokens would turn the text light-on-white in dark mode.
- **Types are hand-edited.** `src/integrations/supabase/types.ts` gains the column in Row, Insert and Update; that file is maintained by hand (it already lacks `avatar_offset_*`).
- **No stamp files changed.** The new keys report as "never stamped" until the translate workflow stamps them. `--check-all` stays green, as in the VTID-05133 precedent.
- **Not in this lane:** the gateway's server-side opt-in check for greeting DMs (lane `say-hello-composer`, VTID-05207).

Visual check: this sandbox cannot sign in to the app, so no screenshot was taken here. The staging spec writes `test-results/vtid-05206-community-intro-{on,off}-phone.png` during STAGING-VERIFY.
