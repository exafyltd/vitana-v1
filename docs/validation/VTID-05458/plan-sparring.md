# Plan sparring record — VTID-05458 (native-wave2-inbox-chat-calls-r2 / conversation-chat)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform` on the
plan branch `kiro/native-wave2-inbox-chat-calls-r2/plan`, not yet merged:
`.kiro/specs/native-wave2-inbox-chat-calls-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-02T07:31:46.729+00:00.

- Sparring session: `344459ea-0539-4cb4-ab44-8493d4e91c28` (session 2; session 1 `b722bdfa`
  escalated with `evidence_floor_not_met`, a partner-side GitHub rate-limit failure)
- Final plan hash: `aade652c546badfb82c9abc8ba9f17fa427702c9b3b6536c14216542fb39be19`
- VTIDs allocated: **VTID-05458** (this lane: `conversation-chat`), VTID-05459 (`inbox-list`)
- Files: `sparring/round-1.md`, `sparring/s2-round-1.md`, `sparring/s2-responses-1.md`,
  `sparring/s2-round-2.md` (converged, no findings), `sparring/state.json`, `sparring/verdict.md`
- Re-plan of `native-wave2-inbox-chat-calls` (vitana-platform PR #4269) under a new slug.

## Findings and dispositions

- **R1-F1** (accepted): the member-listing exclusion (NEVER rule 45) is server-side in the
  directory RPCs the web calls (`CreateGroupPopup.tsx:51`, `GroupMembersModal.tsx:161`). The
  native member search must call exactly `supabase.rpc('search_global_directory', { search_term })`
  / `supabase.rpc('search_tenant_directory', { search_term, tenant_id_param })`, never a raw
  table query, with a unit test asserting those calls. Implemented in
  `apps/mobile/src/screens/chat/data/members.ts` (`searchDirectory`), asserted by
  `tests/inbox-chat/conversation-chat/members.test.tsx` (exact RPC name + arguments, one call,
  no `from()` read).
- **R1-F2** (accepted): the class-B inbox hook inventory (`useHybridMessages` →
  `useGlobalMessages` / `useTenantMessages`, `useChatGroupsAsThreads`, `useChatUnreadCount`,
  `markGroupRead`, `useUnreadSync`, `useProgressiveCount`) is re-implemented natively. This
  lane's share is listed in `verification.md` ("Class-B hook inventory").

## Owner approval

Owner approval: by policy. The converged plan is approved by policy `converged-auto-v1` (owner
decision 2026-10-14, VTID-05214/05218): a plan sparred by CI whose session converged is approved
by policy and not sent to the owner as Gate 1. The VTID was allocated by CI after convergence
(`lanes/conversation-chat.md` log, 2026-11-02T07:32Z).

## Scope of this lane (conversation-chat)

Port `INBOX.CONVERSATION /inbox/u/:recipient_id`, `INBOX.GROUP /inbox/g/:chat_group_id` and the
exclusion routes `/inbox/u/:recipientId/msg/:messageId`, `/inbox/g/:groupId/msg/:messageId`,
`/inbox/t/:threadId`, `/inbox/t/:threadId/msg/:messageId`, plus the embedded 1:1 WebRTC calling
(no ledger row). All 6 rows flip `not_started` → `native`. Requirements R0–R6 and design §2b
are authoritative.
