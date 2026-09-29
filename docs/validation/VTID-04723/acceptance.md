# VTID-04723 — move the voice widget to a new address

Production's app (4feb8ff, 18:45 UTC 2026-09-28) loaded
`orb-widget.js?v=20260926-vtid-04658-after-turn` while production's gateway
still served the previous widget; the gateway reached bf6360e at 19:35 UTC.
The widget is served `public, max-age=31536000, immutable`, so a browser that
opened vitanaland.com in that window may keep the old widget under that
address for a year. There, a screen the VTID-04644 safeguard opens waits for
the 15 s safety timer instead of opening when Vitana stops speaking.

- AC-1: the app's preload and script tag load `orb-widget.js?v=20260928-vtid-04723-refetch`, an
  address never served before.
  TEST: npx vitest run src/hooks/useOrbVoiceWidget.vtid-04099-load-path.test.ts
  CURL: GET preview-aws.vitanaland.com/ contains `orb-widget.js?v=20260928-vtid-04723-refetch`
- AC-2: that exact widget URL on the gateway carries the after_turn branch.
  CURL: GET <gateway>/command-hub/orb-widget.js?v=20260928-vtid-04723-refetch contains `msg.after_turn === true`
  (production already serves it: checked 2026-09-28 against gateway.vitanaland.com, read-only)

No gateway change: the gateway serves the widget regardless of `?v=`.
