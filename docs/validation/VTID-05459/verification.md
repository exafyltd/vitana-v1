# Verification — VTID-05459 (native-wave2-inbox-chat-calls-r2 / inbox-list)

Native Wave 2 inbox-list lane: `/inbox` (`INBOX.OVERVIEW`), `/inbox/archived` (`INBOX.ARCHIVED`),
`/inbox/inspiration` (`INBOX.INSPIRATION`). All commands ran offline (the native app has no production
profile; `assertNotProduction()` refuses prod/staging hosts; tests use a fake gateway and a Supabase
double). Linux, worktree `/projects/sandbox/vitana-v1/.worktrees/native-wave2-inbox-chat-calls-r2-inbox-list`,
base `origin/main` e530abd0d. Every command and its counts: `commands.log`. Red on base: `red-on-base.txt`.

**Not verified on staging: device runtime deferred to G1** (`staging-tests.json` `deferred_g1`,
`apps/mobile/maestro/inbox-chat/inbox-list/README.md`).

## What was built

- `apps/mobile/src/screens/inbox/data/` — the class-B inbox data layer re-implemented natively
  (plan decision 2, sparring R1-F2), same tables / columns / filters / gateway paths as the web:
  - `chat-api.ts` — `GET /chat/conversations`, `GET /chat/unread-count`, `POST /chat/read-all`,
    `GET /chat/groups/`, `POST /chat/groups/:id/read` (web `useChatApi.ts`; Bearer + JSON).
  - `global-threads.ts` — `buildGlobalThreadsQueryFn` (`useGlobalMessages.ts:712-880`): gateway with the
    3 s timeout, legacy `global_*` threads, the `chat_messages` DM fallback, direct + group unread,
    profile enrichment, phantom peers dropped, freshest-wins merge, keep-previous guard, Vitana seed.
  - `tenant-threads.ts` — the `useTenantMessages` threads query.
  - `inbox.ts` — `useInboxThreads` (`useHybridMessages` routing + `useChatGroupsAsThreads` merge, the
    realtime DM bump, the 6 s fallback poll while realtime is down, foreground refetch, the 10 s group
    poll + group realtime), `markAllRead` (global: read-all, participant watermark, chat notifications,
    chat-group reads; tenant: watermark + `unread_sync` broadcast), `useUnreadSync`, `useProgressiveCount`.
  - `unread.ts` — the `useChatUnreadCount` store (direct + Σ group unread, realtime, 60 s reconcile);
    registered as the shell's `inboxUnread` badge source in `src/ports/badges.ts`, so the bottom bar
    and drawer count from app start like the web footer.
  - `directory.ts` — member search via exactly the two web RPCs (NEVER 45); `is_community_user` +
    `create_or_get_global_dm`, `create_tenant_direct_thread`, and `createGlobalGroupThread`'s inserts.
  - `threads-model.ts` — the pure list rules mirrored (conversationHelpers, inboxThreadOrder, the
    chat-group ids, filter / search / sort + per-peer dedupe, the conversation path of a row).
- `InboxScreen.tsx` — the mobile-web inbox: header, the "Search messages" button (Community context
  only, `Messages.tsx:506-519`), Search (expand → filter + dropdown of matches),
  Community / Network `MobileModePill`, "New", All / Direct / Groups / Contacts pills
  (`Messages.tsx:1351-1353`), overflow sheet with
  "Mark all as read" (disabled at 0), skeleton (6 rows, header only), empty state, no-match state,
  `FlatList` of `ConversationCard` twins (row error boundary), progressive rendering.
