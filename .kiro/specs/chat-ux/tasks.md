# Tasks — chat-ux

Executor: Kiro implemented the code (PRs #1422-#1425). Claude Code reviews, adds VTID-titled `docs/validation/<VTID>/` files, merges, watches STAGING-VERIFY, sends Gate 2.

<!-- lane: notifications-self-chat -->
## Lane `notifications-self-chat` · VTID-05200
- [ ] Drop the dead `notifyNewMessage` guard; keep badge suppression + comment; add a Vitest for the suppression.
- [ ] Trace the origin of the notification the owner sees (client vs `trg_notify_chat_message` push); file a platform lane if server-side.
<!-- lane: instant-scroll-on-open -->
## Lane `instant-scroll-on-open` · VTID-05201
- [ ] Confirm which scroll path a notification tap takes; state it in the PR.
<!-- lane: recent-emojis -->
## Lane `recent-emojis` · VTID-05202
- [ ] Vitest for MRU / dedup / cap / seed backfill / storage-unavailable fallback.
<!-- lane: compact-density -->
## Lane `compact-density` · VTID-05203
- [ ] Screenshots desktop / mobile / RTL from the PR preview (existing content only); owner visual yes before merge.
