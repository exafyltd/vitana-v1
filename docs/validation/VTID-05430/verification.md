# Verification — VTID-05430 (native-wave2-profile-settings-r2 / public-profile)

Native Wave 2 public-profile lane: `/u/:identifier` (PROFILE.PUBLIC, PROFILE.WITH_MATCH) and the
legacy `/profile/:id` redirect, both in the `(public)` group (plan decision 1b). All commands run
offline (the native app has no production profile; `assertNotProduction()` refuses prod/staging
hosts). Linux, worktree `/projects/sandbox/vitana-v1/.worktrees/native-wave2-profile-settings-r2-public-profile`.
The exact commands and counts are in `commands.log`.

## What was built

- `apps/mobile/app/(public)/u/[identifier].tsx` → `src/screens/public-profile/PublicProfileScreen.tsx`
  — twin of `src/pages/PublicProfilePage.tsx`. Picks the shell by session (`MobileAppShell` signed
  in, `PublicShell` signed out, after the same auth wait `AuthGate` makes). States: loading
  (`screens.publicprofilepage.loadingProfile`), not found / load error ("User Not Found" + Return to
  Home → `/`), alias redirect (replace → `/u/<canonical>`), found → landing or member view.
- `src/screens/public-profile/data/profile.ts` — native re-implementation of the page's
  `fetchProfile` (class B on web): `get_user_profile_by_identifier` (leading `@` stripped), the
  VTID-01967 `handle_aliases` → `profiles` fallback, `get_public_vitana_index`, public
  `profile_milestones` / `profile_gallery` as secondary data whose failure never drops the profile,
  the web's 10 s bound per request; plus the read half of `useProfilePosts`. Keyed on the
  identifier only (as the web effect). Reads only.
- `PublicProfileLanding.tsx` — twin of `PublicProfileLanding` (signed out or `?utm_source=profile`):
  cover, avatar, name, @handle, VITANA Index pill, location, bio, social links, Follow / Message →
  `/maxina?redirectTo=/u/<handle>`, stats strip, top 3 milestones, top 6 photos, View Full Profile,
  "Powered by VITANA".
- `PublicProfileMemberView.tsx` — twin of the mobile branch of `ProfileLayout` for a signed-in
  visitor: identity card, sticky Posts / About / Media / Groups tabs (`profileTabs.*`), posts
  (About card + posts list), bio + milestone timeline, photo gallery, groups (top 3 → `/comm/groups/:id`,
  View all, Discover). Groups come from the community-hub lane's native `useUserGroups` through the
  new `src/ports/user-groups.ts` (the `ports/news-card.ts` pattern).
- `apps/mobile/app/(public)/profile/[id].tsx` → `LegacyProfileRedirectScreen.tsx` +
  `legacy-redirect.ts` — the web rule verbatim (legacy id table, UUID, clean handle) → `<Redirect>`
  to `/u/…`; anything else → the app's not-found screen. Same signed in and out.
- `src/ports/ui.tsx` — icons `ExternalLink`, `Globe`, `MapPin`, `Music2`, `UserPlus` added to the
  one icon port.
- `src/i18n/*/publicProfileNative.json` — 11 new keys, DE first (du-form), mirrored to all 11
  locales (pt você, fr tu, ru ты, ar). Existing web keys reused: `screens.publicprofilepage.*`,
  `publicProfile.*`, `screens.profile.*`, `gallery.*`, `milestones.*`, `profileTabs.*`,
  `profilePosts.*`, `profileGroups.*`, `editProfile.about`.
- `apps/mobile/parity/ledger.json` — `PROFILE.PUBLIC`, `PROFILE.WITH_MATCH`, `/profile/:id`
  `not_started` → `native`.
- `apps/mobile/maestro/public-profile/README.md` — the G1 device-runtime flows (deferred).

## Red → green

`docs/validation/VTID-05430/red-on-base.txt`: the new tests on `origin/main` a41e89a0d fail (2
suites, the screen modules do not exist). After the implementation: `npx jest tests/public-profile`
34/34 pass.

## Deviations from the spec (recorded, not silent)

1. **`?match_intent=` highlight.** tasks.md says the screen includes "the `?match_intent=`
   highlight". The web page and every component it renders read no `match_intent` param (only the
   `screens.json` route `PROFILE.WITH_MATCH` names it), so on web the variant renders the same
   profile. The native screen does the same (test "PROFILE.WITH_MATCH"); adding a highlight the web
   does not have would break R1.1 (no added section).
2. **Read-only member view.** The lane is specified read-only. These write or gateway surfaces of
   the signed-in web layout are not ported in this lane and are left for a follow-up: Follow /
   Message (+ compose modal), share sheet + QR screen, post likes / comments, the video and music
   galleries, the Business card side and the full `MobileIdentityCard` back side, and the page's
   gateway sections (`WhyThisMatchCard` for `from=who_search`, Dance / Partner preferences /
   Service offerings / MyPosts).
3. **Brand icons.** lucide-react-native 1.48 ships no brand glyphs, so the social links draw
   `Globe` (TikTok keeps `Music2` as on web), labelled with the network name.
4. **Owner viewing their own `/u/` page** sees the public milestones / gallery (the page's own
   reads), not the owner-only private rows `useProfileMilestones` / `useProfileGallery` would add.

## Not verified on staging

Device runtime is deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`).

## Pre-existing red on main (not this lane)

NATIVE-CI "Parity ledger, core/tokens generators + native script tests" fails on `main`
(runs for 035800a7d and later) at `gen-core-extract --check`: the `feed-compose` / `news-feed-ranker`
extract headers carry a stale source sha. This lane does not touch `packages/core/**`.
