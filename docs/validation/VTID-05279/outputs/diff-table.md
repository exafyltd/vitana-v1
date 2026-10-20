# Diff review — lane claude-md-cleanup/rules-trim-v1 (VTID-05279)
Base `origin/main` `05cca2209`. The v1 lane retires no numbered rule (v1 `CLAUDE.md` has none); this is the per-row
table of every removal and condensation, for the owner's protected-gate review (plan Decision 11).

## Weakened on purpose (flag — owner confirms)
| Item | Before | After | Why |
|---|---|---|---|
| K — codebase intelligence | "Mandatory Codebase Intelligence Workflow" (`:486-565`) + "graphify" (`:566-574`), 89 lines: always query RepoWise **and** Graphify before any work; mandatory index-freshness check; mandatory pre-execution code map; ban on broad grep / recursive reads; mandatory `repowise update` + `graphify --update` after every change ("a task is not complete until both indexes are current") | "Codebase intelligence — RepoWise and Graphify (recommended)", 13 lines: use them for unfamiliar or cross-module work; compact tool list kept (`get_overview`, `search_codebase`, `get_context`, `get_symbol`, `get_why`, `get_risk`, `repowise update`; `graphify query/path/explain`, wiki index, `GRAPH_REPORT.md`, `graphify update .`, `graphify claude install`) | Owner instruction 2026-10-20 (plan item K, Decision 10, R1-F3). Kept as a rule: source and tests stay the final authority; re-read the source when an index result is stale, approximate or ambiguous. |

## CLAUDE.md (574 → 470 lines)
| Section | Removed | Condensed | Kept |
|---|---|---|---|
| ABSOLUTE RULE — never test against production | — | — | verbatim |
| Autonomy contract (VTID-04947) | — | — | verbatim |
| Collaboration (VTID-05145), roles paragraph (M) | "one Kiro account reviews another's lane" (stale, `collaboration.md` §7 names the reviewer agent) | roles restated against §3a/§7–§7b | session-start line verbatim; Kiro plans/builds/reviews; CI spars + policy approval (`converged-auto-v1`, now named) + CI allocates VTIDs; PM merges under §7b (plan driver while PM not live); Claude Code optional, `executor: claude` → exceptions seat; **added:** protected gate file never merges on a reviewer-agent accept alone; Kiro merges only under §7b, never deploys production, never writes a live system |
| Overview, Stack, Build & Run, Deployment pointer | — | — | verbatim |
| Staging Verification Gate (VTID-04610) | — | — | verbatim |
| Plan Sparring Gate (VTID-04868) | — | — | verbatim |
| Scoping a production deploy | — | — | verbatim |
| Project Structure, Environment, Multi-Repo | — | — | verbatim |
| Testing: test-user UUID, read-only staging note | — | — | verbatim |
| "Why no host is exempt" (VTID-03506), 49 → 17 lines | the rhetorical framing ("This section exists for the follow-up question…", "You cannot…"); workflow line refs (`PREVIEW-DEPLOY-FRONTEND.yml` L69–81, `STAGE-DEPLOY-FRONTEND.yml` L72–93) and `BOOTSTRAP-ORB-STAGING-SUPABASE-ALIGN`; the `community-app-pr-123` / `profile_posts` example; the incident timestamps (14:54–15:00 UTC) and the lock-screen quote | the incident to one "why" clause (5 test posts → `trg_notify_community_post` → 960 notifications, 600 unrecallable pushes, VTID-03503); preview/staging inherit production Supabase to one sentence | every write as this account is banned on every host; preview/staging use the production Supabase project (`docs/STAGING.md` §6/§9b); "the host selects which code runs, not which database gets written"; reading fine everywhere, writing nowhere; community content has no exception; verify via existing content / Vitest / local Supabase, else a blocker; migration `20260805160000` guards (`_notif_is_test_actor()`, `user_notifications` sink guard, `e2e-%`/`@vitanatest.exafy.io`) as seatbelt not permission slip; register new test accounts in `notification_test_actors` |
| What's New, Spotlight, nav registry, parity ledger, native tokens, Commerce UX, Key Patterns | — | — | verbatim |
| i18n hard rule, dates & numbers, catalog register, locales & RTL, AI locale rule | — | — | verbatim |
| Codebase intelligence + graphify (K) | see "Weakened on purpose" | 89 → 13 lines | tool list, source/tests final authority |

## .kiro/steering/vitana-kiro-notes.md (23 → 18 lines)
| Removed | Condensed | Kept |
|---|---|---|
| the "about 1,000 lines" claim (wrong for both repos); the Collaboration bullet's session-start steps (duplicated in `vitana-load-project-rules.md` item 4, `collaboration.md` §3–§5 and `CLAUDE.md`) — moved, not dropped | role line points at `collaboration.md` §7–§7b as the single source of truth | sparring never skipped, CI PLAN-SPAR, no VTID before convergence; resume-vtid; `CLAUDE.md` always included, `.claude/rules` path-scoped; role: plans/builds/reviews, pipeline end to end, Claude optional; §7a never-list (no VTID by hand, no production deploy, no live writes, never accept own lane); entry point `vitana-pipeline.md` |

## .kiro/steering/vitana-load-project-rules.md (26 → 30 lines)
| Removed | Condensed | Kept / added |
|---|---|---|
| — | item 2 role line names §7–§7b as single source of truth and spells out: reviews (reviewer agent accepts, never own lane), merges only under §7b, CI allocates VTIDs, never deploys production, no Supabase/AWS writes, Claude optional | items 1 and 3 verbatim (never test against production; access NOT read-only); item 4 now carries the session-start steps once (session id command, `git fetch --prune origin`, queue, claim, driver §8, plan pushed as a PR) |

Both steering files stay byte-identical across repos only if the `rules-trim` lane (vitana-platform) lands the same
text; that lane had not edited them when this commit was made — see the PR body.
