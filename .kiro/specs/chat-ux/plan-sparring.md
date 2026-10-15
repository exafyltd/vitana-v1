# Plan — chat-ux: review, VTID and merge of Kiro's four lanes (vitana-v1)

Change class: **standard** (four PRs, one touches the realtime message hook).
Repo: exafyltd/vitana-v1, base main @ 9dd4c9f. Source session: kiro-202610150833-75c8.

<!-- plan:begin -->
## Goal
Bring four Kiro PRs (client-only, no migrations, no backend) through the gates and merge those that pass.
Owner reports they address: (1) a message from the person whose chat is open still raises a notification that stays unread; (2) opening a chat / tapping a message notification visibly scrolls; (3) the emoji picker's recents never reflect real use and should show at least two rows; (4) too much empty space around messages (Telegram-like density wanted).

## PRs and exact scope (head SHA at review time)
| PR | Lane | Head | Files |
|---|---|---|---|
| #1422 | notifications-self-chat | e545c3a | `src/hooks/useGlobalMessages.ts` (+30/-4): in the realtime `chat_messages` INSERT handler compute `isViewingThisThread` (foreground test via `isAppilix()` / `document.hidden` / `document.hasFocus()` AND `activeThreadIdRef.current === peerId`); when true skip `notifyNewMessage` and skip the `unread_count` bump |
| #1423 | instant-scroll-on-open | f1987b6 | `src/components/messages/ConversationView.tsx` (+5/-1): notification deep-link `scrollIntoView` `behavior: 'smooth'` -> `'auto'` |
| #1424 | recent-emojis | 9169441 | `src/components/ui/emoji-picker.tsx` (+64/-7): recents persisted in `localStorage` key `vitana:emoji:recent:v1`, MRU, dedup, cap 24, seeded with 16 so >= two `grid-cols-8` rows, re-read on popover open |
| #1425 | compact-density | 41df1c5 | `ConversationView.tsx` + `MessageBubble.tsx` (+4/-4): scroll container `px-4` -> `px-2 sm:px-3`, message gap `mb-2` -> `mb-1.5`, bubble `px-4 py-2` -> `px-3 py-1.5`, row `gap-2` -> `gap-1.5`, bubble max width `85vw` -> `90vw`. Shared mobile + desktop |

All four PRs currently fail the `change-suite` check only: "PR changes community-app deploy paths but its title names no VTID" (CLAUDE.md rule 47). All other checks (Vitest, pr-gate, i18n, preview-e2e, preview-deploy) are green on #1422; to be re-verified per PR.

## Steps
1. Create `.kiro/specs/chat-ux/` (requirements.md, design.md, tasks.md, handoff.md, lanes/{_plan,notifications-self-chat,instant-scroll-on-open,recent-emojis,compact-density}.md) in the repo's existing collab format, on branch `claude/magical-shannon-atmj3k`, merged via its own docs-only PR (no deploy, so no Gate 2).
2. After owner approval, allocate four VTIDs (one per lane; one per distinct fix), citing this sparring record; set ledger rows in_progress/approved.
3. Per PR: independent code review against the diff and surrounding code (no assumption from PR text); check out head, run `tsc`, `eslint` on changed files and the touched Vitest suites locally.
4. Per PR, push to Kiro's branch a single commit adding `docs/validation/<VTID>/{plan-sparring.md,scope.json,staging-tests.json}` and retitle the PR `VTID-0xxxx (chat-ux/<lane>): ...` so `change-suite` passes. Kiro's code is not rewritten except for review findings the partner or I raise (listed in responses).
5. Staging tests are read-only (rule 48): chat behaviour that needs a message write is proven by Vitest. Where a unit test is missing and cheap (emoji recents MRU/dedup/cap/seed-backfill; thread-viewing notification suppression), the PR gets one added in the same push (rule 47).
6. Merge order: #1423, #1424, #1422 (independent files), then #1425 last because it overlaps `ConversationView.tsx` with #1423 (rebase/merge-main handled by update-branch, conflicts resolved by merge not history rewrite).
7. #1425 (density) is shared mobile + desktop and subjective. Do NOT merge on green CI alone: attach before/after screenshots (desktop 1400x900, mobile 390x844, plus an RTL/Arabic view) taken from the PR's preview build against existing content only (no writes), and ask the owner for a visual yes. It is the only owner question beyond Gate 1/Gate 2.
8. After each merge to main: watch the staging deploy and STAGING-VERIFY for the merge commit (self check-ins via send_later); then send ONE Gate 2 message listing the verified commit, every commit between production and it, and a Decisions-taken list. Production deploy only after the owner's "yes" to Gate 2, pinned to the verified commit.
9. Update lane files to done/parked, handoff.md, and run `repowise update` / `graphify update .` as CLAUDE.md requires.

