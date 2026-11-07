# Tasks — messenger-polish-r2 (owner-approved plan, see plan-sparring.md)

Executor: Kiro (all code). Reviewer: claude. Every change is frontend only.

<!-- lane: header-avatars -->
## Lane `header-avatars` — VTID-05584
- [ ] H1 `ConversationView.tsx` sticky header (≈L1185): one row about 56 px — back (`rtl:rotate-180`), avatar `w-8 h-8`, name. Keep actions on today's conditions: search (direct, L1238-1248), edit group (groups), talk to Vitana (bot DM), create group (DM).
- [ ] H2 Avatars: `ConversationView` passes `showAvatar={!isDirectThread}` (flag at L351). `MessageBubble.tsx` sender-avatar guard (L1402) gains `&& !isOwnMessage`.
- [ ] H3 Vitest: direct incoming no avatar; direct own no avatar; group own no avatar; group incoming keeps avatar; header actions per chat type; back icon has rtl class.
- [ ] H4 i18n: any new label DE first, mirrored to all shipped locales; `npm run i18n:inventory`.

<!-- lane: scroll-css -->
## Lane `scroll-css` — VTID-05585
- [ ] S1 `src/index.css` L1364: delete `scroll-behavior: smooth;` from `.chat-scroll`. Keep explicit `behavior: 'smooth'` at `scrollToBottom(true)` (≈L527) and the scroll-to-message calls.
- [ ] S2 Vitest: opening a conversation sets scrollTop without animation (assert no smooth behaviour on the container); send still scrolls smooth.

<!-- lane: bubble-colour -->
## Lane `bubble-colour` — VTID-05586
- [ ] B1 `src/index.css` L103 light value `203 89% 76%` → `203 89% 90%`. Foreground L104 unchanged. Dark theme L341-342 unchanged.
- [ ] B2 Record WCAG contrast of `222 47% 11%` on the new colour in the PR (expect ≈13.8:1).

<!-- lane: attach-split -->
## Lane `attach-split` — VTID-05587
- [ ] A1 `MessageInput.tsx` (≈L760-761): two hidden file inputs with their own refs — photos/videos `accept="image/*,video/*"` `multiple`; files keep the document types, `multiple`.
- [ ] A2 `AttachmentMenu.tsx` (≈L233-243): two entries calling `onPhotoAttach` and `onFileAttach`; pass through `MessageInput`.
- [ ] A3 i18n DE first for the two new labels, mirrored to all shipped locales.
- [ ] A4 Vitest: two entries present; each input accepts its set; both upload through the existing path. Multi-select on device is verified by the owner (not Vitest).
