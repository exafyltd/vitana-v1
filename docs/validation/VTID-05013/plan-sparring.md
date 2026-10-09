# Plan sparring record — VTID-05013

- Partner: plan-sparring-partner (independent, read-only)
- Class: light; rounds: 2 (cap 2)
- Plan hash (sha256 of text between plan markers): dfa41fa4517853352f94785d9dc16a120e9ad095c8709a71ad875c48bc35c4f6
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-09 — "yes" to the Gate 1 message.

## Rounds
- R1: F1 minor ACCEPTED as-is (inherited `.supabase.co` match, same as Events); F2 minor ACCEPTED (import `transformedCoverUrl` directly, no rename); F3 minor ACCEPTED (eviction wording, cap ~200); F4 major ACCEPTED (both callers pass the raw URL — step 1f + code comment); F5 major ACCEPTED (stored ratio is transform-invariant); F6 minor ACCEPTED (string fixtures in the unit test); F7 minor ACCEPTED (resize only the `imageUrl` leg of the video poster).
- R2: F1–F7 closed, no new findings → converged.

## Decisions taken during implementation (owner may overrule)
- Added `data-testid="feed-media"` / `"feed-media-image"` to FeedMedia so the staging spec can find the frame and photo.
- The ratio cache is keyed by `videoUrl || imageUrl` (the video's own URL for video posts, matching `onLoadedMetadata`).

## Plan and planner responses (verbatim)

# Plan — News Feed photos re-render from full-size originals on every return

<!-- plan:begin -->
## Problem
Returning to News (`/home`) after visiting another tab shows feed photos re-painting:
grey half-filled frames and cards jumping in height. Feed DATA is already cached and kept
alive (`src/hooks/useNewsFeedKeepAlive.ts`, mounted in `src/App.tsx:478`); the defect is in the
photo layer.

Root causes (verified in code):
1. `/home` is a plain route (`src/App.tsx:939`), so leaving it unmounts every `<img>`.
2. Post photos are uploaded as the phone's original (`MobileCreatePostSheet.tsx` compresses only
   video; `getPublicUrl` at ~L205) and `src/components/media/FeedMedia.tsx` puts that original URL
   straight into `<img src>`. Every remount re-decodes a multi-megapixel image on the phone.
3. `FeedMedia` holds `ratio` in component state initialised to `DEFAULT_RATIO` (4:5) and only
   corrects it in `onLoad`, so each remount renders at the wrong height then jumps.

The Events screen already solved (2) via `src/lib/eventCoverImage.ts`
(`transformedCoverUrl` → Supabase `/storage/v1/render/image/public/...?width=1200&quality=75`,
untransformed URL as `onError` fallback). The feed never adopted it.

## Change class
`light` — ≤3 source files plus tests/validation record; no migrations, routes, auth, `.github`,
deploy, governance or LLM-routing files.

## Scope (files)
- `src/components/media/FeedMedia.tsx` — image branch only (and the poster of the video branch,
  see step 1c).
- `src/lib/eventCoverImage.ts` — no behaviour change; reuse `transformedCoverUrl` as-is. (If a
  neutral name is wanted, re-export only; no move.)
- `src/components/media/FeedMedia.test.tsx` (new) — Vitest.
- `tests/e2e/staging/<VTID>-feed-image-resize.staging.spec.ts` (new) — read-only Playwright.
- `docs/validation/<VTID>/{plan-sparring.md,scope.json,staging-tests.json}`.

Callers affected (both get the improvement, no API change): `CommunityPostCard.tsx` (News feed),
`ProfilePostsTab.tsx` (profile posts).

## Steps
1. **Serve resized photos in FeedMedia.**
   a. In the `<img>` branch compute `displaySrc = transformedCoverUrl(imageUrl) ?? imageUrl`.
      Non-Supabase URLs (external, data:, blob:, already-transformed) are untouched because
      `transformedCoverUrl` returns `undefined` for them.
   b. `onError`: if currently showing the transformed URL, swap once to the original
      (`useState` flag, never loops). Same contract as Events (`fallbackSrc`).
   c. Video poster: apply `transformedCoverUrl` ONLY to the `imageUrl` leg of the poster chain
      (`capturedFrames.get(videoUrl)` is already a small `data:` URL and stays first). No extra
      fallback for posters (a failed poster just shows the video).
   f. Assumption (stated in a code comment): FeedMedia receives the RAW storage URL from post data —
      both callers (`CommunityPostCard.tsx:279`, `ProfilePostsTab.tsx:248`) pass it unsanitized —
      so the `onError` fallback target is exactly the URL the caller passed.
   d. The fullscreen overlay keeps the ORIGINAL URL (full resolution when the member
      explicitly expands).
   e. Width: 1200 (`CARD_COVER_WIDTH`, mobile full-bleed @3x). Feed cards are ≤ that width.
