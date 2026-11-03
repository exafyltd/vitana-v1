# Maestro — business / commerce-mode lane (VTID-05524) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native business / commerce-mode port. These flows
are **not run in CI** and are **not a merge blocker** (requirements R5.3,
tasks §7). They need the isolated G1 test environment (and macOS minutes / G3
for iOS on a device). Recorded here and in
`docs/validation/VTID-05524/staging-tests.json`.

This cluster is mostly supplier write surfaces (register a business, AI setup,
products, CSV import, sales setup, partner terms, submit for verification,
connect a shop, invites, health-order actions, AI-assistant consent). At G1 the
flows run only against the isolated test environment and only open and read:
no sheet is saved, no invite sent, no consent decided.

Flows (to author on G1):

- `01-commerce-portal.yaml` — `/commerce` as a guest (hero, story landing) and as
  a member with a business (hero, "Get ready to sell", organizations, CSV entry,
  health-orders link); open and close each setup sheet; parity vs the 390×844
  read-only staging `/commerce`.
- `02-business-mode.yaml` — switch into each business role through the role
  switcher; the business bottom bar (org_admin: overview · team · orders ·
  settings; staff: overview · orders · inbox · settings; professional:
  overview · orders · messages · settings); `/commerce/team` roster,
  `/commerce/health-orders` and `/inbox`.
- `03-deep-links.yaml` — cold start on `/commerce/invites/<expired>/accept`,
  `/commerce/connect/authorize?authorization_id=<unknown>` and
  `/commerce/connections/<id>`: the native screens, error states only.
- `04-public-pages.yaml` — signed out: `/commerce/join`, `/commerce-login`,
  `/commerce/connect`, `/commerce/connect/privacy?lang=en`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/business/` and the typecheck / bundle / deps / parity gates.