## Out of scope
No Supabase writes or migrations, no production test traffic, no changes to `notifyNewMessage` itself, no What's New cards (fixes/restyles only), no native-parity ledger rows (no new page).

## Test plan
- `npx vitest run src/hooks/useGlobalMessages src/components/messages src/components/ui/emoji-picker` (+ added tests), `npx tsc --noEmit` diff vs main, eslint on changed files (i18n and design rules at error level).
- STAGING-VERIFY smoke suite + each VTID's `staging-tests.json` (Vitest `existing` refs, read-only).
- Visual evidence for #1425 only.
<!-- plan:end -->

## Planner responses
(none yet — round 1)

### Round 1 responses
- F1 ACCEPTED. The foreground half of the `notifyNewMessage` skip is dead code (pushNotifications.ts:579 already returns when foreground, and `isViewingThisThread` requires foreground). Plan change: #1422 review requires dropping the redundant `notifyNewMessage` guard (or reducing it to a comment); the `isViewingThisThread` boolean stays only for the `unread_count` bump. Consequence recorded: the PR then fixes only the optimistic badge, so review step 3 gains an item — trace where the owner's "notification that stays unread" is actually created (server-side `user_notifications` rows / gateway push vs. this local path). If the symptom originates server-side, #1422 is merged only as the badge fix, its VTID title says so, and the server-side half is filed as a separate lane for vitana-platform (not merged as "fixes the report").
- F2 ACCEPTED. Review confirms ConversationView's markAsRead covers incoming messages (messages.length dependency) and the PR adds a comment that the suppression is optimistic and the server read mark converges via markAsRead. No further code.
- F3 ACCEPTED. Review traces which code path a standard new-message notification tap takes versus `initialScrollMessageId`; PR title/description and lane file state precisely what #1423 covers. Owner intent cannot be asked of Kiro; it is stated as "reaction/deep-link path only" unless the trace shows more.
- F4 ACCEPTED. pr-gate design ratchet is green on the current head; re-confirm on the final head, add the design escape hatch only if it flags.
- F5 ACCEPTED as note. Owner asked for >=2 rows; seeded fill is kept and logged under "Decisions taken" for Gate 2. Tab label is the existing English category key, not changed here (pre-existing i18n debt, not widened).
- F6 ACCEPTED. Plan step 6: every PR is updated against current main at merge time; ordering only reduces conflicts.
- Q1 Expected behaviour stated: backgrounded app -> notification fires and badge bumps (unchanged); suppression applies only to focused app with that thread open.
- Q2 See F3.

### Round 2 (partner)
F1-F6 closed. New analysis: server-side trigger `trg_notify_chat_message` creates user_notifications + push, so #1422 as scoped fixes only the optimistic badge; review trace item judged sufficient. No new blocker/major.

## Verdict
CONVERGED (2 rounds, standard class).

## Approval
Owner Gate 1 2026-10-15: "Yes, go ahead". Plan hash sha256:622f7a04b7cbd28c0c3151a6ab8e563c8a11334add0ac64d980922414a42007e
