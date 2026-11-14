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

## D2. Migration approval

- **Decision:** staging migrations apply without per-file approval, as the owner stated.
  Production migrations still require the Gate 2 path. This is a narrowing of the
  conversation-approval rule in `.claude/rules/collaboration.md` §7d, and the rule text
  must be amended to match.
- **Status:** decision recorded. §7d amendment is not yet made (see Open items).

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
