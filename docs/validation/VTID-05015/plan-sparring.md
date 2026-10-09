# Plan sparring record — VTID-05015 (regression fix for VTID-05013)

- Partner: plan-sparring-partner (same partner as VTID-05013, amendment round A1)
- Class: light; amendment round 1 → **converged** (F8–F10 minor, informational)
- Owner decision: after the regression report, owner chose "Roll back now, then hotfix" (2026-10-09).
  Production rollback to 0aae822 dispatched; this hotfix goes through staging + STAGING-VERIFY + Gate 2.

## Root cause
Supabase `/storage/v1/render/image/` with only `width` uses its default `resize=cover` and keeps the
original height, centre-cropping: 4032x2268 → 1200x2268, 3392x2544 (EXIF 8) → 1200x3392. Every feed
photo rendered zoomed in. Measured read-only on three real post images. With `resize=contain`:
1200x1600, 1200x1600, 1200x675 (EXIF honoured), 77–414 KB.

## Why the original suites missed it
Unit tests asserted the URL; the staging spec asserted the photo loaded from the CDN and kept its
frame height. Nothing compared the delivered pixels' aspect ratio to the original. Both now do
(`eventCoverImage.test.ts` asserts `resize=contain`; the staging spec asserts resized ratio ==
original ratio ±1%). Screenshot evidence (390px, before / regression / fix) is in this folder.

## Partner findings (A1)
- F8 minor — Event covers use the same helper and were cropped the same way; fixed by the same change. ACCEPTED (no plan change).
- F9 minor — ratio check must compare EXIF-corrected sizes; both sides are `<img>` naturalWidth/Height, which browsers report EXIF-oriented. ACCEPTED (already so in the spec).
- F10 minor — the "screenshot before Gate 2 for visual changes" practice is not mechanically enforced. ACCEPTED as process; CI visual regression is a separate effort.

## Amendment A1 (verbatim, appended to the VTID-05013 plan)
## Amendment A1 — production regression (2026-10-09, after deploy of 45aa5b5)
Defect: Supabase `/render/image/` with only `width` uses its default `resize=cover` and keeps the
ORIGINAL height, so it center-crops: 4032x2268 -> 1200x2268, 3392x2544 (EXIF 8) -> 1200x3392.
Every feed photo rendered zoomed in. Verified read-only on 3 real post images (GET original vs
render URL, PIL sizes). Owner chose: roll back production to 0aae822 now (dispatched), then hotfix.

Hotfix (new VTID; VTID-05013 is terminal):
1. `src/lib/eventCoverImage.ts::transformedCoverUrl` appends `&resize=contain` (width-only +
   contain = aspect-preserving downscale; verified: 1200x1600, 1200x1600, 1200x675, EXIF honoured,
   77–414 KB). This also fixes Event covers, which use the same helper and have been server-cropped
   the same way since that helper shipped (cards then object-cover the cropped image).
2. Tests that would have caught it:
   - Vitest: `transformedCoverUrl` output contains `resize=contain`; FeedMedia src/poster fixtures
     updated to the new URL.
   - Staging spec (read-only): for the first feed photo, load the ORIGINAL object URL in the page
     (GET) and assert resized naturalWidth/naturalHeight ratio == original ratio (±1%), i.e. the
     resize never crops.
3. Process fix for my own gap: before Gate 2 for any image/visual change, a screenshot comparison
   (original vs shipped) at 390px is attached as evidence.
Files: src/lib/eventCoverImage.ts, its test (new or existing), src/components/media/FeedMedia.test.tsx,
tests/e2e/staging/vtid-05013-feed-image-resize.staging.spec.ts (assertion added),
docs/validation/<new VTID>/*.
