# VTID-05685 — parity audit findings (reported, none changed)

Owner instruction: "Parity audit: check the parity ledger on main against the screen list. Find mismatches, stale rows, and missing tests. Report them. Do not change ledger status without evidence."
Audit pinned at vitana-v1 origin/main `e31bf4627ff3c705c20f8e6b718ce4dd03353b7f`. `parity-ledger.mjs --check`: OK, 435 rows, 121 native routes.

1. **Ledger vs screen list: no mismatch.** Every `screens.json` id and every `exclusions.json` path has a row. 11 App.tsx paths have no row whose `web_path` equals them literally, by design (`web_path = mobileRoute ?? route`, `scripts/native/parity-ledger.mjs:66-90`).
2. **Stale rows: none.**
3. **Missing tests: 2, closed by this lane.** `/intents/mine` (`INTENTS.MINE`) and `/comm/my-groups/:id` had no test through their route files. Tests: `apps/mobile/tests/parity-gaps/intents-mine-route.test.tsx` (3 tests), `my-groups-route.test.tsx` (3 tests).
4. **Resolver gap (not fixed, needs a follow-up plan).** `/comm/my-groups/:id` has a route file and a `native` row, but is absent from `NATIVE_ROUTES` and `NATIVE_PATTERNS` (`apps/mobile/src/navigation/resolve.ts:154`). Observed with a throwaway probe test (not committed): `resolveWebPath('/comm/my-groups/g-1')` returns `{"kind":"unported","key":"/comm/my-groups/:id"}`, while `resolveWebPath('/intents/mine')` returns `native`. So deep links and the ORB treat the my-groups alias as unported although in-app navigation reaches the file. Fixing it needs a `resolve.ts` edit and a change to the `NATIVE_PATTERNS` pin in `tests/discover-commerce/routes.test.tsx`; both are outside this lane. These tests deliberately do not assert `resolveWebPath` for this path.
5. **Coverage depth.** The other native rows reference a test by textual match only; query-variant (`?tab=`) assertions are not deepened here.

## Ledger status: unchanged
The evidence (route files behave as the rows say) supports `native` for both rows, so no status is flipped.

## Out of scope / owner-gated
- 30 `native` rows with `last_parity_check: null`: need owner / G1 on-device parity evidence, not a unit test.
- 2 `exception` rows (`/download`, `/maxina/app`) without an owner: need an owner assignment or the Gate-1 decision reference.
- The resolver gap in finding 4.
