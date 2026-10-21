# VTID-05242 — acceptance (mt-frontend-brand / brand-surface)

| tasks.md item | Where | Status |
|---|---|---|
| B1 CommerceJoin slug from the active tenant | — | deferred: tests outside the lane's paths pin `'maxina'` (see commands.log); behaviour unchanged |
| B2 AuthGuard OAuth retry base from the active slug, Maxina fallback | `src/components/AuthGuard.tsx` (`activeTenantSlug`) | done |
| B3 Voucher redemption portal path + logo from the active tenant, Maxina fallback | `RedeemVoucher.tsx`, `RedemptionLanding.tsx` (`useTenantPortal`) | done |
| B4 store links from the brand pack, Maxina constants as fallback | `src/lib/store-links.ts` (`storeLinksFor`, https only) | done (no caller rewired; registry brand pack carries no store fields yet) |
| B5 `useTenantMeta()` title + favicon only, never OG; one call in `AppHooksInitializer` | `src/hooks/useTenantMeta.ts`, `src/App.tsx` | done |
| B6 i18n DE first, du-form, EN mirror; inventory | `src/i18n/{de,en}/tenantBrand.json`, `docs/SCREEN_INVENTORY.md` | done |
| B7 Vitest | `useTenantMeta.test.ts`, `store-links.test.ts` (26 tests; red on base, green on head) | done |

Maxina is byte-identical: for Maxina or no registry tenant `useTenantMeta()` writes nothing, every slug falls back to
`maxina`, the voucher screens keep `/maxina`, the Maxina logo and the `goMaxina` label. No new route or JSX element in
`src/App.tsx` (nav registry, screen manifest and parity ledger unchanged). New layout uses no left/right (RTL-neutral).
Staging: `staging-tests.json` (read-only GETs; staging has no non-Maxina tenant, so overrides are proven by Vitest).
