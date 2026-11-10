# O2: Apple Developer, App Store Connect and iOS bundle identifier

- **Item:** O2
- **Status:** **open** (recorded 2026-11-08; the owner has provided nothing yet)
- **Plan:** `native-eas-builds-r2` (VTID-05669, lane `store-owner-gate`), plan.md "Owner-gated inputs"
- **Gate and order:** G3 (`NATIVE-APP-PLAN.md:118`). Order: after O1; independent of G1.

## What the owner must do
- Confirm access to App Store Connect (team `62Q26QSEJW`, as named in the plan) and an active Apple Developer membership.
- Choose the final iOS bundle identifier (it cannot change later).
- Create the App Store Connect API key and store it in EAS (not in the repository).
- Create the app record in App Store Connect.

## Which lane waits for it
First iOS device build (`eas-build-workflow`) and the iOS part of `eas-submit-workflow`.

## Owner's decision
Not provided yet. Identifiers, names and choices below are left for the owner; none is guessed here.

- iOS bundle identifier: owner to choose
- App Store Connect app id: owner to choose (created with the app record)
- Whether the G3 contingency applies (new listings with new identifiers, `NATIVE-APP-PLAN.md:118`): owner to decide; this changes the identifiers. Records for that path are added only if the owner chooses it.

## Rules for this record
No key, token, password, secret path or account secret is ever written here. When the owner provides the input, Kiro
changes the status to **done**, adds the date and the non-secret account or app name, and leaves the lane open until
every record is done.
