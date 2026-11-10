# O3: Google Play Console, Android package name and upload key

- **Item:** O3
- **Status:** **open** (recorded 2026-11-08; the owner has provided nothing yet)
- **Plan:** `native-eas-builds-r2` (VTID-05669, lane `store-owner-gate`), plan.md "Owner-gated inputs"
- **Gate and order:** G3 (`NATIVE-APP-PLAN.md:118`). Order: after O1; independent of G1. Internal Android builds do not wait for O3; only the Play submit does.

## What the owner must do
- Confirm Play Console access.
- Choose the final Android package name (it cannot change later).
- Decide whether the Play upload key is EAS-managed or exported.
- Create the Play service account with API access and store its key file in EAS (not in the repository, not as a new GitHub secret).

## Which lane waits for it
The Android part of `eas-submit-workflow`.

## Owner's decision
Not provided yet. Identifiers, names and choices below are left for the owner; none is guessed here.

- Android package name: owner to choose
- Upload key: EAS-managed or exported: owner to choose
- Whether the G3 contingency applies (new listings with new identifiers): owner to decide

## Rules for this record
No key, token, password, secret path or account secret is ever written here. When the owner provides the input, Kiro
changes the status to **done**, adds the date and the non-secret account or app name, and leaves the lane open until
every record is done.
