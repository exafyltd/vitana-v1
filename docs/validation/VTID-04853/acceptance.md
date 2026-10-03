# VTID-04853 — retire the legacy Navigator admin pages (keep Telemetry)

Owner decision 2026-10-02, part of retiring the legacy voice navigator
(VTID-04846). The Catalog, Coverage and History pages and the Simulator
edited and tested the `nav_catalog` table. Vitana no longer reads it: her
screens come from the screen registry (`src/navigation/registry/`), so the
editor was changing nothing a member hears. Telemetry stays, because it reads
the `orb.navigator.*` OASIS events, which the registry navigator still emits.

AC-1: the Navigator admin section and its sub-navigation list Telemetry only.
TEST: npx vitest run src/config/vtid-04853-navigator-admin.test.ts
AC-2: `/admin/navigator` and `/admin/navigator/telemetry` render Telemetry, and
  no route points at the retired pages.
TEST: npx vitest run src/config/vtid-04853-navigator-admin.test.ts
AC-3: the retired pages, the Simulator and their catalog/coverage/simulate
  hooks are deleted. `useNavTelemetry` remains.
TEST: npx vitest run src/config/vtid-04853-navigator-admin.test.ts
AC-4: nothing else changes. The full vitest suite passes and `npm run build`
  succeeds. The spa-routes list drops exactly the two retired paths, and
  docs/SCREEN_INVENTORY.md is regenerated.
TEST: npx vitest run

Admin-only change: no What's New entry. The gateway's `/api/v1/admin/navigator`
catalog routes are removed in the follow-up gateway PR, after this ships;
`/telemetry` stays.
