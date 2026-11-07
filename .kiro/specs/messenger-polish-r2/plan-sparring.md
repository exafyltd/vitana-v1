# Plan — Messenger polish round 2 (vitana-v1, frontend only)

Change class: standard (several frontend items; no migration, no backend, no .github change).
Owner decisions taken from the owner's replies (2026-11-06): recommended options approved as the owner's "go ahead".

<!-- plan:begin -->
## Items (round 2, corrected after the round-1 review)
1. **Own-bubble colour, light theme.** `src/index.css` L103: `--domain-messages-bubble` `203 89% 76%` -> `203 89% 90%`
   (about #D1ECFA). Foreground L104 `222 47% 11%` unchanged (contrast about 13.8:1). Dark theme L341-342 unchanged.
2. **Compact conversation header.** Replace the sticky header (`ConversationView.tsx` L1185, back button L1189-1191,
   ArrowLeft L1190; loading skeleton ArrowLeft L1164) with one row of about 56 px: back, a 32 px avatar (`w-8 h-8`),
   name. Keep every action the header has today, on the same conditions:
   - search, direct threads only (`isDirectThread`, L1238-1248, VTID-05317, `setSearchOpen(true)`);
   - edit group (groups);
   - talk to Vitana (direct thread with the bot);
   - create group (direct thread).
   No new action is added. RTL: the back icon gets a direction-aware class (`rtl:rotate-180`).
3. **Avatars beside messages (owner decision 2026-11-06).**
   - Direct chats: no avatar beside any bubble, own or incoming. The header avatar (item 2) is the only one.
   - Group chats: other people's messages keep their avatar (first bubble of each run, as today). Your own messages
     never get an avatar, in direct chats or groups.
   Change: `MessageBubble.tsx` L1409 draws the avatar for own messages today, gated by `showAvatar` (L213, L488).
   Implementation: `ConversationView` passes `showAvatar={!isDirectThread}` (flag at L351). In `MessageBubble.tsx`,
   the sender-avatar block (L1402) gains `&& !isOwnMessage`, so own messages in groups lose it too. Keep the bubble
   alignment when the column is empty.
   Acceptance: a Vitest case for each of the three cases (direct incoming, direct own, group own), plus group incoming
   keeps its avatar.

4. **Chat-open and follow-newest scroll, root cause fixed in CSS.** `src/index.css` L1364 `.chat-scroll { scroll-behavior:
   smooth }` makes every programmatic `scrollTop` assignment animate (ConversationView L582, L612, L665, L679, L728).
   Fix: delete that declaration. Explicit smooth stays where it is asked for: `scrollToBottom(force)` at L521 for the
   send action. Scroll-to-message calls that already pass `behavior: 'smooth'` keep it. The CSS rules at L1147 and
   L1219 (`.conversation-messages`, `.conversation-viewport`) are not used by this screen and are out of scope.
5. **Batched push (server).** Gateway change, out of this frontend plan. Options: (a) delayed first push carrying
   "N new messages - latest text"; (b) immediate push with "N new messages from <name>" and no preview. Recommended
   (a). Its own plan and sparring round under the Plan Sparring Gate (VTID-04868).
6. **Multi-select photos.** `MessageInput.tsx` L760-761 already has `type="file" multiple`. Implementation: two hidden
   inputs in MessageInput (photos/videos with `accept="image/*,video/*"`, files with the document types), each with
   its own ref. `AttachmentMenu.tsx` L233-243 gets two entries calling `onPhotoAttach` and `onFileAttach`. New labels
   in `src/i18n/de` first, mirrored to `en` (and the other shipped locales). Verified on device, not in Vitest.

## Files in scope
- `src/index.css` (L103 token, L1364 rule)
- `src/components/messages/ConversationView.tsx` (header L1164-1190 region)
- `src/components/messages/MessageBubble.tsx` (L1409 avatar, L213/L488 gating)
- `src/components/messages/MessageInput.tsx` (L760-761 inputs), `AttachmentMenu.tsx` (L233-243)
- i18n shards for new labels

## Test plan
- Vitest: no avatar in a direct thread (own and incoming); no avatar on own messages in groups; group incoming keeps its avatar; header
  renders the compact height and the existing actions; back icon has the RTL class; attach menu has two entries and
  each input accepts its set.
- Contrast of the new bubble token recorded in the PR.
- STAGING-VERIFY (read-only). Owner checks item 2 (header height), item 3 and item 6 on the PR preview on a phone.

## Open
- Item 5 waits for its own plan.
<!-- plan:end -->

## Planner responses
Round 2 (review): F9 closed (line references checked against origin/main 290c179cd; the earlier mismatch was a stale local checkout).
F10 accepted: the search button exists for direct threads (VTID-05317, L1238-1248) and is listed and kept in item 2.
F11 accepted: implementation guidance added to item 3.
Round 1 (VERDICT NOT CONVERGED): F1 line references corrected (verified against origin/main). F2 accepted: scope is the
CSS rule, not JS; fix removes L1364 only. F3 accepted: no search action exists; the actions are listed as they are.
F4 accepted: own-message avatars render today; item 3 changes them. F5 accepted: 40 px (`h-10`). F6 accepted: two-input
approach named. F7 accepted: RTL back icon added to item 2. F8 accepted: reference is VTID-04868 for sparring.
Q1 answered: search is not in the plan. Q2: avatar change is a rendering decision by the owner, not a data fix.
Q3 accepted: CSS removal is the chosen fix.

## Approval
Owner Gate 1 2026-11-06: "yes, go ahead". Plan hash sha256:7e08c41e48f5e94064fbf966227c56c3026a4dad05d4817bbf68be073b347fc7
