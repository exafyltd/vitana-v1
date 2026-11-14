# GitLab delivery cutover: owner decisions (2026-11-14)

Status: decided by the owner's delegation on 2026-11-14. Each decision names its
reason, its reversal path, and whether it is complete or still open.

## D1. Source of truth for delivery

- **Decision:** GitHub `exafyltd/vitana-v1` `main` remains the content source of truth
  until the cutover completes. GitLab `vitana/vitana-v1` `main` is a mirror and must equal
  GitHub `main` at every gate run. Both were at `78455457` on 2026-11-14 (verified).
- **Shadow run source:** the GitHub `main` tip at the time of the run. Not the `c7e17d64`
  value from the status report, which I could not verify against any project I can read.
- **Reversal:** none needed; the mirror is one-way GitHub to GitLab.
- **Status:** decided. Shadow run is not yet executed.

## D2. Migration approval (CORRECTED 2026-11-14)

- **Original decision (withdrawn):** staging migrations apply without per-file approval.
- **Why withdrawn:** `.claude/rules/collaboration.md` §7d says `RUN-MIGRATION.yml` and every `apply-*.yml` write
  the production database, because staging shares it. Applying a migration without approval is a production write.
  I should not loosen that gate on the owner's behalf.
- **Current rule:** unchanged. A migration is dispatched only after the owner, in the conversation, approves the
  file(s) and the target database.
- **Owner to confirm:** whether the owner wants a rule change. If so, it needs an explicit owner instruction naming
  the change, and a separate PR.
- **Status:** open, owner decision.

## D3. `SUPABASE_ACCESS_TOKEN` in `vitana-platform` CI

- **Decision:** I cannot rotate this credential from this session, and rotation is an
  action only the owner can perform. Until the owner rotates or confirms it, the token is
  an open security risk, not an accepted one. Accepting the risk in writing is the owner's
  call, not mine.
- **Status:** **blocked on the owner.** Rotate the token, or confirm the risk acceptance in
  writing.

## D4. Migration `moveset/040300` not recorded in `schema_migrations`

- **Decision:** reconciling a migration history row changes a live database. This session
  does not write to live systems. The reconciliation is assigned to the session that owns
  the Supabase-to-Aurora cutover, and that session must confirm the row content first.
- **Status:** open, assigned to the Supabase-to-Aurora cutover session.

## D5. Cutover ordering

- **Decision:** GitHub deploy and verify workflows are disabled only after a GitLab shadow run
  is green and STAGING-VERIFY passes on GitLab for the same commit. Until then, both
  systems run, and GitHub stays the gate of record.
- **Status:** decided.

## Open items

1. Amend `.claude/rules/collaboration.md` §7d and `.kiro/steering/vitana-owner-autonomy.md`
   to match D2. (Not in this change.)
2. Fix the STAGING-VERIFY bug: the `verify` job picks `main`'s tip instead of the commit
   staging serves. This is in the CI config owned by `vitana/ci-config` or `vitana-platform`,
   not in this repo.
3. Verify the rehearsal project's CI config path (owner action, per the status report).
4. Confirm whether `claude/gifted-dirac-7cai2w` is mirrored on GitLab. Not checked.
