# VTID-05653 verification (native-wave2-fix-forward-r2/utility-bar)

Offline only (jest-expo + RNTL, fake gateway / Supabase doubles). Commands and results: `commands.log`; red on base: `red-on-base.txt`.

## What changed
- `apps/mobile/src/shell/utility/`: `UtilityBar.tsx` (slot order children → Life Compass → Gift Voucher → after → trailing, Gift Voucher hidden on iOS), `buttons.tsx` (Search, Calendar, Vitana Index chip, Autopilot chip), `VoucherModal.tsx`, `LifeCompassPopup.tsx`, `life-compass.ts`, `data.ts` (moved from the Discover copies, logic unchanged), `events.ts`; `ports/utility.tsx`.
- `shell/OverlayHost.tsx` hosts `vitana:open-life-compass` and `gift-voucher:open` `{ returnTo }` once (ignored signed out; no voucher modal on iOS).
- Home and Daily Diary render the bar in the web order; Home Search filters article cards with the web predicate, Invite shares the flyer URL with the language, Create post pushes `/home/compose`.
- The marketplace and journey `VoucherModal.tsx` copies are deleted; their `data` voucher functions moved to `shell/utility/data.ts`.

## Decisions taken (conservative choices inside the approved plan)
1. **Per-lane bars keep a fallback.** Discover, Marketplace and Journey bars emit `gift-voucher:open` / `vitana:open-life-compass` when a host listens (always, in the app). With no host (a screen rendered on its own, as the existing suites do) the Discover and Marketplace/Journey rails open the shared modal / popup themselves, as #1573's rail already did for the popup. This keeps every existing suite green without editing files outside `paths`.
2. **`screens/discover/VoucherModal.tsx` is a one-line re-export** of the shared modal. `tests/discover-commerce/discover-voucher.test.tsx` imports it, and that test file is not in the lane `paths` (the lane lists `tests/discover-commerce/voucher.test.tsx`, which is the marketplace suite). Nothing in `src` imports the shim. `git grep -n VoucherModal src` therefore also lists the shim; a follow-up that adds `discover-voucher.test.tsx` to a lane's paths can delete it.
3. `screens/discover/data/utility.ts` re-exports the moved bar reads and voucher calls and keeps `logActivity`, so `DiscoverScreen.tsx` and `SubCatalogueFrame.tsx` (outside `paths`) keep their imports.
4. The shared voucher modal takes an optional `testIDPrefix` (`mo-` from the Marketplace fallback) so `tests/discover-commerce/marketplace.test.tsx` (outside `paths`) keeps its `mo-voucher-*` ids.
5. Index chip: emits `vitana:open-index`; with no screen listening it opens `/health` (the Discover pill's behaviour), so it is never a dead tap on Home. The web streak badge is not part of this lane.
6. The #1566 autopilot/audiobook copy does not exist on main (closed unmerged): skipped, as the plan says.

## Not verified here
Device runtime and screenshots wait for G1 (no native staging deploy); `staging-tests.json` lists the offline suites only.
