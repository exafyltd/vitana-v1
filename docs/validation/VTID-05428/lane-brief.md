# Lane brief — VTID-05428 · native-wave2-profile-settings-r2/delete-account

> Working summary. The authoritative spec is in `exafyltd/vitana-platform` on `main`:
> `.kiro/specs/native-wave2-profile-settings-r2/` — `plan.md` (decision 1a), `tasks.md`
> (`<!-- lane: delete-account -->`, tasks 1–6), `requirements.md` (R1–R7, R5.1/R5.2), `design.md`,
> `lanes/delete-account.md`. If this file conflicts with those, the spec wins.

- **Lane:** `native-wave2-profile-settings-r2/delete-account` · **VTID:** VTID-05428 (allocated by CI, policy `converged-auto-v1`)
- **Repo:** `exafyltd/vitana-v1` (native app only). No backend, gateway, core or migration change.
- **Seat:** exafyltd → reviewer_seat hotmail · **depends_on:** none
- **Branch:** `kiro/native-wave2-profile-settings-r2/delete-account`
- **Driver session:** `kiro-exafyltd-202611011658-9f52`

## Goal
Port `/delete-account` (web `src/pages/legal/DeleteAccount.tsx`, route `src/App.tsx:847`, public, no
`AuthGuard`) at 1:1 mobile-web parity as `apps/mobile/app/(public)/delete-account.tsx`, reachable
signed out and signed in. 1 ledger row (`/delete-account`, exclusion) → 1 route file.

## Safety
The deletion request (`supabase.functions.invoke("request-account-deletion", { body: {} })`) is
built and asserted against a mocked client in tests and is never sent. No write to Supabase/AWS, no
test against production or staging, no workflow dispatch, no merge. Device runtime deferred to G1.
