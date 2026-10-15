# Requirements — chat-ux (owner reports 2026-10-15)

- R1 (VTID-05200, PR #1422). The unread badge/count is not bumped for the conversation the member has open with the app focused. Server-side notification rows/pushes created by `trg_notify_chat_message` are NOT changed here (separate platform lane if the trace shows that is what the owner saw).
- R2 (VTID-05201, PR #1423). Landing on a deep-linked message (`initialScrollMessageId`) jumps instantly; no glide. Post-send and tap-to-quote smooth scrolls are unchanged.
- R3 (VTID-05202, PR #1424). The emoji picker's `recent` tab is a most-recently-used list persisted in localStorage (`vitana:emoji:recent:v1`), de-duplicated, capped at 24, and always fills at least two `grid-cols-8` rows (seeded). Component API unchanged.
- R4 (VTID-05203, PR #1425). The conversation is denser (Telegram-like): side padding, message gap, bubble padding, row gap, bubble max width. Shared mobile + desktop, must be sound in RTL. Owner visual check before merge.
