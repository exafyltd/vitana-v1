# Lane brief — VTID-05429 (native-wave2-profile-settings-r2 / profile)

Spec: `exafyltd/vitana-platform` `main` → `.kiro/specs/native-wave2-profile-settings-r2/`
(`plan.md` plan block and `tasks.md` `<!-- lane: profile -->` are authoritative;
`requirements.md`, `design.md`, `lanes/profile.md`). Session
`kiro-exafyltd-202611011658-9f52` (Kiro Web, seat exafyltd), reviewer seat hotmail.

## Scope (2 ledger rows → 2 route files)

| Row | Web source (mobile branch) | Native route | Screen |
|---|---|---|---|
| `PROFILE.ME /me/profile` | `src/pages/EditProfilePage.tsx` | `apps/mobile/app/(app)/me/profile.tsx` | `src/screens/profile/MyProfileScreen.tsx` |
| `PROFILE.PRIVACY /profile/me/privacy` | `src/pages/PrivacySettings.tsx` | `apps/mobile/app/(app)/profile/me/privacy.tsx` | `src/screens/profile/PrivacyScreen.tsx` |

Not in this lane (sparring round 1/2, plan decisions 1a/1b): `/u/:identifier`
(+`?match_intent=`) and `/profile/:id` → lane `public-profile`; `/delete-account` →
lane `delete-account`. `lanes/profile.md` still lists `(app)/u/[identifier].tsx` and
`(app)/profile/[id].tsx`; per `plan.md` those path entries create nothing.

## Decisions taken

1. **No `@vitana/core` change** (plan decision 2). The web hooks behind these screens
   (`ProfileProvider`, `useProfileStatsCount`, `useProfileMilestones`,
   `useProfileGallery`, `useUserGroups`, `useProfilePosts`, `useFollow`,
   `useVitanaIndex`, `useMyRecommendations`) are class B and are re-implemented in
   `src/screens/profile/data/profile.ts` against `getSupabase()` / `getGateway()` with
   the same tables, columns, filters and query keys. The only core use is the
   type-only `@vitana/core/types` re-export through the new port
   `src/ports/profile.ts` (`AccountFieldKey`, `AccountVisibility`, `FieldVisibility`).
   `DEFAULT_ACCOUNT_VISIBILITY` is a value, so it has a native twin pinned to the web
   constant by `tests/profile/data.test.ts`.
2. **Writes are built, then sent.** Each web drawer save maps to a pure builder
   (`buildIdentityUpdate`, `buildAboutUpdate`, `buildAccountUpdate`,
   `buildVisibilityUpdate`) returning the exact `profiles` UPDATE; `runProfileUpdate`
   sends it. Every test asserts the built request on an in-memory client double; no
   write leaves the process (requirements R5.2). All writes are UPDATE on the own row,
   never upsert (web VTID note on `profiles.vitana_id NOT NULL`).
3. **ID-card segment in the `card` search param** (web `?card=`), set with
   `router.setParams`; an unknown value is Identity.
4. **Share** builds the web share path (`/profiles/<id>?v=<djb2 hash>`, salt `v2`) on
   the build profile's `webBaseUrl` (`webConsoleUrl`) and opens the system share
   sheet; with no web base URL (every non-production profile) the Share button is
   hidden. No production host is hardcoded.
5. **Privacy copy is catalogued.** The web hardcodes the section labels in English;
   natively they come from `profileNative.privacy.*` (DE first, du-form, 11 locales).
   The web's success toast shows the raw key (`dancePreferences → Public`); natively
   it shows the translated label and tier.
6. **Create post** reuses the home lane's `MobileCreatePostSheet` (the same web
   component, imported, not modified).

## Not ported in this lane (deviations from 1:1, recorded for the reviewer)

These mobile-web pieces of `/me/profile` need a native capability or another surface
that is not part of this lane's paths; each is a follow-up FEAT, not a silent drop:

- Avatar / cover / gallery **uploads**, the Cover Library tile + drawer and the
  identity avatar position editor: need `expo-image-picker` + storage upload, which
  adds a native dependency (`apps/mobile/package.json` is outside this lane's paths).
  The Identity save carries the loaded avatar fields unchanged.
- The Autopilot banner + bio popup (AI suggestion call), the enrichment card strips
  (home lane's card renderer), the QR share screen, the interests picker, the
  dance / partner / service-offering drawers (`?drawer=` deep links), the video and
  music galleries, milestone add / edit / delete, the links and languages editors in
  the About sheet (links and languages are carried unchanged on save), and the
  Identity card's index standing / boost lines.
- The Vitana Index shows the latest stored `vitana_index_scores.score_total`; the web
  hook's self-heal recompute RPC is not called natively.

## Verification

See `verification.md` and `commands.log`. Device runtime (Maestro, simulators,
screenshot parity) is deferred to G1 (`staging-tests.json` `deferred_g1`,
`next_actor: owner`), isolated environment only.
