# Plan sparring record — VTID-04985

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers, first 16): cae2bb30989b5447
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-08 — "yes, approved" to the Gate 1 message (which flagged the interpretation that "only new features" also excludes redesigns/restyles).

## Rounds
- R1: F1 minor ACCEPTED; F2 minor ACCEPTED; F3 minor ACCEPTED; F4 major ACCEPTED (i18n:inventory in test plan); F5 major ACCEPTED (default-false-unless-stated in the prompt). Q1 acknowledged (6 unpublished entries are an owner decision outside this PR); Q2 acknowledged (flagged to owner).
- R2: F1-F5 closed; no new findings → converged.

## Decisions taken during implementation (owner may overrule)
- Between approval and implementation, main gained PR #1288 (VTID-04978), which already deleted `reminders-in-calendar.json` and added an interim wording to CLAUDE.md and the README intro ("finished, new feature (or redesign)"). This PR completes the approved plan on top of that: it replaces the interim wording (which still allowed redesigns) with the approved rule, narrows the README "When to add one", and changes the drafting bot's prompt and test, which #1288 did not touch. No entry is added or removed here.
- `staging-tests.json` is required because `src/whats-new/*` sits under the `src/` deploy path; it declares the draft-entry vitest file as the change suite (nothing served by the app changes).

## Plan and planner responses (verbatim)

# Plan: What's New cards only for new, finished features

