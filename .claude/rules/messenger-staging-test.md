# Messenger staging test — PROPOSED RULE (draft, not in force)

Status: draft for the owner to accept, change or reject. It does not override
`CLAUDE.md`, rule 31, rule 31b, rule 32 or rule 43. Those still apply in full.

## Fixtures that already exist

- Test group: `TEST GROUP` (thread `06e8954e-162a-4da0-b889-ce6092e2733b`). Created
  by the owner for testing. Participants: the owner (admin, a real member) and
  `af9ce9ea-e317-46ec-9689-6da591ffdbf0` (member, the dedicated test account).
  It is NOT a no-real-members group.
- Test users found in the codebase:
  - `e2e-staging-group@vitanatest.exafy.io` (`af9ce9ea-…`): dedicated; registered
    in `service_bot_accounts` and `notification_test_actors`.
  - `e2e-1776584490-6426@vitanatest.exafy.io`: pattern-matched test account.
  - `e2e-test@vitana.dev` (`a27552a3-…`): shared account. Rule 31 forbids every
    write as it. Reads only.

## What the machine may do without a human

1. Sign in as a test user (sign-in is the only allowed write).
2. Read `TEST GROUP` and the messenger screens as that user: GET requests only,
   through the staging guard (`tests/e2e/staging/staging-guard.ts`).
3. Run the staging suite and report the result against the staging commit.

## What still needs a written approval for each action

- Any write as a test user: posting, joining, leaving, editing, reacting, sending
  media, changing settings.
- Creating a group or a user, changing allowlists, running SQL against production,
  allocating a VTID.
- Any test against `vitanaland.com` (production).

## Why this is a draft

Staging shares the production Supabase project, so any write made from a
staging run lands in production. The approval gates protect real members, not
only the test group.
