# Design — chat-ux

Sparred, owner-approved plan: `plan-sparring.md` (hash recorded there). Client-only; no migration, no backend, no Supabase writes.

- #1422 `useGlobalMessages.ts`: `isViewingThisThread` (foreground AND `activeThreadIdRef.current === peerId`) gates only the `unread_count` bump. `notifyNewMessage` self-gates on foreground (`pushNotifications.ts:579`), so the redundant guard is removed (sparring F1). Comment records that suppression is optimistic and `markAsRead` converges the server state (F2).
- #1423 one-line `behavior: 'auto'` at the `initialScrollMessageId` effect; PR text states which path it covers (F3).
- #1424 `emoji-picker.tsx`: MRU in localStorage, seed backfill to 16, cap 24, re-read on open. Seeded fill is a recorded decision (F5).
- #1425 class-token changes only in `ConversationView.tsx` / `MessageBubble.tsx`; design ratchet re-checked (F4).
- Merge order #1423, #1424, #1422, #1425; each updated against current main at merge time (F6).
