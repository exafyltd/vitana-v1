# VTID-05648: native product analytics (native-wave2-fix-forward-r2/analytics)

Adds `apps/mobile/src/analytics/{client,session,types}.ts` and `AnalyticsTracker.tsx`, mounted once in
`src/shell/ShellRoot.tsx` (two additive lines). Same events as mobile web (`src/lib/product-analytics/client.ts`), `source`
= `ios` / `android`, `POST <gatewayOrigin>/api/v1/analytics/events/batch`, no Authorization header, `credentials: 'omit'`.

- Batching: flush at 10 events, every 10 s (timer starts on first `track`), on `AppState` background; at most 100 per POST;
  outbox in AsyncStorage capped at 300; a failed POST keeps the batch.
- Consent: signed out `anonymous`, signed in `granted` with the SHA-256 hex of the user id (the raw id never leaves the
  device; if hashing fails the member is tracked anonymously); `denied` drops and clears and tracks nothing.
- Events wait for a tenant id and are released when it is set. Forbidden property keys are stripped.
- `screen_viewed` once per path change with `previous_route` and `search_present`.
- No gateway origin (tests, ConfigMissing) means nothing is posted.

Deferred / not done: no call-site events and no celebrate post (plan decision 8). Nothing verified on staging (no native
staging deploy); device runtime is G1.

Acceptance (tasks.md lane `analytics`): see `acceptance.md`.
