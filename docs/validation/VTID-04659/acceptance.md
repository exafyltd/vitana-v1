# VTID-04659 — the community app loads the widget VTID-04644 changed

VTID-04644 (exafyltd/vitana-platform #3757) changed `orb-widget.js` without a `?v=` bump.
The gateway serves the widget immutable for a year through Cloudflare, keyed by the exact
URL, so this app kept loading the copy cached on 2026-09-25 at
`?v=20260925-vtid-04560-view-role` (probe: `outputs/staging-widget-cache-probe.txt`).
The platform half of this VTID bumps the Command Hub the same way.

AC-1: index.html preloads and loads `orb-widget.js?v=20260926-vtid-04659-after-turn`,
  byte-identical in both tags.
  TEST: src/hooks/useOrbVoiceWidget.vtid-04099-load-path.test.ts
AC-2: On staging the app shell references that URL and the gateway serves the new widget
  there (`staging-tests.json`, run by STAGING-VERIFY after the deploy).
