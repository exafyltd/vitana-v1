# fixture-gateway (VTID-05250)

A local fixture for the native app's plain-HTTP G1 endpoints. **Never shipped
in the app.** It is separate from `tools/orb-fake-gateway`, which only speaks
the ORB WS/SSE voice protocol.

## What it answers

| Route | Method | Shape |
|-------|--------|-------|
| `/api/v1/app-config` | GET | A body accepted by `parseAppConfigResponse` (`src/config/remote-config.ts`): `ok:true`, `schema_version:1`, `ttl_seconds`, and an `ios`/`android` block each with `min_supported_version`, `recommended_version`, `update_url`, `flags`. Flags and versions are togglable via `setScenario`. |
| `/api/v1/auth/me` | GET | The signed-in member (`200`), or `401` when the auth scenario is toggled off. |
| `/api/v1/notifications/token` | POST | Records `{ token, device_type }` (device_type must be `ios`/`android`); echoes it back. |
| `/.well-known/apple-app-site-association` | GET | AASA for the `.dev` iOS id (`com.exafy.maxina.dev`). |
| `/.well-known/assetlinks.json` | GET | App Links for the `.dev` Android id (`com.vitanaland.app.dev`). |

## Safety

Mirrors `tools/orb-fake-gateway`:

- Binds to `127.0.0.1` by default. `--lan` binds to a private-range LAN
  address only (`createFixtureGateway({ host })` refuses anything else).
- **Listen-only.** It opens no outbound connection and proxies nothing — it
  can never reach a real host, so it can never test against production.
- No import of the web `src/`, the web Supabase client, or any gateway client.

## Run

```sh
node tools/fixture-gateway/cli.js [--port 8788] [--lan] [--unauthenticated]
```

Then point a `development` build at the printed address with
`EXPO_PUBLIC_GATEWAY_URL`.
