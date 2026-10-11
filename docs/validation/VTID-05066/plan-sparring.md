# Plan sparring record — VTID-05066

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard (more than 3 files, a dependency, nginx.conf); rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers): 3042eb387a306b5db7d9dacf2024e5ec241865d8fa1f7d71feae0dc5536eb1cd
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-10 — "Yes" to the Gate 1 message. Before that, the owner chose "Fix all three (robot stays strict)" over unblocking or relaxing budgets.
- Parent: VTID-05062 (the phone journey robot whose STAGING-VERIFY run 38072726144 found these screens)

## Rounds
- R1: F1 major (AvatarImage blast radius, 82 files) ACCEPTED → synchronous pass-through for every non-DiceBear src; F2 major (bundle impact unquantified) ACCEPTED → measured, budget written (initial ≤ 2 KB gz, style chunk ≤ 60 KB gz); F3 major (unbounded robot cache) ACCEPTED → 50 MB LRU; F4–F6 minor ACCEPTED (nginx comment, exact 9.4.3 pins, memo cap 500).
- R2: F1–F6 closed, no new findings → CONVERGED.

## Implementation note (within the approved budget)
The build measured two style chunks over the 60 KB gz budget: `adventurer` (~108 KB) and `notionists` (~118 KB). As the most conservative option inside the plan, those two styles are not drawn locally and keep loading from api.dicebear.com as before; the other 14 are drawn on the device. Initial chunk growth measured +1.1 KB gz; largest style chunk 47 KB gz (lorelei).

## Plan and planner responses (verbatim)

# Plan — Fix the three slow screens the phone journey robot found (Events, Postfach, News return)

<!-- plan:begin -->
## Problem (measured, not assumed)
The VTID-05062 phone journey (staging, Pixel 7 viewport, 4× CPU, Fast 4G) failed on STAGING-VERIFY run
38072726144 (community-app @ 258e3c2). Every step now names what it waited on:
- **Events (first visit): not ready within 10 s**, waiting on `img.absolute.inset-0.h-full.w-full`
  `src=…/storage/v1/object/public/covers/…/live-…` — the live-room cover served as the full-size original.
  `src/components/liverooms/LiveRoomEventCard.tsx:75` and `LiveRoomCard.tsx:153` put `room.imageUrl` straight
  into `<img>`; the feed already fixed the same thing with `transformedCoverUrl` (VTID-05013/05015).
- **Postfach (first visit): 7048 ms > 4000 ms**, waiting on avatar `<img>`s (shadcn `AvatarImage`, classes
  `aspect-square h-full w-full`) from `https://api.dicebear.com/9.x/...` — one third-party generated SVG per
  member without a photo (`src/lib/autoAvatar.ts`, VTID-02806i). Measured from a session: ~0.5 s TTFB per
  uncached avatar, and one request stalled 11 s with no response.
- **News (return): 6166 ms > 1500 ms**, waiting on `/vitana-orb-clean.svg` (826 bytes). `nginx.conf`'s
  `location /` sends `Cache-Control: no-cache, no-store, must-revalidate` for every unhashed root file, so the
  ORB icon is downloaded again on every remount; on return the step fetched 29 images over the network.
  Part of this is the robot itself: Playwright disables the browser cache on routed pages, and the spec's
  stand-in HTTP cache (VTID-05062) covers Supabase storage images only, so DiceBear avatars (1-year cache) are
  re-downloaded in the robot though not on a real phone.
While this fails, STAGING-VERIFY community-app is red, so no community-app build can be offered for
production. Owner decision 2026-10-10: fix all three, robot stays strict, budgets unchanged.

## Change class
`standard` — more than 3 files, a dependency addition and `nginx.conf` (served config); no migrations,
routes, auth, `.github`, governance or LLM routing.

## Change
1. **Live-room covers through the resize CDN.** In `LiveRoomEventCard.tsx` and `LiveRoomCard.tsx`:
   `src = transformedCoverUrl(room.imageUrl) ?? room.imageUrl` (width 1200, quality 75, `resize=contain` —
   the VTID-05015 aspect-preserving form), and on `onError` swap once to the original before the existing
   error state (same one-shot fallback contract as `FeedMedia`). Non-Supabase URLs are untouched.
