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

## Uploads and the About editors (review fix 1)

- **Upload port** `apps/mobile/src/ports/profile-media.ts`: `expo-image-picker`
  (library; the config plugin and usage strings are the diary lane's, in
  `app.config.ts`, unchanged) plus pure request builders. The data layer
  `src/screens/profile/data/uploads.ts` sends them. Same buckets, paths and shapes
  as the web:
  - avatar: `avatars/<uid>/avatar-<ms>.<ext>`, upsert, saved by the Identity sheet
    (`IdentityForm.uploadFile`); Remove sets `''` at 50/50;
  - gallery: `media-uploads/<uid>/gallery/<uuid>.<ext>` + `profile_gallery` INSERT
    `{ user_id, image_url, caption, is_public, sort_order }`; delete by id after the
    confirm (`useProfileGallery`, `PhotoUploadDialog`, `PhotoGallery`);
  - Cover Library (Posts-tab tile, and `?drawer=cover-library` like the mobile web):
    `intent-covers` at `user-universal/<uid>/<ms>` / `user-library/<uid>/<uuid>`,
    `profiles.universal_intent_cover_url`, `user_intent_cover_library` INSERT /
    DELETE (id + user id), `GET /api/v1/intent-categories`, and for a
    narrower-than-16:9 photo the staged upload + `POST /api/v1/cover-images/outpaint`
    (`CoverLibraryDrawer`, `coverImageTo16x9.ts`).
- **About sheet**: the links editor (add, label, URL, remove) and the languages
  editor (the web's 10 language options, add without duplicates, remove). The save
  sends `links` as `{ label, url }` and `languages` as the stored values (web `AboutForm`).
- Tests: `tests/profile/uploads.test.tsx` asserts every built upload, insert,
  delete and gateway call on the doubles; nothing is sent.

## Reviewer finding 2: not on mobile web

`design.md` 2a lists the profile-progress card and the Dance / Partner preferences
drawers among the `EditProfilePage` pieces. On the web they are not part of the
**mobile** branch, which R1.1 makes binding (no added sections). Driver decision C:
none of them are ported, and `?drawer=` opens nothing except `cover-library`.

- `ProfileProgressCard` (`src/components/profile/editor/ProfileProgressCard.tsx`) is
  rendered nowhere. `src/components/profile/shared/ProfileLayout.tsx:23` imports it
  and never uses it. The only other reference is a test mock
  (`src/components/profile/ProfileLayout.spotlight.test.tsx:79`).
- `src/pages/EditProfilePage.tsx`: the mobile branch is lines 432-680
  (`if (isMobile) { … }`). It mounts the Identity, About, Services, Compliance,
  Showcase, Visibility, AccountEdit and CoverLibrary drawers (CoverLibrary at
  line 632) but not `PartnerPreferencesDrawer`, `ServiceOfferingsDrawer` or
  `DancePreferencesDrawer`. Those are mounted only in the desktop return, at lines
  792, 798 and 813.
- Lines 87-89 still set the dance / partner / offerings open state from `?drawer=`
  on mobile, but nothing is mounted to render it. No in-app link targets those
  values; the only `?drawer=` link in `src/` is `IntentComposer.tsx:337`
  (`/edit-profile?drawer=cover-library`).
- Guarded by `tests/profile/uploads.test.tsx` ("mobile-web parity"):
  `?drawer=dance|partner|offerings` renders none of the three drawers, and no tab
  shows a progress card.

## Other differences from mobile web (not raised in review)

- Avatar: no Reposition dialog (`AvatarPositioner`); an upload resets the offsets to
  50/50 as the web does before repositioning.
- Cover photos: the web re-encodes a 16:9-or-wider photo to JPEG on a canvas, and
  letterboxes a narrow one when the outpaint fails. There is no canvas natively, so
  the picked bytes are uploaded unchanged, which is the web's own raw-upload fallback
  in `uploadToIntentCovers`.
- The About sheet does not show the web's bio / location / per-link visibility
  selects. The web never saves them.
- A failed gallery upload shows the upload-failed toast; the web's
  `uploadPhoto.mutate` fails silently.
- The Autopilot banner + bio popup, the enrichment card strips, the QR share screen,
  the interests picker, the video and music galleries, milestone add / edit / delete
  and the Identity card's index standing / boost lines are not ported.
- The Vitana Index shows the latest stored `vitana_index_scores.score_total`; the web
  hook's self-heal recompute RPC is not called natively.

## Verification

See `verification.md` and `commands.log`. Device runtime (Maestro, simulators,
screenshot parity) is deferred to G1 (`staging-tests.json` `deferred_g1`,
`next_actor: owner`), isolated environment only.
