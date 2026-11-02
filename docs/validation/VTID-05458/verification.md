# Verification — VTID-05458 (native-wave2-inbox-chat-calls-r2 / conversation-chat)

Native Wave 2 conversation-chat lane: the 1:1 DM, the group chat, the four `/msg/` and `/t/`
deep-link routes and the embedded 1:1 call. All commands run offline (the native app has no
production profile; `assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-inbox-chat-calls-r2-conversation-chat`,
base `origin/main` e530abd0. Every command and its counts: `commands.log`.

**Not verified on staging: device runtime deferred to G1.** No test or command in this
session sent a message, posted to a group, placed or opened a call, uploaded a file, moved
wallet funds or wrote presence/typing to any live system.

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
  `src/ports/webrtc.ts` (the react-native-webrtc engine), `src/ports/chat-device.ts`
  (picker, upload, clipboard, share, recorder, player), `src/ports/orb-activate.ts`.
- Core: `src/lib/messaging/grouping.ts`, `src/lib/mentions.ts`,
  `src/lib/messaging/groupSystemNotice.ts`, `src/lib/messaging/groupManagement.ts` re-exported
  (import-free, class A); `closure.generated.json` + `mobile-ci-paths.generated.json`
  regenerated (`npm run gen:core`); fix 1 adds `src/lib/chatMarkdown.ts`. `vitanaBotIdentity.ts`
  (class B, `import.meta.env`) and `inAppLinks.ts` (class C) were rejected by `core-closure` and
  are re-implemented natively.
- i18n: `src/i18n/*/chatNative.json` (9 keys + 26 in fix 1: emoji tabs, voice controls,
  date/time hints, payment status / buttons, card fallbacks) and `callsNative.json` (15 keys), DE first
  (du-form: "Lange drücken …"; fr tu, pt você, ru ты), all 11 locales. Every other string
  reuses existing web keys (`screens.messages.*`, `inbox.*`, `toasts.*`). New keys replace
  strings the web hard-codes in English (TypingIndicator.tsx:19-24, CallingScreen.tsx:42,
  MessengerCall.tsx:176-179, ConversationView.tsx:1116 subtitle).
- Ledger: the six `inbox-chat-calls` rows of this lane → `native`; `--sync` + `--check` OK.

## Fix 1 (review `changes` on b76f75e)

The reviewer's three blockers, each fixed in product code behind a port, with fakes in the tests:

1. **Every chat surface the mobile web shows**
   - Composer (`MessageInput.tsx`): the emoji picker with per-member recents (`EmojiPicker.tsx`,
     `data/emojiRecents.ts`). The DM paperclip opens the AttachmentMenu (`AttachmentMenu.tsx`):
     Send Funds, Request Payment, calendar invite and Attach file. The group paperclip opens the
     library directly. Uploads go to the `chat-attachments` signed upload URL with progress; a failed
     upload gets Retry; removing an upload deletes it (`data/upload.ts`). The voice recorder
     (`VoiceRecorder.tsx`, expo-audio) sends a `voice` message. Devices go through
     `src/ports/chat-device.ts` (expo-image-picker, XHR upload, RN Clipboard, Share, Linking,
     expo-audio recorder + player).
   - Bubble drawer: Reply, **Copy**, **Forward** (`ForwardMessageSheet.tsx` + `data/forward.ts`:
     DMs + groups, up to 5 targets, each attachment copied per target, `forwarded: true`, share
     outside with 7-day links), Edit and Delete. Reactions: long press shows who reacted
     (ReactionPopover).
   - `ChatImageViewer.tsx`: swipe between pictures, "n of m", prev/next, pinch and double-tap zoom,
     Download, Copy picture, Share, Forward.
   - DM header: **Search this conversation** (`MessageSearchPanel.tsx`, `data/search.ts`,
     `GET /chat/search` scope `dm:<peer>`). **Talk to Vitana** appears in the Vitana DM only and
     opens the ORB through `src/ports/orb-activate.ts`. **Create group** with the peer
     (`CreateGroupSheet.tsx`, `data/createGroup.ts`).
   - Group screen: Search (scope `group:<id>`).
   - Both screens: "I am viewing" presence (`data/viewing.ts`, `POST /chat/viewing`), delivery
     receipts (`POST /chat/delivered`, `useConversation.ts`) and the "↓ N new messages" pill
     (`MessageList.tsx`).
   - **Tenant context**: `?context=tenant` on the `/inbox/u` and `/inbox/t` routes uses
     `data/useTenantConversation.ts` (`message_threads`, `thread_participants`, `messages`).
   - Call tones (`calls/callSounds.ts`, the web's four sounds through expo-audio).
   - Card actions on the DM screen: legacy calendar Accept / Decline / Maybe
     (`calendar_invite_responses` + `calendar_events` + the confirmation message), quick replies,
     and payment replies.
2. **Every MessageBubble variant** (`MessageBubble.tsx`, `bubble/*`):
   - the voice player;
   - payment request, exchange & send and confirmation cards, with Pay / Accept / Decline over
     `data/wallet.ts` (`process_wallet_transfer`, `process_wallet_exchange_and_send`);
   - service booking, template quick replies, shared content (`GET /chat/shared-preview`);
   - the v2 calendar invite card (`/calendar/invites/:id`, POST respond) and the legacy invite with
     its status;
   - the media album, video tiles, file chips with size and download, legacy `files`;
   - Vitana's Markdown (`parseChatMarkdown` through `@vitana/core/chat-markdown`), her
     VitanaMessageActions and her companion card;
   - in-app event links (`inAppLinks.ts`): event URLs open `/comm/events-meetups?event=…` through
     `navigateToWebPath`, which falls back to the Unported route while Events is not native.
3. **A real WebRTC engine** (task 5):
   - `react-native-webrtc` 155.0.1 and `@config-plugins/react-native-webrtc` 15.0.2 were added
     with `npx expo install` (pinned exact; lockfile adds only those two plus `debug` / `ms`).
   - `app.config.ts` `callPlugins()` registers the plugin with the existing camera and microphone
     catalog strings.
   - `src/ports/webrtc.ts` loads the engine on first use (`reactNativeWebRTCEngine`). A test
     registers a fake engine, and a runtime without the native module gets null.
   - No call was placed from tests or this session.

Outside the lane paths, under the owner's Option C instruction (the same as diary #1548):
`apps/mobile/package.json`, `apps/mobile/package-lock.json`, `apps/mobile/app.config.ts`, and the
one-line plugin-list expectation in `apps/mobile/tests/app-config.test.ts`.

## Red → green

- `red-on-base.txt`: the six first suites fail on origin/main e530abd0 (modules missing).
- `red-fix1.txt`: the five fix-1 suites (composer, bubble-variants, screen-features,
  webrtc-engine, app-config-webrtc) fail on the previous head b76f75e:
  - the new modules and the `react-native-webrtc` package are missing;
  - `reactNativeWebRTCEngine is not a function`;
  - no engine is loaded;
  - the plugin is not in the resolved config.
- Green on the lane head: `npx jest tests/inbox-chat/conversation-chat` gives 11 suites /
  226 tests; the full `npm test` gives 95 suites / 2534 tests (`commands.log`).

## Not shown on the mobile web (not ported)

| Web UI | Evidence |
|---|---|
| Star / Pin / Select and the desktop right-click menu | `src/components/messages/MessageContextMenu.tsx:66-69`: on mobile (`useIsMobile`) the menu renders only its children. Long press opens the drawer (Reply, Copy, Forward, Edit, Delete; `MessageBubble.tsx` drawer). Star and Pin are also `console.log` TODOs (`MessageBubble.tsx` handleStar / handlePin). |
| The global Send Funds / Payment Request dialogs (recipient search) | `AttachmentMenu.tsx`: these open only when `conversationType` is not `direct`. The group composer never renders the AttachmentMenu (`MessageInput.tsx:700-716`), and a loaded DM is always `direct`. |

## Native differences that need a package outside this lane (owner decision)

Each surface below is ported. Each one differs from the mobile web only because the package
that would match the web is not in `apps/mobile/package.json`. Driver authority covers only the
two WebRTC packages, so none of these were added:

| Surface | Native now | Package for 1:1 parity |
|---|---|---|
| Copy picture (viewer + picture-only Copy); paste a screenshot into the composer | the web's "unsupported" toast (`chatImageActions.ts:150-156`); text copy works (RN Clipboard) | `expo-clipboard` |
| Video playback inside the viewer | the play tile opens the system player | `expo-video` |
| Attaching documents (pdf, docx, zip…) | the library picker offers pictures and videos only | `expo-document-picker` |
| Date / time entry (calendar invite, due date, search filters) | `YYYY-MM-DD` / `HH:MM` text fields, the same validation | `@react-native-community/datetimepicker` |

The Vitana companion cards F2 (live Index sheet), F7 (share invite) and F8 (server tip) show
their copy without the web widget's own action. Those actions belong to Home / Index screens
that are not native yet.

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
  (`inbox-list` lane). `useTenantMessages` → `useTenantConversation` (fix 1);
  `useMessageSearch` → `data/search.ts`; `useChatViewingPresence` → `data/viewing.ts`;
  `useWallet` (transfer / exchange-and-send / balances) → `data/wallet.ts`;
  `useCalendarEvents.respondToInvite` → `data/calendar.ts`.

## Deferred to G1 (`next_actor: owner`)

`staging-tests.json` → `deferred_g1`: read-only DM / group / deep-link flows with screenshot
parity vs the 390×844 staging web, and the live presence / typing / stream + a real 1:1 call
across two G1 test sessions. Never against production or staging.

## Preflight Lane-scope note

The spec is on the plan branch, not on `main`; preflight's Lane scope may report "lane file
not found" for that reason (brief: known non-blocker). Every other check must pass — see
`commands.log`.
