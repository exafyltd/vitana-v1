# Plan sparring record — VTID-04991

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers, first 16): 5dad5ae26e143562
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-08 — "yes, approved" to the Gate 1 message.

## Rounds
- R1: F1 minor ACKNOWLEDGED (14-day expiry covered by the README note); F2 minor ACCEPTED (6-entry count is a manual check, not a CI assertion); F3 minor ACCEPTED (`held/` created on demand, no .gitkeep).
- R2: F1-F3 closed, no new findings → converged.

## Decisions taken during implementation (owner may overrule)
- The plan held five entries. While the plan waited for approval the gateway's 16:00 UTC run (2026-10-08, 16:00:23) published `live-room-interested-list` (`feature_announcements.created_by = scheduled:whats-new:live-room-interested-list`), so that card and push were already out. Moving its file would change nothing (the gateway dedupes on the id), so it stays in `entries/` as the record of what was published. Only the four still-unpublished entries are held: `mentions-everywhere`, `calendar-day-overview`, `calendar-share-to-feed`, `messenger-group-manage`. The built manifest has 7 entries (the 6 earlier published ids + `live-room-interested-list`).
- The hold takes effect in production when a build without the four entries is live; the next gateway run is 2026-10-09 16:00 UTC.

## Plan and planner responses (verbatim)

# Plan: hold five unpublished What's New entries

Change class: **standard** (touches 5 entry files + README + validation docs; effect depends on a later production build).
Repo: exafyltd/vitana-v1. Read-only reference: exafyltd/vitana-platform `services/gateway/src/services/whats-new-publisher.ts`.

## Owner decision (not for re-argument)
2026-10-08: "hold the other five unpublished entries". Context: the owner ruled that What's New cards are only for new, finished features (VTID-04985); these five were queued before that rule.

<!-- plan:begin -->
## What is being held
Five entries in `src/whats-new/entries/` that have no published card yet (verified read-only on 2026-10-08 against production `feature_announcements.created_by like 'scheduled:whats-new:%'`: the six published ids are audiobook-listening-mode, commerce-supplier-onboarding, vitana-index-next-steps, founding-member-year, live-rooms-in-events, calendar-entry-actions):
`live-room-interested-list`, `mentions-everywhere`, `calendar-day-overview`, `calendar-share-to-feed`, `messenger-group-manage`.
(`reminders-in-calendar` was already removed by #1288.)

## How the cards get published (verified in code)
`build-whats-new.mjs:83` reads only the flat folder `src/whats-new/entries/*.json` into `/whats-new.json` of the build. The gateway job (daily 16:00 UTC, max one card per 20 h, oldest first, entries older than 14 days never, once per id) reads the PRODUCTION `/whats-new.json`. So an entry is held when it is absent from the production build's manifest.

## Change
1. `git mv` the five files from `src/whats-new/entries/` to a new sibling folder `src/whats-new/held/`. Content, ids and `added` dates unchanged (a pure move, fully reversible). The builder does not read `held/` (flat `readdir` of `entries/`, line 83), so the manifest drops from 11 to 6 entries.
2. `src/whats-new/README.md`: add a short section "Holding an entry": move the file to `held/` to hold it, move it back to release it (the `held/` folder is created on demand and disappears from git when empty); the id must still equal the file name; an entry whose `added` is more than 14 days old when released will never be published, so update `added` when releasing.
3. `docs/validation/VTID-<new>/*` (sparring record, scope, staging-tests declaration).

## Out of scope (explicit)
- The six already-published entries, the gateway publisher, the kill switch `WHATS_NEW_AUTOPUBLISH`, `build-whats-new.mjs`, the drafting bot.
- No entry text is edited; no new entry is added.
- Nothing is written to production by this PR.

## Timing — the part the owner must know
Production currently serves a build (73e9e08) whose manifest still lists all five. The next gateway run is at 16:00 UTC today and would publish the oldest one (`live-room-interested-list`) plus a push to every member; a posted card cannot be recalled. Merging this PR changes main and staging only. The hold takes effect in production when a production build WITHOUT these entries is live, which is a production deploy and therefore the owner's Gate 2 ("Staging verified — ready for deployment to production?"), scoped as in CLAUDE.md (pinned commit, commits between production and it listed). If that deploy cannot be approved and live before 16:00 UTC, the only other lever is the gateway kill switch `WHATS_NEW_AUTOPUBLISH=false` (a vitana-platform / gateway task-definition change, not part of this plan); the plan reports this to the owner rather than choosing it.

## Test plan
- `npm run whats-new` builds 6 entries and passes the validator (the 6-entry count is a manual check of the `[whats-new] 6 entries` output line, not a CI assertion: `whats-new.test.ts` only checks the manifest's structure).
- `npx vitest run src/whats-new/whats-new.test.ts src/whats-new/draft-entry.test.ts` pass (no test references the held ids; grep verified).
- CI gates: i18n, change-suite (VTID in title), pr-gate, STAGING-TESTS-REQUIRED (`src/` is a deploy path; `staging-tests.json` declares the whats-new vitest files).
- After the later production deploy, the read-only check `GET https://vitanaland.com/whats-new.json` lists 6 entries (the owner runs it; the sandbox cannot reach production).

## Risks
- The hold is only effective once a production build ships; between merge and that deploy the 16:00 run can still publish `live-room-interested-list`. Stated above for the owner's decision.
- Moving files could look like deletion in history; `git mv` keeps the history and the README documents the release path.
<!-- plan:end -->


## Planner responses (round 1)
- **F1 [minor] ACKNOWLEDGED** — already covered by the README note about updating `added` on release (the five expire on 2026-10-20/21).
- **F2 [minor] ACCEPTED** — the test plan now says the 6-entry count is a manual check of the build output line, not a CI assertion.
- **F3 [minor] ACCEPTED** — the README note says `held/` is created on demand and vanishes from git when empty; no `.gitkeep` is added, because an extra file in the folder buys nothing and the builder never reads it.