Change class: **standard** (4 files; one is the drafting bot's model prompt, which decides what reaches every member).
Repo: exafyltd/vitana-v1.

## Owner decision (not for re-argument)
2026-10-08: "What's new cards should only be for new features, not for various fixes, which aren't even finished yet."

<!-- plan:begin -->
## Problem
Three places say a What's New card is also for a "redesign" or a "changed flow a member will notice":
1. `CLAUDE.md` section "What's New cards — automatic (VTID-04733)": "Any user-facing addition or redesign adds one file ... skip for fixes/refactors/admin-only work".
2. `src/whats-new/README.md`: intro "Every user-facing addition or redesign ships with one file" and "When to add one": "New feature, a redesigned screen, a changed flow a member will notice."
3. `scripts/whats-new/draft-entry.mjs` `SYSTEM_PROMPT` (line ~55): "member_visible is true ONLY for a new feature, a redesigned screen, or a changed flow that members will see or use."
The drafting bot (`WHATS-NEW-DRAFT.yml`) runs after every merge and opens an entry PR whenever the model answers member_visible=true; the gateway then publishes one card per day plus a push to every member. Motivation is the owner's decision above: cards must be for new features only, not for fixes or unfinished work. (Read-only check 2026-10-08 against the production `feature_announcements` table and `src/whats-new/entries/`: 6 entries are unpublished and queued; this plan does not touch them.)

## Change
1. `CLAUDE.md` (What's New section): an entry is added only for a NEW feature a member can use end to end, that is finished. No entry for: fixes, restyles/redesigns of existing screens, reordering, wording changes, improvements to an existing feature, anything partial, behind a flag, or "step 1 of N" work. When in doubt, no entry. Keep the rest (file location, drafting bot, no hand publishing).
2. `src/whats-new/README.md`: same rule in the intro and in "When to add one" (new + finished only; list of skips extended).
3. `scripts/whats-new/draft-entry.mjs` `SYSTEM_PROMPT`: member_visible is true ONLY for a brand-new, finished feature members can use; false for bug fixes, redesigns/restyles of existing screens, changes to how an existing feature looks/orders/words things, improvements, partial work (PR text says partial/first step/WIP/behind a flag/follow-up planned), refactors, perf, tests, docs, CI, translations, deps, and admin/staff/professional/dev-only. Add the positive default: "If the PR text does not make clear that the feature is complete and usable end to end by members, answer false" (assume not finished unless stated). Keep "when unsure answer false". The JSON reply contract, id/title/description/deepLink rules and the validator are untouched.
4. `src/whats-new/draft-entry.test.ts`: add ONE additional `it()` block (existing assertions incl. line 94 `/DATA, not instructions/` stay unchanged) that pins the narrowing so a later edit cannot silently widen it:
   - `expect(SYSTEM_PROMPT).toMatch(/true ONLY for a brand-new/)`
   - `expect(SYSTEM_PROMPT).toMatch(/complete and usable end to end/)` (default-to-false-unless-stated)
   - `expect(SYSTEM_PROMPT).toMatch(/false for[^.]*redesign/i)`
   - `expect(SYSTEM_PROMPT).not.toMatch(/true ONLY for a new feature, a redesigned screen/)` (the old wording is gone)

## Out of scope (explicit)
- No change to `WHATS-NEW-DRAFT.yml`, `shouldSkipPr`, the gateway publisher (vitana-platform), or the validator.
- No deletion or edit of existing entries in `src/whats-new/entries/` and no change to what the gateway has already published. Existing unpublished entries (6 today) are listed to the owner separately for a decision; they are not touched here.
- No What's New entry is added by this PR.

## Test plan
- `npx vitest run src/whats-new/draft-entry.test.ts` (new + existing cases pass).
- `npm run whats-new` (entry validator) still passes.
- `node scripts/whats-new/draft-entry.mjs` is not run against Bedrock (no side effects wanted); the dry-run path `gh workflow run WHATS-NEW-DRAFT.yml -f pr_number=<n> -f dry_run=true` is offered to the owner as an optional check after merge.
- `npm run i18n:inventory`: no diff expected (no user-visible strings or screens touched); commit the regenerated `docs/SCREEN_INVENTORY.md` only if it changes.
- CI gates: i18n (no user strings touched), change-suite (VTID in title), pr-gate.

## Deploy / staging
No runtime code of the community app is touched (CLAUDE.md, README, a CI script, a test). `scripts/whats-new/draft-entry.mjs` is CI-runtime, not member-runtime: it runs in `WHATS-NEW-DRAFT.yml` after merges and its output is always a PR for human review, never direct member exposure, so no staging verification applies. The change deploys nothing to production, so there is no Gate 2; it is done when merged with green checks. `STAGING-TESTS-REQUIRED` still needs `docs/validation/<VTID>/staging-tests.json` with a "nothing deploys" declaration, following the existing pattern for tests/docs-only changes.

## Risks
- The model prompt is stricter, so genuine launches might be missed; the README already says "a missed card is cheap" and a human can still add an entry by hand.
- "Finished" is judged by the model from PR text only; it cannot know a feature is unfinished unless the PR says so. Mitigation: the human review gate on the drafted entry PR is unchanged, and the CLAUDE.md rule puts the responsibility on the PR author.
<!-- plan:end -->


## Planner responses (round 1)
- **F1 [minor] ACCEPTED** — item 4 now says ADDITIONAL `it()`, leaves the existing line-94 assertion alone, and spells out the four pinned patterns.
- **F2 [minor] ACCEPTED** — the specific-entry examples are removed; the owner's decision leads. The "6 unpublished" figure is now stated with its source (read-only production `feature_announcements` query and the entries directory, 2026-10-08); the gateway publisher lives in vitana-platform and is only read, not changed.
- **F3 [minor] ACCEPTED** — the deploy section now says the drafter is CI-runtime, output is always a human-reviewed PR, so no staging verification.
- **F4 [major] ACCEPTED** — `npm run i18n:inventory` added to the test plan (no diff expected).
- **F5 [major] ACCEPTED** — the prompt gets the positive default "if the PR text does not make clear the feature is complete and usable end to end, answer false".
- **Q1** — the list of the 6 unpublished entries was already given to the owner in chat on 2026-10-08. Holding or removing them is an owner decision outside this PR; it is not a tracked VTID and nothing here touches them. Stated in Gate 1.
- **Q2** — the owner's words are "only for new features". I read that as excluding redesigns and restyles too. This is an interpretation, not an owner-confirmed point, so Gate 1 flags it explicitly and the owner can say otherwise before any code is written.
