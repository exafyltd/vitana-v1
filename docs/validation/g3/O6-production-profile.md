# O6: Production profile decision

- **Item:** O6
- **Status:** **open** (recorded 2026-11-12; the owner has provided nothing yet)
- **Plan:** `native-eas-builds-r2` (VTID-05669, lane `store-owner-gate`), plan.md "Owner-gated inputs"
- **Gate and order:** G3 plus an owner decision (`NATIVE-APP-PLAN.md` §8). Order: last, after G3.

## What the owner must do
- Decide whether and when a `production` build profile exists. Default until the owner decides: **none**.

## Which lane waits for it
No lane in this plan. `eas-profile-guard` fails any build if a `production` profile or `submit.production` appears.

## Owner's decision
Not provided yet. Identifiers, names and choices below are left for the owner; none is guessed here.

- Decision: none yet (default: no production profile)

## Rules for this record
No key, token, password, secret path or account secret is ever written here. When the owner provides the input, Kiro
changes the status to **done**, adds the date and the non-secret account or app name, and leaves the lane open until
every record is done.