2. **Auto-avatars rendered on the device, byte-identical.** Add `@dicebear/core@9` and the 16 style packages
   `autoAvatar.ts` uses, pinned exactly at `9.4.3` (verified byte-identical with the live API today). New `src/lib/localAvatar.ts`:
   `localAvatarDataUri(url)` parses an `https://api.dicebear.com/9.x/<style>/svg?…` URL, lazily imports only
   that style (dynamic import → one small chunk per style), renders with the same options (seed,
   backgroundType, backgroundColor, radius, size) and returns a `data:image/svg+xml` URI; `@dicebear/core` is
   dynamically imported too, so the initial chunk grows ≤ 2 KB gz; each style chunk ≤ 60 KB gz (measured:
   core 3.1 KB, heaviest style lorelei 47.7 KB); memo by URL capped at 500 entries, oldest evicted. Verified in this session: `createAvatar(botttsNeutral, {seed:'A', backgroundType:['gradientLinear'],
   backgroundColor:['ffd5dc'], radius:50})` is byte-identical to the API response for the same URL.
   `AvatarImage` (`src/components/ui/avatar.tsx`) stays a plain pass-through for every non-DiceBear src (no
   state, hook or effect); only a DiceBear 9.x src renders a `DiceBearAvatarImage` child holding the async
   swap. `AvatarImage` is the one component the Postfach avatars and most avatar
   lists render through — swaps a DiceBear 9.x `src` for the local data URI; until it is ready the existing
   `AvatarFallback` shows (Radix behaviour), and if the local render throws, it keeps the original URL
   (today's behaviour). URLs stored in profiles (`avatar_url` set to a DiceBear URL) are covered the same way
   because the swap keys on the URL, not on who produced it. `getAutoAvatarUrl`/`getDisplayAvatarUrl` and
   their 14 call sites are unchanged.
3. **Cache unhashed root images.** `nginx.conf`: a `location ~* ^/[^/]+\.(svg|png|ico|webp|jpg|jpeg)$`
   block with `Cache-Control: public, max-age=86400` (one day, revalidated after — not `immutable`, because
   these names are not content-hashed). `index.html`, `/assets/`, `boot-recover.js` and the SPA fallback
   keep their headers. A comment lists the root images covered (`vitana-orb-clean.svg`, `placeholder.svg`,
   icons) and says a root file needing `no-cache` must get an exact `location = /name` above it.
4. **Robot mirrors a real phone's HTTP cache for every image.** In
   `tests/e2e/staging/screen-journey.staging.spec.ts` the stand-in cache now serves any GET image (any host)
   by the response's own Cache-Control/Expires/Last-Modified, exactly as it already does for storage images;
   `no-store`/`no-cache` responses are still fetched every time (true behaviour). The cache is capped at
   50 MB, least-recently-used evicted. Re-download counting stays on
   Supabase storage photos only. Budgets unchanged; nothing loosened.

## Out of scope
Anything else the robot reports after this lands (fix forward in a new VTID); uploading avatars;
changing the avatar look; first-load LCP.

## Files
vitana-v1: `src/components/liverooms/LiveRoomEventCard.tsx`, `src/components/liverooms/LiveRoomCard.tsx`,
`src/lib/localAvatar.ts` (+ test), `src/components/ui/avatar.tsx` (+ test), `src/lib/autoAvatar.ts` (export
the style list only), `package.json`/`package-lock.json`, `nginx.conf`,
`tests/e2e/staging/screen-journey.staging.spec.ts`, `docs/validation/<VTID>/*`.

## Test plan
- Vitest: cover src is the `/render/image/` URL with `resize=contain` and falls back once to the original on
  error (both cards); `localAvatarDataUri` returns the byte-identical SVG for a saved API fixture (bottts-neutral
  seed A, captured from the API) and null for non-DiceBear URLs; `AvatarImage` renders a `data:` src for a
  DiceBear URL and the original for others; existing avatar/cover tests stay green.
- Build: chunk per avatar style present; main bundle growth reported in the PR.
- Staging: STAGING-VERIFY community-app must pass on the merge commit, including the VTID-05062 phone journey
  (Events first ≤ 4 s, Postfach first ≤ 4 s, News return ≤ 1.5 s, no photo re-download, no frame jump) and a
  read-only header check that `/vitana-orb-clean.svg` answers `Cache-Control: public, max-age=86400`.
- Visual: screenshots of Events and Postfach at 390 px before/after (staging) attached before Gate 2.
<!-- plan:end -->

## Planner responses — round 1
- F1 [major] ACCEPTED (synchronous fast path): `AvatarImage` stays a plain pass-through for every non-DiceBear
  src — no state, hook or effect. Only when `src` matches `https://api.dicebear.com/9.x/` does it render a
  separate `DiceBearAvatarImage` child that holds the async swap. The 80+ other call sites run exactly
  today's code. A test pins that a non-DiceBear src renders the primitive unchanged. (Kept in `AvatarImage`
  rather than opt-in, because DiceBear URLs also come from stored `avatar_url` values rendered on many
  screens — opt-in would miss them.)
