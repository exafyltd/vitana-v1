# O4: G1 isolated test environment provisioned

- **Item:** O4
- **Status:** **open** (recorded 2026-11-11; the owner has provided nothing yet)
- **Plan:** `native-eas-builds-r2` (VTID-05669, lane `store-owner-gate`), plan.md "Owner-gated inputs"
- **Gate and order:** G1 (`NATIVE-APP-PLAN.md:100`). Order: G1 comes first, before G2 and G3 uploads that are meant to sign in.

## What the owner must do
- Provision G1 (the `real-g1-switch` step of `native-g1-wiring`). Environment names and hosts: owner to choose.

## Which lane waits for it
Any `test-g1` upload to testers that is meant to sign in (`eas-submit-workflow` real upload). Builds and the refusal-path check do not wait for it.

## Owner's decision
Not provided yet. Identifiers, names and choices below are left for the owner; none is guessed here.

- G1 environment: owner to provision; status tracked in `native-g1-wiring`

## Rules for this record
No key, token, password, secret path or account secret is ever written here. When the owner provides the input, Kiro
changes the status to **done**, adds the date and the non-secret account or app name, and leaves the lane open until
every record is done.
