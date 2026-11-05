# Maestro — auth-portals lane (VTID-05449) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native portals / OAuth / reset / confirm / logout port and
the **real OAuth browser round-trip**. These flows are **not run in CI** and are **not a
merge blocker** (requirements R5.3, tasks.md auth-portals task 7). They need the isolated
G1 test environment — the Apple / Google providers exist only on the G1 test project, never
on production auth — and macOS minutes / G3 for iOS on a device. Recorded here and in
`docs/validation/VTID-05449/staging-tests.json`.

Flows (to author on G1; sign in is the one auth write, against the G1 project only):

- `01-maxina-portal.yaml` — `/maxina`: backdrop, card, footer, Orb hint; tab switch;
  password sign-in → `/onboarding/welcome`.
- `02-tenant-portal.yaml` — `/alkalma` and a registry `/:tenantSlug`: hero, tabs,
  invite-only / open sign-up, a static one-segment path still opens its own screen.
- `03-oauth-roundtrip.yaml` — Apple on Android (`WebBrowser.openAuthSessionAsync` →
  `/oauth/complete`), Apple / Google native SDK consent on iOS.
- `04-reset-confirm.yaml` — reset request; a recovery link → new-password form; an
  `/auth/confirmed` link → confirmed card (and an expired link → error card).
- `05-logout.yaml` — `/logout` → `/maxina`.
- Screenshot parity of each vs the 390×844 **read-only** staging web screens.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/auth/` and the typecheck / bundle / deps / parity gates.
