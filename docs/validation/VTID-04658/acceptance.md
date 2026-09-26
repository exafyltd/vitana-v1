# VTID-04658 — the app loads the widget version that carries the after_turn branch

VTID: VTID-04658

The gateway serves `/command-hub/orb-widget.js` with `Cache-Control: public, max-age=31536000,
immutable`, and Cloudflare caches it per URL. A widget change reaches members only when the app
loads a new `?v=`. VTID-04644 (vitana-platform #3757) changed the widget, and the version was not
bumped. Measured on staging 2026-09-26 15:27 UTC: the URL the app loads
(`?v=20260925-vtid-04560-view-role`) was a Cloudflare HIT 19.5 h old without the change.

AC-1: index.html preloads and loads `orb-widget.js?v=20260926-vtid-04658-after-turn` (the same URL in both).
  TEST: src/hooks/useOrbVoiceWidget.vtid-04099-load-path.test.ts
AC-2: on staging, that URL serves the widget with the after_turn branch.
  TEST: docs/validation/VTID-04658/staging-tests.json (http gateway check)

Production order: the gateway change must be live on production BEFORE this version reaches the
production app. Otherwise the new URL caches the old widget for a year.