- F2 [major] ACCEPTED with numbers: measured in session (esbuild, minified, gzip): `@dicebear/core` 3.1 KB;
  core + `bottts-neutral` 3.1 KB; core + `lorelei` 47.7 KB (the heaviest art). Core is ALSO dynamically
  imported inside `localAvatarDataUri`, so the initial chunk grows by ≤ 2 KB gz (the URL parser only).
  Budget written into the plan: initial chunk +≤ 2 KB gz; each style chunk ≤ 60 KB gz, loaded once per
  style used on screen and then served from `/assets/` (immutable, 1 y). The PR reports measured sizes.
- F3 [major] ACCEPTED: the robot's cache keeps "any GET image, any host" (Q3: intended — a real phone caches
  every image by its headers, and `no-store` ones are still re-fetched, which is how the ORB-icon problem is
  measured) but is capped at 50 MB with least-recently-used eviction by bytes.
- F4 [minor] ACCEPTED: the nginx block gets a comment listing the root images it covers today
  (`vitana-orb-clean.svg`, `placeholder.svg`, favicon/apple-touch icons) and that a root file needing
  `no-cache` must get an exact `location = /name` above it.
- F5 [minor] ACCEPTED: exact pins `@dicebear/core@9.4.3` and the 16 styles at `9.4.3` (the version verified
  byte-identical against the live API today); comment that identity is best-effort and a render error keeps
  the original URL.
- F6 [minor] ACCEPTED: memo capped at 500 entries, oldest evicted first.

## Round 2 — partner verdict
F1–F6 closed; no new findings. Verdict: CONVERGED (2 rounds, standard class).

## Amendment A1 (2026-10-11) — scope growth, sparred with the same partner
- R1: F7 major (fallback state would break the stateless AvatarImage invariant) ACCEPTED → separate StorageAvatarImage; F8 minor (256 px too soft for 128 px call-screen avatars) ACCEPTED → 384 px; Q1 answered (data:/blob: untouched).
- R2: F7, F8 closed, no new findings → CONVERGED.
- Evidence: STAGING-VERIFY 38126306283 (community-app @ 8589a43): Events first 392 requests / 5.2 MB, News return up to 8.9 MB; largest downloads were uploaded avatar originals of 1.1–3.0 MB.

## Amendment A1 — uploaded profile photos through the resize CDN (2026-10-11, scope growth → one sparring round)
Evidence after items 1–4 shipped to staging (STAGING-VERIFY 38126306283, community-app @ 8589a43, with the
robot's new per-step network accounting): Postfach now passes. Events first visit downloaded 392 requests /
5.2 MB and News return 33–307 requests / 3.4–8.9 MB. The largest downloads are members' uploaded profile
photos served as originals from `storage/v1/object/public/avatars/…`: 2989 KB, 2488 KB, 1670 KB, 1592 KB,
1314 KB, 1112 KB… each one shown as a ~40–64 px avatar. They saturate the throttled connection, so the resized
live-room cover (232 KB) and feed photos finish late.
Change (one file + test): in `AvatarImage` (`src/components/ui/avatar.tsx`), a src on
`*.supabase.co/storage/v1/object/public/` is served via `transformedCoverUrl(src, 384)` (the existing helper:
`/render/image/`, `width=384&quality=75&resize=contain`; 384 px covers the largest avatar, the 128 px call
screens, at DPR 3), with a one-shot fallback to the original on error (same contract as FeedMedia and the
live-room covers). The fallback state lives in a separate `StorageAvatarImage` component that only mounts for
such URLs (same pattern as `DiceBearAvatarImage`); `AvatarImage` stays stateless for every other src, and data:
or blob: URLs are untouched (`transformedCoverUrl` returns undefined for them). Every other src keeps today's code path; DiceBear handling from item 2 is unchanged. Test: Vitest — storage avatar
src becomes the 384 px render URL; error → original once; external and DiceBear srcs unchanged.
Staging: the same journey at unchanged budgets.

## Planner responses — amendment A1, round 1
- F7 [major] ACCEPTED: the fallback state lives in a new `StorageAvatarImage` that mounts only for
  `*.supabase.co/storage/v1/object/public/` srcs; `AvatarImage` keeps no state, hook or effect for every other src.
- F8 [minor] ACCEPTED: width 384 instead of 256 (covers the 128 px call-screen avatars at DPR 3; still a small file).
- Q1: data: and blob: URLs are untouched — `transformedCoverUrl` returns undefined for anything that is not a
  Supabase public-object URL, and the wrapper only mounts when it returns a URL. Stated in the amendment.
