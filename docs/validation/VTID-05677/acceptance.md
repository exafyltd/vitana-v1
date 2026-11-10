# VTID-05677 — Acceptance (native-wave2-media-hub-r2/media-hub)

Change types: UI, Integration, Tooling/docs.

Scope: the native Media Hub (`/comm/media-hub`, `?tab=shorts|music|podcasts`, `?short=<id>`) and the `/community/media-hub` redirect; the four `"lane": "media"` ledger rows.

- **Outcome** — a member opening Media Hub in the native app sees the same header, action rail, mode pill, enrichment strip and Shorts / Music / Podcasts content as on mobile web, can watch shorts full-screen, like, comment, share, play music and podcasts, bookmark music, and upload / edit / delete their own shorts.
  TEST: apps/mobile/tests/media/media-hub.test.tsx "tab and short params", "shorts carousel", "full-screen feed", "comments", "music", "podcasts", "upload".
- **States** — shorts: real list, demo fallback when empty / loading / error; music and podcasts: the web empty state when empty / loading / error; enrichment strip hidden while loading or on error; owner-only kebab; share without `webBaseUrl` omits the URL; `?short=<id>` for an unknown id opens nothing.
  TEST: "shows the three demo shorts when the list is empty|error|loading", "shows the web empty state for [] / 'error'", "the kebab is owner-only", "share omits the URL when webBaseUrl is unset", "an unknown id opens nothing and does not navigate", "no strip without cards".
- **Surfaces** — native `/comm/media-hub` (all `tab` values, `short` param) and the `/community/media-hub` redirect; phones only. Desktop-only parts are not ported (plan Measured state).
  TEST: tests/media/lane-guards.test.tsx "routes" and "parity ledger".
- **Locales** — de first (du-form) and en, then the other 9; `ar` rendered with start/end only.
  TEST: lane-guards "every key the lane renders exists in all 11 locales", "the mediaHubNative shards have the same keys and placeholders as German", "German uses du-form", "no physical left/right styling"; media-hub.test "the Arabic UI renders the Arabic title from the catalog". Dates use Intl via the home `formatTimeAgo` helper; no `toLocale*`.
- **Accessibility** — every pressable has an accessible name from the catalogs.
  TEST: lane-guards "every control has an accessible name".
- **Contract** — Supabase tables / buckets and the gateway thumbnail endpoint exactly as design §3; no backend change; every write tested only against the fake `MediaHubData` or the in-memory recorder.
  TEST: tests/media/data.test.ts (all describes).
- **Staging proof** — not verified on staging: device runtime (real playback, pickers, Maestro, screenshot parity) needs G1 (`next_actor: owner`); covering checks are `npx jest tests/media`, `npm run typecheck`, `APP_PROFILE=development npm run bundle`.
- **Plugins** — packages and plugins reused as on `main`; `package.json`, `package-lock.json`, `app.config.ts`, `tests/app-config.test.ts` unchanged; read-only plugin test passes.
  TEST: tests/media/app-config-media.test.ts.
- **Ledger** — the four rows `native`; `/community/media-hub` in `native_only`; both routes in `NATIVE_ROUTES`.
  TEST: lane-guards "the four media rows are native", "the legacy redirect is a native_only entry"; `node scripts/native/parity-ledger.mjs --check`.
- **Core** — generated core files committed; no `export *` from a web file.
  TEST: lane-guards "the core re-export is by name"; `gen-core-extract --check`, `core-closure --check`.
- **Red on base** — the new tests fail on `origin/main`: docs/validation/VTID-05677/red-on-base.txt.

UX acceptance (Commerce contract n/a): no new member-facing flow, a port of an existing screen at 1:1 parity. Friction vs web: unchanged. Deviations are listed in verification.md "Decisions taken".
