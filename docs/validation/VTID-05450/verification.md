# Verification — VTID-05450 (native-wave2-public-auth-onboarding-r3 / onboarding)

Native Wave 2 onboarding lane: `/onboarding/welcome`. All commands run offline (the native
app has no production profile; `assertNotProduction()` refuses prod/staging hosts). No auth
write; the form's profile writes run only against the fake Supabase double. Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-public-auth-onboarding-r3-onboarding`.
**Stacked on VTID-05449** (auth-portals, PR #1554): the branch is based on
`origin/kiro/native-wave2-public-auth-onboarding-r3/auth-portals` 55ff278ae and must land after
it. Every command and its counts: `commands.log`.

## What was built

- `apps/mobile/app/(app)/onboarding/welcome.tsx` → `OnboardingWelcomeScreen`, twin of the
  mobile-web branch of `src/pages/onboarding/OnboardingWelcome.tsx` (App.tsx:837, AuthGuard).
  It sits in the `(app)` group, so the AuthGate guards it (signed out →
  `/maxina?redirectTo=%2Fonboarding%2Fwelcome`). No other `app/` file matches the path, so
  Expo Router resolves it on a cold start ahead of the `(app)/[...path]` resolver. One-segment
  `(public)/[tenantSlug]` cannot match a two-segment path.
- Phases `speech → form → start`, as on the web:
  - **speech**: "Welcome to Maxina", "Your longevity journey begins now", then Vitana's 7
    bubbles (`screens.onboarding.speech*`). The first appears after 800 ms, each next one after
    3 s + 12 ms per character (at most 4 s extra). A typing indicator shows while more are
    coming, and "Skip intro" shows them all. The form opens 2 s after the last bubble, or
    600 ms after a skip.
  - **form** (`OnboardingNameForm`): the display name is pre-filled from the sign-up
    `full_name` / `name`. The handle is suggested from the name until the member types one.
    The handle is cleaned to a-z 0-9 _ (max 30) and needs at least 3 characters ("At least 3
    characters" below that). Its availability is checked 400 ms after the last keystroke: taken,
    the member's own handle, available, or invalid. "Introduce me to the community" is on by
    default; only an explicit "no" is written (VTID-05206). Submit is enabled with a name of
    2+ characters and a valid, non-taken handle that is not still being checked. Saving
    upserts `profiles` (`onConflict: user_id`) and mirrors `app_users.display_name`
    (non-fatal). An off switch writes `global_community_profiles.community_intro_opt_in =
    false`, and the device flag `vitana_onboarding_completed` is set. A unique-handle
    conflict (23505) marks the handle taken; any other failure shows the server's message,
    or the catalog line when there is none.
  - **start**: if `redirectTo` is set it wins; otherwise "Your audiobook is ready" shows,
    with "Play Episode 1" → `/autopilot?audiobook=play` and "Later" → `/home`.
- Already onboarded (the device flag, or a profile with both name and handle) → straight to
  `redirectTo` or `/home`, with the form skeleton showing during the check. An incomplete
  profile or a failed query shows onboarding (the web's safer default).
- Seam reused: `postSignInTarget` (auth-portals `src/auth/sign-in.ts`) →
  `/onboarding/welcome[?redirectTo=]` now resolves `native` (`NATIVE_ROUTES`). The session
  comes from the native `AuthProvider`. Neither auth-portals file is edited.
- `src/screens/onboarding/onboarding-data.ts` re-implements the class-B web modules
  `useOnboardingStatus.ts`, the `OnboardingNameForm.tsx` queries and `community-intro.ts`
  natively, using the same tables, columns and order. No core change.
- `src/ports/onboarding.tsx` is the lane's port: the kit's Switch, useReducedMotion and
  withAlpha, token colours (`category-2/4`, `ruby`, `status-success/error`) and four lucide
  icons.
- `src/i18n/*/onboardingNative.json` adds 3 keys: the "V" avatar initial and the two error
  sentences the web hardcodes in English. DE first in du-form, then the other ten (fr tu,
  ru ты, pt você). Every other string reuses the web keys `screens.onboarding.*`,
  `onboarding.skipIntro`, `onboarding.nameForm.*` and `common.loading`.
- Ledger: `/onboarding/welcome` → `native`.

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/onboarding --ci` → PASS, 2 suites / 76 tests.
- `npm test -- --ci` → PASS, 86 suites / 2455 tests, 57 snapshots.
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS (up to date).
- `npm run parity:check` → PASS (435 rows, 36 native routes); `--sync` → no change.
- `core-closure --check`, `gen-core-extract --check`, `gen-tokens --check`,
  `check-shell-pins`, `node --test scripts/native/__tests__` → all up to date / pass.
- ESLint on the lane files → clean.
- i18n (repo root, the `i18n-check.yml` checks): register, long words, subscriptions,
  stamp-source, locale registry, and locale chunking (after `npm run build`) pass. The
  report-only audit shows the same error total with and without the 11 new shards, so the
  lane adds 0 errors. `npx vitest run src/i18n scripts/native` → 3 files / 25 tests pass.
- Red → green: see `red-on-base.txt`. On origin/main both suites fail, and a probe of the
  seam, route, ledger and shard behaviours fails 5/5.
- Preflight: see `commands.log`. Against `--base origin/main`, the only reds come from the
  stacked #1554 diff: two lanes' commits plus auth-portals' files in the range. Against the
  auth-portals base, the only red is "lane file not found", because the preflight's
  `gh api` read of vitana-platform got HTTP 403 in this sandbox. The lane file is on
  vitana-platform `main`.

## Not verified on staging

Device runtime is deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`):
Maestro journeys and simulator / emulator screenshots vs the 390×844 read-only staging
`/onboarding/welcome` (signed in).

## Deviations from the web (each also in the file header)

- **Shell chrome**: the web page is outside AppLayout, so it has no top bar, no bottom bar,
  and it hides the ORB FAB itself. The `(app)` layout wraps every screen in the member shell
  (`_layout.tsx` is not in this lane's paths), so the screen presents itself full screen
  with an RN `Modal` over the shell.
- **Intro video**: the web plays the daily `getIntroVideoSrc('maxina')` video. The native app
  ships no video player (`expo-video` would be a new dependency outside this lane's paths).
  The scrim is drawn over the page background without the video, as auth-portals' backdrop
  does. The `dark` scope the web uses for legibility over the video is therefore not needed.
- **Gradients**: `from-category-4 to-category-2` (avatar, submit) and
  `from-ruby to-category-2` (headphones) render in their first token colour. The app ships no
  gradient library.
- **Audiobook**: native has no `AudiobookPlayerProvider` yet, so "Play Episode 1" takes the
  web's own fallback route `/autopilot?audiobook=play`, which is unported today and renders
  Unported.
- **`redirectTo`**: native keeps only in-app paths (no scheme, no `//host`). It also drops
  a redirect back to `/onboarding/welcome`: the AuthGate's `redirectTo` would otherwise make
  the finished form navigate to itself.
- **Completion flag** lives in device storage (AsyncStorage) instead of `localStorage`, under
  the same key and value.
- **Typing dots** are static (the web bounces them). The bubbles fade and slide in, except
  under reduce motion.
