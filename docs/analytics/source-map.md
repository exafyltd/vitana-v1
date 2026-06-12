# Analytics Source Map

Maps the deployed bundle chunks inspected in the
`vitana-assistant-usage-analytics` developer plan back to the real source
files in this repo (`exafyltd/vitana-v1`) and the backend repo
(`exafyltd/vitana-platform`). Where repo reality diverged from the plan's
assumptions, the deviation is noted inline.

## Existing Admin Screens

- Assistant usage screen (`AssistantUsage-BwSheI0r.js`): `src/pages/admin/insights/AssistantUsage.tsx`
- Engagement screen (`Engagement-CbV6g2XO.js`): `src/pages/admin/insights/Engagement.tsx`
- Navigator telemetry screen (`Telemetry-DcHxYQ55.js`): `src/pages/admin/navigator/Telemetry.tsx`
- Assistant sessions screen (`Sessions-CTNld0EY.js`): `src/pages/admin/assistant/Sessions.tsx`
- Admin tab registry: `src/config/admin-navigation.ts` (`ADMIN_SECTIONS`, consumed by `src/components/admin/AdminTabs.tsx`)
- Admin route registry: `src/App.tsx` (lazy imports ~line 339, `<Route>` entries ~line 1720)

## Existing Hooks And API Helpers

- Admin API helper (`admin-api-CmvY2vw2.js`): `src/lib/admin-api.ts` (`adminFetch`)
- Admin overview hook (`useAdminOverview-eimhg9JQ.js`): `src/hooks/useAdminOverview.ts`
- Admin navigator hook (`useAdminNavigator-Ct4jTDcR.js`): `src/hooks/useAdminNavigator.ts`
- Admin assistant hook (`useAdminAssistant-Cnf0a9Pl.js`): `src/hooks/useAdminAssistant.ts`

> Deviation: admin hooks live flat in `src/hooks/` (no `src/hooks/admin/`
> directory), so the new product-analytics hooks follow that convention:
> `src/hooks/useAdminProductAnalytics.ts`.

## Existing Analytics Helpers

- Card analytics helper (`analytics-xAadocXR.js`): `src/lib/analytics.ts` (localStorage-only `AnalyticsService`)
- Card ID wrapper (`withCardId`): `src/lib/withCardId.tsx`
- Standard card component: `src/components/templates/StandardCard.tsx`
- Smart suggestions component: `src/components/health/SmartSuggestions.tsx`
- Sub navigation component: `src/components/SubNavigation.tsx`
- RUM beacon client (`index-v_Hz80LW.js` RUM section): `src/lib/rum.ts`
  (doubled `/api/v1/api/v1/rum/beacon` confirmed: `VITE_GATEWAY_URL`
  already includes `/api/v1` and `rum.ts` did not strip it, unlike
  `admin-api.ts` which does)

> Deviation: the deployed `AIAssistant-Cz6-C1aK.js` chunk maps to
> `src/pages/assistant/AIAssistant.tsx`, which is a **settings hub**
> (voice/AI/autopilot panels), not a chat surface. The real Assistant
> conversation surfaces are the external ORB widget (gateway WebSocket,
> `vitana-platform/services/gateway/src/routes/orb-live.ts`) and the
> conversation API (`.../src/routes/conversation.ts`). Assistant
> conversation events (intent, topic, tools, latency, resolution) are
> therefore emitted **server-side by the gateway**, not by this repo.

## Backend And Database

(in `exafyltd/vitana-platform`)

- Gateway route registration: `services/gateway/src/index.ts` (`mountRouterSync`)
- Ingestion route: `services/gateway/src/routes/product-analytics.ts`
  (`POST /api/v1/analytics/events/batch`)
- Admin read routes: `services/gateway/src/routes/tenant-admin/product-analytics.ts`
  (`GET /api/v1/admin/tenants/:tenantId/analytics/*`)
- Server-side tracker + classifiers: `services/gateway/src/services/product-analytics/track-server.ts`
- Daily rollup job: `services/gateway/src/services/product-analytics/rollup.ts`
- Supabase migrations directory: `supabase/migrations/`
  (`20260612140000_BOOTSTRAP_product_analytics_events.sql`,
  `20260612140100_BOOTSTRAP_product_analytics_rollups.sql`)
- Test directory: `services/gateway/test/` (jest, `test/product-analytics-*.test.ts`)

## Frontend Test Convention

> Deviation: this repo has **no unit-test runner** (no vitest/jest in
> `package.json`). The established pattern is standalone node regression
> scripts (`scripts/*-regression.mjs`, e.g. `npm run test:orb-stop`). The
> analytics client tests follow it: `scripts/analytics-client-regression.mjs`
> via `npm run test:analytics-client`.