2. **Remember each photo's aspect ratio for the session.**
   Module-level `Map<string, number>` keyed by the original `imageUrl` / `videoUrl`, same
   oldest-key-first eviction as `capturedFrames` but a larger cap (~200, values are just numbers,
   not data URLs). The cached value is the clamped RATIO, which the width-only transform preserves,
   so a ratio learned from the transformed image and one from the original fallback are the same. `useState` initialiser reads it
   (`ratioCache.get(url) ?? DEFAULT_RATIO`); `onLoad` / `onLoadedMetadata` write it. A returning
   card renders at its final height immediately — no jump.
3. **Decode hint.** Add `decoding="async"` to the feed `<img>` (keeps main thread free; harmless).
   Keep `loading="lazy"`.

## Out of scope (explicitly)
- Keeping the `/home` route mounted across tabs (App.tsx, high bug history) — separate plan if
  still needed after this ships.
- Compressing photos at upload time — separate plan (touches upload flow).
- Backfilling / rewriting existing `image_url` rows — none; the transform is read-time only.

## Risks
- Supabase image transformation must be enabled on the project's plan. Evidence it is: Events
  already ships it in production (`eventCoverImage.ts` header, measured ~150 KB vs ~2 MB). The
  `onError` fallback covers a rejected file (animated GIF, HEIC, size limit).
- Transform endpoint has an origin size limit; oversize originals fail → fallback to original
  (today's behaviour), never a broken image.
- Bucket: post media lives in `media-uploads`; transform works for any public bucket — verify on
  staging that a feed photo URL under `/render/image/public/media-uploads/...` returns 200
  image (read-only GET).

## Test plan
- **Vitest** (`FeedMedia.test.tsx`):
  - Supabase public-object image → `<img src>` is the `/render/image/` URL with `width=1200`.
  - External URL → src unchanged.
  - `error` event on the transformed img → src becomes the original; second error does not loop.
  - Fullscreen overlay img uses the original URL.
  - Ratio cache: after `load` with natural 1200×800 on one mount, a second mount of the same URL
    renders with `aspect-ratio` ≈ 1.5 before any load event.
  - Existing `CommunityPostCard.test.tsx` stays green.
- **Staging (read-only Playwright, `tests/e2e/staging/`)**: sign in as the test user, open
  `/home`, find the first feed `<img>` inside the media frame whose source is Supabase storage,
  assert its `currentSrc` contains `/storage/v1/render/image/public/` and the image
  `naturalWidth > 0` (loaded, not fell back). Navigate to Events and back; assert the same card's
  frame height is identical before and after (no reflow). GET-only; network guard unchanged.
- Local: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.

## What's New
No entry (fix/improvement to an existing feature).
<!-- plan:end -->

## Planner responses — round 1
- F1 [minor] ACCEPTED as-is, no change: inherited limitation shared with Events; production storage URLs are `*.supabase.co` today. Not tracked separately (no behaviour change needed).
- F2 [minor] ACCEPTED: import `transformedCoverUrl` directly; no rename/re-export in this change (keeps scope minimal).
- F3 [minor] ACCEPTED: step 2 reworded (same eviction strategy, cap ~200 because values are numbers).
- F4 [major] ACCEPTED (confirmed): no caller sanitizes — `CommunityPostCard.tsx:279` and `ProfilePostsTab.tsx:248` pass raw post URLs, as you verified. Assumption added as step 1f and will be a code comment.
- F5 [major] ACCEPTED (agree): ratio cache stores the clamped ratio, transform-invariant for a width-only resize; noted in step 2. `decoding="async"` kept; it does not affect when `naturalWidth` is available at `load`.
- F6 [minor] ACCEPTED: new test uses string fixtures for storage URLs, no Supabase client, no router.
- F7 [minor] ACCEPTED: step 1c reworded — transform only the `imageUrl` leg of the poster chain.
