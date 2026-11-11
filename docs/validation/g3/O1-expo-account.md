# O1: Expo account, EXPO_TOKEN and EAS budget

- **Item:** O1
- **Status:** **open** (recorded 2026-11-11; the owner has provided nothing yet)
- **Plan:** `native-eas-builds-r2` (VTID-05669, lane `store-owner-gate`), plan.md "Owner-gated inputs"
- **Gate and order:** G3. Needed before the first build; the owner confirms that this belongs to G3. Order G1 (O4), G2 (not an O item), then G3 where relevant; O1 does not depend on G1.

## What the owner must do
- Confirm the Expo account (name: owner to choose).
- Store the Expo access token as the GitHub Actions secret `EXPO_TOKEN` on `exafyltd/vitana-v1` (the value never goes into the repository).
- Choose the EAS plan and the build-credit budget (owner to choose).

## Which lane waits for it
`eas-build-workflow` (first run), and through it `eas-submit-workflow` and `native-eas-runbook`.

## Owner's decision
Not provided yet. Identifiers, names and choices below are left for the owner; none is guessed here.

- Account name: owner to choose
- EAS plan and credit budget: owner to choose

## Rules for this record
No key, token, password, secret path or account secret is ever written here. When the owner provides the input, Kiro
changes the status to **done**, adds the date and the non-secret account or app name, and leaves the lane open until
every record is done.
