# Maestro — public-legal lane (VTID-05451) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native public landing / legal / invite / apply /
intro port. These flows are **not run in CI** and are **not a merge blocker**
(requirements R5.3, tasks.md public-legal task 6). They need the isolated G1
test environment (and macOS minutes / G3 for iOS on a device). Recorded here
and in `docs/validation/VTID-05451/staging-tests.json`.

Parity reference: the mobile-web (`PublicAppShell`) branch of each page at
390×844 on the read-only staging web app.

Flows (to author on G1; signed out, navigate, read — nothing is submitted to a
live system):

- `01-public-landing.yaml` — the storefront: VITANA wordmark, the five portal
  cards; tap Maxina → `/_intro/maxina`.
- `02-legal.yaml` — `/privacy`, `/terms` (scroll, DE/EN toggle) and
  `/maxina_support` (open one FAQ answer).
- `03-invite-apply-intro.yaml` — a `maxina://i/<code>` link lands on the Join
  tab; `/apply` renders and shows a client-side validation error; the intro
  renders and Login hands over to `/maxina`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/public/` and the typecheck / bundle / deps / parity gates.