- `NewConversationSheet.tsx` — `NewConversationPopup` as the kit bottom sheet, incl. its group mode and
  `initialRecipientId` (a contact's "Message" preselects the member, `NewConversationPopup.tsx:62-88`).
- `MessageSearchSheet.tsx` + `data/message-search.ts` — fix round 1: `MessageSearchPanel` (scope `all`) and
  `useMessageSearch`: `GET /chat/search` (q, limit 20, type, local-day from / to, cursor; debounce 300 ms,
  3+ characters, empty pages skipped), hint / searching / error / empty, results with the conversation
  name and the marked snippet, "Show more"; a hit opens `/inbox/u|g/<id>/msg/<messageId>`
  (`Messages.tsx:506-527`, `:1403`). The web date inputs are yyyy-mm-dd fields (no kit date picker).
- `ContactsTab.tsx` + `data/contacts.ts` — fix round 1: `ContactsTabContent` (`Messages.tsx:1388-1394`) with
  `useContacts` (contacts + profile / global-profile enrichment, realtime `contacts-changes`, add with
  `check_phone_on_platform`, delete, search), `ContactListItem` (Message → existing DM or the New sheet,
  `handleMessageContact` `Messages.tsx:572-583`; Invite; Delete behind the confirmation),
  `AddContactDialog` (directory RPCs or manual), `InviteContactButton` (`GET /invites/me`, wa.me / sms: /
  mailto: / share, `invite_sent_at`), "Remove contacts imported from my phone"
  (`DELETE /connected-apps/android-contacts`), empty and no-match states.
- `data/presence.ts` + `PresenceDot` (components.tsx) — fix round 1: `PresenceIndicator` on the avatar of a
  direct card (`MobileConversationCard.tsx:75-81`) from the native twin of `useUserPresence`
  (`thread_presence` read, `presence_global` channel sync, the member's own track + heartbeat upsert, Vitana
  always online). `apps/mobile/src/ui/overlay/presence.ts` is the overlay mount/unmount animation helper
  (`usePresence(open, durationMs, reducedMotion)`), not member presence, so it could not be reused.
- `components.tsx` — `ConversationCard`, `ConversationSkeleton`, `InboxEmptyState`, `RowErrorBoundary`,
  `InboxSubNav` + `InboxPage` (the `messagesNavigation` sub-nav + `StandardHeader` of the sub-pages).
- `ArchivedScreen.tsx`, `InspirationScreen.tsx` — the two static web pages with their tabs, Copy to the
  clipboard and the template-actions sheet.
- `src/ports/inbox.tsx` (kit `Input` / `Label`, lucide glyphs, clipboard), `src/ports/links.ts`
  (`openWebPath`: another lane's screen by web path), route files, `NATIVE_ROUTES` (+3), ledger (3 rows
  `native`, owner `kiro`, `last_parity_check` 2026-11-02), `src/i18n/*/inboxNative.json` (30 keys, DE first).

## Spec deviations and descoped items (evidence)

| Item | Decision | Evidence |
|---|---|---|
| Create-group sheet "twin of `CreateGroupPopup.tsx`, opened from the inbox header" (tasks.md task 2) | Not ported; the mobile web's create-group flow is the New sheet's group mode, which is ported. The user rule "never add UI the mobile web does not show" (R1.1) wins over the task text. | `Messages.tsx:1413` mounts `CreateGroupPopup`, but on the mobile branch nothing opens it: the only mobile caller passes `onCreateGroup` to `MobileInboxEmptyState` (`Messages.tsx:1209`), which destructures it and never renders it (`MobileInboxEmptyState.tsx:19`, no use below). `NewConversationPopup.tsx:90-102` switches to group mode at 2+ members and creates the group (`:349-389`). Both popups call the same RPCs. |
| Action-rail chips (gift voucher, `VitanaIndexChip`, `AutopilotChip` + `AutopilotPopup`), `UniversalCalendarButton` | Deferred to their lanes (same as the home and diary lanes) | `Messages.tsx:1308-1316`, `:1332`, `:1420-1423` |
| Contacts tab "Find Friends" (`ImportContactsButton` → `ContactSyncModal`: phone address book, .vcf file, Google / Outlook / iCloud) | NOT YET PORTED — open question to the driver (fix round 1): the phone address book / .vcf import needs a native module (`expo-contacts` / `expo-document-picker`) in `apps/mobile/package.json` + the app config permission strings, outside the lane paths | `ContactsTabContent.tsx:96`, `:136`; `ContactSyncModal.tsx`; `useContactSync.ts:22-34` |
| `CallProvider` / `CallManager` | conversation-chat lane (plan decision 1) | `Messages.tsx:1274`, `:1425-1427` |
| Archived / Inspiration `ExpandableSearchButton`, `UniversalCalendarButton` | Search only logs its query; calendar is the calendar lane's (diary precedent) | `Archived.tsx:79-83`, `Inspiration.tsx:143-147` |
| Delivery receipts for DMs arriving while the list is open (`queueDelivered`) and the localStorage thread cache | Not on the list: receipts belong to the conversation lane (VTID-05320 delivery state); the in-memory React Query cache stands in for the per-tab localStorage cache | `useGlobalMessages.ts:1887`, `:122-140` |
| Raw server error text in the "start chat" error toast | Unmapped errors show the `inbox.toast.error` title only (no untranslated server text) | `NewConversationPopup.tsx:327-345` |
| Card time format | `Intl.NumberFormat` unit (narrow in English = the web's "5m / 3h / 2d"; long in other languages, where the web's English replacements match nothing) | `MobileConversationCard.tsx:42-51` |

## Safety

No write to Supabase, the gateway or any live system was made: every request in the tests lands in the
fake gateway / Supabase double, and `tests/helpers/no-network` makes any real `fetch` throw. The product
code calls the web's own RPCs and endpoints (including the writes of New / Mark all as read), exactly as
the mobile web does. No migration.
