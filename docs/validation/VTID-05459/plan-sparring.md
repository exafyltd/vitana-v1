# Plan sparring record — VTID-05459 (native-wave2-inbox-chat-calls-r2 / inbox-list)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform` on the
plan branch `kiro/native-wave2-inbox-chat-calls-r2/plan` at `c6bf7677c`, not yet merged:
`.kiro/specs/native-wave2-inbox-chat-calls-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-02T07:31:46.729+00:00.

- Sparring session: `344459ea-0539-4cb4-ab44-8493d4e91c28` (session 2; session 1 `b722bdfa` escalated on
  round 1 with `evidence_floor_not_met` — the partner's reads hit the shared GitHub rate limit)
- Final plan hash: `aade652c546badfb82c9abc8ba9f17fa427702c9b3b6536c14216542fb39be19`
- VTIDs allocated: VTID-05458 (`conversation-chat`), **VTID-05459** (this lane: `inbox-list`)
- Files: `sparring/round-1.md` (session 1), `sparring/s2-round-1.md`, `sparring/s2-responses-1.md`,
  `sparring/s2-round-2.md` (converged), `sparring/state.json`, `sparring/verdict.md`

## Findings and how this lane honours them

| Finding | Disposition | In this lane |
|---|---|---|
| **R1-F1** — the NEVER-45 member-listing exclusion lives in the `search_global_directory` / `search_tenant_directory` RPCs (`CreateGroupPopup.tsx:51`, `GroupMembersModal.tsx:161`), so the native search must call exactly those RPCs, with a unit test asserting it | accepted | `apps/mobile/src/screens/inbox/data/directory.ts` `searchDirectory` calls only `rpc('search_global_directory', { search_term })` (Community) and `rpc('search_tenant_directory', { search_term, tenant_id_param })` (Network), the same calls as `NewConversationPopup.tsx:125,142`; no member-listing table query. `tests/inbox-chat/inbox-list/new-conversation.test.tsx` asserts the exact RPC name + args for both contexts, that a directory fixture with a service bot and a test actor renders neither, and that no member-listing table is read during the search. |
| **R1-F2** — the class-B inbox hooks imported by `Messages.tsx:28-35` (`useHybridMessages` → `useGlobalMessages` / `useTenantMessages`, `useChatGroupsAsThreads`, `useChatUnreadCount`, `markGroupRead`, `useUnreadSync`, `useProgressiveCount`) are part of the data layer the lanes re-implement natively | accepted | Re-implemented in `apps/mobile/src/screens/inbox/data/`: `global-threads.ts` (`buildGlobalThreadsQueryFn` and helpers), `tenant-threads.ts` (the `useTenantMessages` threads query), `inbox.ts` (`useInboxThreads` = `useHybridMessages` routing + `useChatGroupsAsThreads` merge + realtime / fallback poll, `markAllRead` incl. `markGroupRead`, `useUnreadSync`, `useProgressiveCount`), `unread.ts` (`useChatUnreadCount` store, the shell's `inboxUnread` badge source), `chat-api.ts` (the gateway chat calls). None is in `@vitana/core`. |

Round 2 verified no new premises (GitHub 403 on both repos) and raised no findings; the load-bearing
premises it could not re-check (the 3 ledger rows of this lane, the App.tsx routes, the class-B
classification) were re-measured on this worktree: `apps/mobile/parity/ledger.json` has `INBOX.OVERVIEW`,
`INBOX.ARCHIVED`, `INBOX.INSPIRATION` under `"lane": "inbox-chat-calls"`, all `not_started` on
`origin/main` e530abd0d; `src/App.tsx:1352-1412` routes them; every hook above imports
`@/integrations/supabase/client` or `@/integrations/supabase/realtime` (or reads `window`).

## Owner approval

Owner approval: by policy. The converged plan is approved by policy `converged-auto-v1` (owner decision 2026-10-14,
VTID-05214/05218): a plan sparred by CI whose session converged is approved by policy and
not sent to the owner as Gate 1. The VTID was allocated by CI after convergence
(`lanes/inbox-list.md` log, 2026-11-02T07:32Z).
