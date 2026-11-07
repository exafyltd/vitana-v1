/**
 * VTID-05461 — Vitana Index slope helpers (src/lib/vitana-projection.ts):
 * trend7d, projectDays, projectDay90, buildHorizonPoints. Imports nothing;
 * pure. The native My Journey "how you're doing" card reads the 7-day trend
 * through it, the same math the web card and the gateway voice tool use.
 * The native Health hub (VTID-05455) uses the same re-export for the Index
 * sheet's 30-day horizon points.
 */
export * from '@/lib/vitana-projection';
