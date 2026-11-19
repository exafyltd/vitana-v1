# VTID-05656 — native client-identity header (client-identity-app)
Change types: Backend (request header), Tooling/docs
- Outcome: no member sees a difference; the gateway can tell native traffic from the Appilix web view.
- Contract: request header `X-Vitana-Client: native/<ios|android|test>/<version|unknown>`, built in
  `apps/mobile/src/config/client-identity.ts`, added to every call of `fetchWithTimeout` in `apps/mobile/src/config/http.ts`
  (all callers: remote-config, push registration, g1 test provider; each builds its URL from `gatewayUrl`). Gateway side:
  lane client-identity-gateway (classifier) reads it; response unchanged.
- States: no version → `unknown`, the request still goes out (`tests/client-identity.test.ts`).
- Surfaces / Locales / Accessibility: n/a (no UI, value not localized).
- Unchanged: DEFAULT_TIMEOUT_MS, no retry, URL guard in env.ts.
- Decision taken: a caller-supplied `X-Vitana-Client` (any case) is dropped and replaced, so the value cannot be spoofed.
- Known limit: calls that do not use `fetchWithTimeout` (orb transport `src/orb/transport.ts:56`, `src/ports/*` file fetches)
  are outside this lane's `paths`; the orb transport is not changed here.
