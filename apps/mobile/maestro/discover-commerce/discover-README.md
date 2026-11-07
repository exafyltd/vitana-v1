# Maestro — discover lane (VTID-05510) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native Discover cluster (tasks.md `discover` task 8). These flows are
**not run in CI** and are **not a merge blocker**. They need the isolated G1 test environment (iOS
simulator + Android emulator; macOS minutes / G3 for iOS on a device). Recorded here and in
`docs/validation/VTID-05510/staging-tests.json`. Staging is read-only: sign in, navigate, read; the
network guard aborts every non-GET except sign-in; never `vitanaland.com`.

Flows (to author on G1):

- `discover-01-overview.yaml` — `/discover` signed out (guest card → portal) and signed in: Vitana
  Picks hero + "More to explore" + the three collection groups; mode pill → Categories (chips) →
  Share & Earn; `/discover/ai-picks` and `/discover?tab=categories|share` deep links; utility rail
  (Search, Calendar, Life Compass, Gift Voucher on Android only, Index, Autopilot); screenshot parity
  vs the 390×844 read-only staging `/discover`.
- `discover-02-shop.yaml` — `/shop`: the first video autoplays muted, swipe snaps to the next,
  anchor pill → peek drawer (video paused) → "More details" → full product drawer; screenshot parity
  vs staging `/shop` (no add-to-cart tap on staging: read-only).
- `discover-03-sub-catalogues.yaml` — `/discover/supplements` (filters, Top Picks, My Stack),
  `/discover/wellness-services` (category sheet), `/discover/deals-offers?tab=trending|ai|saved`,
  `/discover/category/longevity`; screenshot parity vs the staging pages.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/discover-commerce/` and the typecheck / bundle / deps / parity / core-closure gates.
