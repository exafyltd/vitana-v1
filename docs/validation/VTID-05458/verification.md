# Verification — VTID-05458 (native-wave2-inbox-chat-calls-r2 / conversation-chat)

Native Wave 2 conversation-chat lane: the 1:1 DM, the group chat, the four `/msg/` and `/t/`
deep-link routes and the embedded 1:1 call. All commands run offline (the native app has no
production profile; `assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-inbox-chat-calls-r2-conversation-chat`,
base `origin/main` e530abd0. Every command and its counts: `commands.log`.

**Not verified on staging: device runtime deferred to G1.** No test or command in this
session sent a message, posted to a group, opened a call, uploaded a file or wrote
presence/typing to any live system.

## What was built

- Routes (each its own file; ledger matches by exact `shapeOf`):
  `app/(app)/inbox/u/[recipientId]/index.tsx`, `…/u/[recipientId]/msg/[messageId].tsx`,
  `…/g/[groupId]/index.tsx`, `…/g/[groupId]/msg/[messageId].tsx`, `…/t/[threadId]/index.tsx`,
  `…/t/[threadId]/msg/[messageId].tsx`. No existing `apps/mobile/app/` file shadows them; the
  resolver catch-all ranks below concrete routes, so each is reachable on a cold start (the
  dynamic routes are not in `NATIVE_ROUTES`, like `/news/:id`; `resolve.ts` is unchanged).
- `src/screens/chat/data/` — the class-B data layer re-implemented natively over
  `getGateway()` and the native Supabase client, same endpoints / tables / payloads as web:
  `api.ts` (`useChatApi.ts`: `/chat/conversation/:peer`, `?around=`, `/chat/send`,
  `/chat/read`, `/chat/vitana-reply`, `/chat/groups/:id`, `/messages`, `/send`, `/read`, PATCH /
  DELETE), `thread.ts` (`enrichProfiles`, thread resolution, `buildGlobalMessagesQueryFn`
  gateway → `chat_messages` → legacy `global_messages`), `useConversation.ts`
  (`useGlobalMessages` stream, outbox send with `client_message_id`, Retry / Discard, Vitana
  reply request, debounced mark-read incl. `user_notifications`, `chat_messages` realtime),
  `useGroupChat.ts` (`GroupChat.tsx` state: group + 100 messages, read, realtime, 8 s poll,
  ordered sends, edit/delete, mention candidates, window around a message), `useTyping.ts`
  (`useTypingIndicators.ts`), `useReactions.ts` (`useMessageReactions.ts`), `members.ts`
  (`GroupMembersModal.tsx` queries; member search = the directory RPCs only).
- `src/screens/chat/calls/` — `useCallState.ts` (same channels / events / 30 s no-answer /
  3-attempt broadcast), `useWebRTC.ts` (room channel, offer/answer/ICE, presence join/leave,
  STUN servers, 3 joins), `CallProvider.tsx` (CallProvider/useCall, CallManager,
  IncomingCallModal, CallingScreen, MessengerCall). Mounted inside the DM / thread screen like
  `Messages.tsx:1274,1425-1429`; the web group chat page mounts none, nor does the native one.
- Screens: `ConversationScreen.tsx`, `GroupChatScreen.tsx`, `MessageList.tsx`,
  `MessageBubble.tsx`, `MessageInput.tsx`, `GroupMembersModal.tsx`, `components.tsx`
  (dividers, typing, reply quote / preview, reaction cluster, avatar stack, swipe-to-reply,
  error boundary), `ChatFrame.tsx` (full-screen layer over the shell, as the web chat is a
  fixed full-screen layer on phones), `text.ts`.
- Ports: `src/ports/chat.tsx` (kit Dialog / Textarea, lucide icons, the core re-exports),
  `src/ports/webrtc.ts` (engine door; none registered in this build — see below).
- Core: `src/lib/messaging/grouping.ts`, `src/lib/mentions.ts`,
  `src/lib/messaging/groupSystemNotice.ts`, `src/lib/messaging/groupManagement.ts` re-exported
  (import-free, class A); `closure.generated.json` + `mobile-ci-paths.generated.json`
  regenerated (`npm run gen:core`). `vitanaBotIdentity.ts` (class B, `import.meta.env`) and
  `inAppLinks.ts` (class C) were rejected by `core-closure` and are not in core.
- i18n: `src/i18n/*/chatNative.json` (9 keys) and `callsNative.json` (15 keys), DE first
  (du-form: "Lange drücken …"; fr tu, pt você, ru ты), all 11 locales. Every other string
  reuses existing web keys (`screens.messages.*`, `inbox.*`, `toasts.*`). New keys replace
  strings the web hard-codes in English (TypingIndicator.tsx:19-24, CallingScreen.tsx:42,
  MessengerCall.tsx:176-179, ConversationView.tsx:1116 subtitle).
- Ledger: the six `inbox-chat-calls` rows of this lane → `native`; `--sync` + `--check` OK.

## Red → green

`red-on-base.txt`: the six suites fail on origin/main e530abd0 (modules missing). Green on the
lane head: 6 suites / 132 tests; full `npm test` 90 suites / 2418 tests.

## Sparring decisions honoured

- Member search: `searchDirectory()` calls exactly `rpc('search_global_directory',
  { search_term })` or `rpc('search_tenant_directory', { search_term, tenant_id_param })`
  (server-side `service_bot_accounts` + `notification_test_actors` exclusion, NEVER rule 45);
  `members.test.tsx` asserts the name, the arguments, a single call and no `from()` read.
- Class-B hook inventory (plan.md "Measured state"), this lane's share:
  `useHybridMessages` (global branch) → `useConversation`; `useGlobalMessages` read / send /
  read state / realtime → `thread.ts` + `useConversation`; `useTypingIndicators` → `useTyping`;
  `useChatApi` (DM + group) → `api.ts`; `markGroupRead` → `useGroupChat`; `useMessageReactions`
  → `useReactions`; `useCallState` / `useWebRTC` → `calls/`. `useChatGroupsAsThreads`,
  `useChatUnreadCount`, `useUnreadSync`, `useProgressiveCount` belong to the inbox list
  (`inbox-list` lane). `useTenantMessages` — see "Not ported".

## Not ported (mobile web shows it; recorded with web file:line evidence)

| Web UI / behaviour | Evidence | Why |
|---|---|---|
| DM "search in this conversation" button + panel | `src/components/messages/ConversationView.tsx:1245`, `:1557`; `MessageSearchPanel.tsx` (256 lines) + `useMessageSearch` | separate feature (VTID-05317) with its own data hook; follow-up |
| Group chat search button + panel | `src/pages/messages/GroupChat.tsx:541`, `:550` | same |
| "Talk to Vitana" (opens the ORB) | `ConversationView.tsx:1273` | no native ORB-activation entry in `src/ports` (the ORB is the shell's slot) |
| Create-group button in the DM header | `ConversationView.tsx:1283`, `:1574` (`CreateGroupPopup`) | the CreateGroupPopup twin is the `inbox-list` lane's; lanes may not import each other's screens |
| Emoji picker, attachment menu (payments / calendar invite / file picker + upload), voice recorder | `src/components/messages/MessageInput.tsx:718`, `:743`, `:736`, `:707` | uploads write to storage and need picker/permission config outside the lane; the OS keyboard has emoji. The composer shows text + send only (no mic button) |
| Voice player, payment / service-booking / template cards, media album, Vitana companion card, `VitanaMessageActions` | `MessageBubble.tsx:1266`, `:1104`, `:1191`, `:1236`, `:1306`, `:1564`, `:1363` | each is another domain's component (wallet, booking, Vitana cards); pictures and files render, a calendar invite renders as a card |
| Copy, Forward (ForwardMessageSheet), Star / Pin, desktop context menu | `MessageBubble.tsx:1635`, `:1584`, `:1444-1445`, `:1440` | no clipboard module in the app's dependencies; Forward is its own sheet + storage copy |
| In-app event-link routing (event URLs open the Events screen) | `MessageBubble.tsx:825` (`src/lib/inAppLinks.ts`) | `inAppLinks.ts` is class C (prod host + `window`); links open outside the app |
| "↓ N new messages" pill, viewing presence (push suppression) | `ConversationView.tsx:1503`, `:407`; `GroupChat.tsx:926`, `:558` | the inverted list keeps the newest message in view; `useChatViewingPresence` is a separate gateway contract |
| Delivered receipts (`/chat/delivered`) | `src/hooks/useGlobalMessages.ts:1830-1850` | follow-up; read state is written |
| Ringtones / beeps | `src/components/CallManager.tsx:25-29` (`callSounds`) | Web Audio oscillators; no native tone source in the lane |
| Tenant ("Network") context | `src/hooks/useHybridMessages.ts:35` (`useTenantMessages`, 873 lines) | the phone opens in the community context (`Messages.tsx:118-120`); the DM routes open community conversations |
| A real WebRTC media engine | `src/hooks/useWebRTC.ts` (`getUserMedia`, `RTCPeerConnection`) | `react-native-webrtc` needs an `apps/mobile/package.json` dependency + config plugin outside the lane paths; `src/ports/webrtc.ts` is the door. Without an engine the in-call screen fails like the web does when media cannot start (`MessengerCall.tsx:97-102`) |

No UI the mobile web does not show was added. The web never calls `startCall` from a button
(no outgoing-call control in `ConversationView.tsx` / `GroupChat.tsx`), so the native port has
none either; the outgoing path exists in the state machine and is unit-tested.

## Deferred to G1 (`next_actor: owner`)

`staging-tests.json` → `deferred_g1`: read-only DM / group / deep-link flows with screenshot
parity vs the 390×844 staging web, and the live presence / typing / stream + a real 1:1 call
across two G1 test sessions. Never against production or staging.

## Preflight Lane-scope note

The spec is on the plan branch, not on `main`; preflight's Lane scope may report "lane file
not found" for that reason (brief: known non-blocker). Every other check must pass — see
`commands.log`.
