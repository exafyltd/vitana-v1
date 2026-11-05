# Lane brief — VTID-05459 · native-wave2-inbox-chat-calls-r2/inbox-list

> Working summary. The authoritative spec is in `exafyltd/vitana-platform` on the plan branch
> `kiro/native-wave2-inbox-chat-calls-r2/plan` (not yet merged): `.kiro/specs/native-wave2-inbox-chat-calls-r2/`
> — `plan.md`, `tasks.md` (`<!-- lane: inbox-list -->`, tasks 1–8), `lanes/inbox-list.md`, `requirements.md`
> (R0–R6), `design.md`, `sparring/`. If this file conflicts with them, they win.

## Lane identity
- **Lane:** `native-wave2-inbox-chat-calls-r2/inbox-list` · **VTID:** VTID-05459 (CI PLAN-SPAR, `converged-auto-v1`)
- **Repo:** `exafyltd/vitana-v1`, native app only. No backend, gateway or migration change.
- **Seat:** exafyltd → reviewer seat hotmail · **depends_on:** none (parallel with `conversation-chat`, VTID-05458)
- **Session:** `kiro-exafyltd-202611011658-9f52`

## Scope (3 ledger rows, `"lane": "inbox-chat-calls"`)
| key | web path | web source | native route |
|---|---|---|---|
| `INBOX.OVERVIEW` | `/inbox` | `src/pages/Messages.tsx` mobile branch (1272-1431) + `components/messages/mobile/*` + `NewConversationPopup.tsx` | `app/(app)/inbox/index.tsx` |
| `INBOX.ARCHIVED` | `/inbox/archived` | `src/pages/messages/Archived.tsx` (non-Spotlight layout) | `app/(app)/inbox/archived.tsx` |
| `INBOX.INSPIRATION` | `/inbox/inspiration` | `src/pages/messages/Inspiration.tsx` (+ `InspirationMasterActionPopup.tsx`) | `app/(app)/inbox/inspiration.tsx` |

## Binding decisions
- Data layer re-implemented natively (class B; plan decision 2, sparring R1-F2): `useHybridMessages` →
  `useGlobalMessages` / `useTenantMessages` threads, `useChatGroupsAsThreads`, `useChatUnreadCount`,
  `useUnreadSync`, `useProgressiveCount`, `markGroupRead`. No core change.
- Member search = exactly `search_global_directory` / `search_tenant_directory` with a test (NEVER 45, R1-F1).
- Conversation screens belong to `conversation-chat`; rows navigate by path through `src/ports/links`.
- Mobile-web parity only; nothing the mobile web does not show (R1.1). Device runtime → G1 (`next_actor: owner`).
