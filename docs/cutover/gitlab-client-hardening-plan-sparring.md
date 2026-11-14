# Plan sparring record: gitlab-client hardening (items 28–31)

Verdict: **CONVERGED** (round 2, 2026-11-14). Plan hash (sha256 of the text between the plan markers): `ac96be89c0fad9221985d731a7621c37e39fa882bbbc2c1f1d0b23da53cef21c`.
Change class: standard. Rounds used: 2 of 3. Target repo: `vitana/vitana-platform` (GitLab).
VTID: **not yet allocated.** VTIDs come only from CI PLAN-SPAR. Implementation is blocked on (a) write access to
`vitana/vitana-platform` from this session, which the owner has not confirmed, and (b) the VTID.

Round 1 findings: F1 major (stateful `g`-flag regexes in the path check), F2–F4 minor (where the token comes from,
`serializeQuery` reachability, double-call test), F5 minor (unverifiable claims). Round 2: all closed, no new blocker or
major. Note from the partner: the plan's non-global copy of `TOKEN_SHAPE` also adds the `i` flag, which catches uppercase
token prefixes; that is intended and is stated in the final plan.

## Final plan
<!-- plan:begin -->
## Problem
1. `scripts/eng/gitlab-api.mjs` puts the caller's path into errors and `GitLabApiError.path` without redaction.
   Redaction (`redact`) covers response bodies and messages, not the path. The path check (`PATH_OK`) accepts every
   character a GitLab token uses (`[A-Za-z0-9_.~=-]`), so a path that contains a token passes the check and is echoed
   into `GitLabApiError.message`, `.path`, and log events (`prepare`, `execute`, `failureFor`, `decode`, `paginate`).
   The module's header claims the token "is not in any error", so the claim does not hold for paths.
2. `docs/validation/VTID-05537/outputs/mutate-gitlab-client.sh` line 173 (mutant "error path keeps the query") has an
   unescaped `${...}` inside its perl replacement. The mutant made an empty-URL change, not the named one, so its
   "caught" result does not test the named behaviour.
3. `acceptance.md:28` says a per-test red is not available; a stub module gives one. The header's "no URL escaping"
   remark is inexact: `=` and `~` are URL-encoded (`%3D`, `%7E`). The PR body still states the old counts.

## Change
1. **Refuse token-bearing paths.** In `prepare()`, which is defined inside `createClient` and so closes over `secret`
   (the configured token), refuse before anything is sent a path that contains `secret`, or that matches a non-global copy
   of `TOKEN_SHAPE` or `BEARER`. The module-level regexes carry the `g` flag, so `.test()` on them is stateful: the check
   uses `path.search(PATH_TOKEN_SHAPE) !== -1` with `PATH_TOKEN_SHAPE = new RegExp(TOKEN_SHAPE.source, 'i')` and
   `PATH_BEARER = new RegExp(BEARER.source, 'i')`, both without `g`. `redact()` is unchanged, since `replace` ignores
   `lastIndex`. `serializeQuery` is module-private and called only from `prepare()` (verified in the evidence), so it needs
   no check of its own. Error: code `bad_path`, message
   `the path contains a credential; send credentials in the client's token option, never in a path`. The message and the
   `path` field carry no part of the path. `paginate()` runs the same check before its first `checkNumber` / `badRequest`,
   because those messages include the path too.
2. **Test first.** In `gitlab-api.test.mjs`: (a) a path containing the token → rejects with `code: 'bad_path'`, and the
   same call is made twice in a row, both rejected (this exposes any stateful `.test()`); the message,
   `JSON.stringify(err)`, and `err.path` contain no token; the injected fetch is never called. (b) the same through
   `paginate()`. (c) a path that merely contains `glpat-` followed by 10 characters is refused. (d) a normal path such as
   `/projects/1/merge_requests` still passes. Record (a)–(c) red on `origin/main` in `commands.log` before the code.
3. **Mutation harness.** Rewrite the perl replacement of "error path keeps the query" so its `${...}` is escaped and it
   changes the URL line only. Re-run the harness. Add one mutant for item 1: removing the path check makes (a) red.
4. **Correct the evidence.** `acceptance.md:28`: a per-test red is available through a stub module; cite the stub run.
   Header lines 18 and 205: state that `=` and `~` are URL-encoded. Update the counts in `acceptance.md`,
   `commands.log` and the PR body from the re-run.

## Not in scope
- Changing any other check, retry rule, status mapping or the public API.
- Merge-bot, github-bridge, gateway-delivery and settings lane items (items 24–27, 32, 33 of the owner's list).
- Any production write, GitLab project setting change, token rotation or deploy.

## Verification of the change
- `node --test scripts/eng/gitlab-api.test.mjs` and `node --test scripts/eng/` green, with the new cases red before the code.
- The mutation harness re-run: every named mutant caught, including the new path-refusal mutant; the counts match the log.
- `git diff --stat`: only the five files above change.

## Rollback
Revert the commit. No runtime behaviour outside the client changes.
<!-- plan:end -->
