# GitLab cutover checklist (cut moved to 18:00 CET, Saturday 14 November 2026)

Owner decisions (2026-11-14):
- The cut moves from 16:00 CET to **18:00 CET (17:00 UTC)**. Go/no-go moves from 15:30 to **17:30 CET**.
- The owner runs the cut steps. Claude prepares this checklist and verifies facts that can be read.
- The 137 archived commits on `archive/main-pre-cutover-4c4694b7` come back as one GitLab merge
  request **after** the cut, and only on the owner's explicit instruction naming the plan.

Source: status report from the Kiro 5 session (vitana-platform PR #5085, not readable from this
session). Items below are as that report states them, unless marked "verified".

## Verified from this session (2026-11-14)

- GitHub `exafyltd/vitana-v1` `main` = `78455457`. GitLab `vitana/vitana-v1` `main` = `78455457`.
- GitLab `vitana/vitana-v1` has no `.gitlab-ci.yml` in its repo. Its CI config path points to
  `vitana/ci-config`, so the file is not in the repo (verified: pipelines run without one).
- Pipeline 366 (`vitana-v1`, `main`, `78455457`): `build` success, `unit-tests` success,
  `lint` failed with `allow_failure: true`. The pipeline reports success, but lint is not a gate.
- Rehearsal MR !1 (`vitana/rehearsal`, "shadow run: platform delivery pipeline (do not merge)"):
  still open, no conflicts. Its only pipeline on `shadow/platform-main` is **306, failed**, from
  2026-11-12. The report says the failure is the old `unit` job. Not re-run.
- `vitana/vitana-v1` on GitLab has **no merge requests**.
- `vitana/vitana-platform` on GitLab has many open draft MRs for VTID-05023 (iids 33 to 42 shown).
  Several target `cutover/vtid-05623-welcome-trigger`, not `main`.
- The mirror: branch `claude/gifted-dirac-7cai2w` is on GitHub only (PR #1694). The mirror deletes
  GitLab-only branches, so every branch must also exist on GitHub until the cut.

## Owner steps, 17:30 CET go/no-go

Go only if every item is done. If any is open, the cut moves to a later time.

| # | Item | Owner | State (verified or reported) |
|---|------|-------|------------------------------|
| 1 | GitLab push mirrors to GitHub for both projects (`main` only, SSH), with a GitLab deploy key that has write access on GitHub | owner + Claude | reported not done |
| 2 | GitHub ruleset on `main` in both repos blocking updates, deletions and force pushes, with only the deploy key allowed. Created **switched off**. | owner | reported not done |
| 3 | Kiro accounts' GitLab connection includes `vitana/vitana-platform` and `vitana/vitana-v1` (every call is 403 today). Claude's GitLab connector needs authorizing in claude.ai settings. | owner | reported not done |
| 4 | Merge-request checks on GitLab: delivery pipelines green on one MR per project. Enable main and build runners. vitana-v1 CI jobs need access to clone vitana-platform. Then switch checks on in `gitlab-settings.json`. | Claude + owner | rehearsal MR !1 failed (pipeline 306); pipeline 366 has lint failing (allowed) |
| 5 | "Deliver only to GitLab" rule in both repos, loaded by every agent session | Kiro | reported not started |
| 6 | Decision on the 137 archived commits | owner | **decided**: one GitLab MR after the cut |

## Owner steps, 18:00 CET cut

1. No merges on any repo from 17:45 CET.
2. Check GitHub `main` = GitLab `main` in both repos.
3. Switch the ruleset on.
4. Stop the old mirror on the GitLab host: `sudo systemctl disable --now vitana-mirror.timer`.
5. Turn the Dev Autopilot kill switch on.
6. On the staging gateway set `PM_AGENT_ENABLED=false` and `DELIVERY_HOST_*=gitlab`.
7. Run one small MR per project through the checks.

## Still on GitHub after the cut (per the plan)

- Plan sparring and VTID allocation (PLAN-SPAR), which needs plan PRs on GitHub.
- STAGING-VERIFY.
- The vitana-v1 staging deploy, which keeps running from mirrored `main` until the GitLab AWS role exists.
- PUBLISH to production, migrations, scheduled jobs.

## Open items not covered by the cut

1. STAGING-VERIFY `verify` job uses `--sha "$CI_COMMIT_SHA"` on the per-landing path, while the
   nightly job uses `--sha-from-staging` (in the central `tpl-verify.yml`). The per-landing job can
   wait for a commit staging never serves. Needs plan sparring before a fix.
2. `SUPABASE_ACCESS_TOKEN` in `vitana-platform` CI: owner rotates it or accepts the risk in writing.
3. Migration `moveset/040300`: unrecorded in `schema_migrations`. Assigned to the Supabase-to-Aurora session.
4. Migration approval rule (`collaboration.md` §7d, owner-autonomy file): amend to match the owner's
   stated rule. Separate PR.
5. `vitana-platform` `main` has 8 failing tests since MR !8 (per the Kiro report). Needs a fix lane.
