# VTID-05647 — acceptance (native-shell-fixes-r2/shell-fixes)

Delivered:
- `GuidedModeProvider` requests `<origin>/api/v1/journey/state` (was `/api/v1/api/v1/...`); proven with a real `createGatewayFetch`.
- `AuthGate`: a signed-out visitor on `/commerce/<x>` goes to `/commerce/join?redirectTo=<path>` (web `AuthGuard.tsx:65`, `:204`) as soon as `/commerce/join` is a native route; until then `/maxina` (no redirect loop through the `(app)` catch-all). `/commerce` stays a guest path; every other path keeps `/maxina`.

Blocked / deferred (reported in the PR):
- `useMyPartnerOrgs.ts:23` still doubled: the fix turns existing `tests/shell.test.tsx:49` red (outside lane paths; no edits to existing tests).
- The four `(public)` commerce routes, their `NATIVE_ROUTES` entries and ledger rows: need `src/screens/business/*` from vitana-v1 #1587.

## Caller audit (task 4b)
See `commands.log`. `gatewayGet` callers: `GuidedModeProvider.tsx` (fixed), `useMyPartnerOrgs.ts` (blocked), `home/data/feed.ts:109,353`, `wallet-rewards/data/rewards.ts:118` (bare paths). No `getGateway()` caller passes an `/api/v1` path; `/api/v1` constants in `config/remote-config.ts`, `push/registration.ts`, `orb/protocol.ts` go through origin-based endpoints, not the shell client.
