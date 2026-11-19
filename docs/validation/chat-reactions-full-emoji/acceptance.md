# Acceptance: chat-reactions-full-emoji/reactions (vitana-v1)

VTID: pending (VTID_PLACEHOLDER). This folder moves to docs/validation/<VTID>/ when the official VTID is issued.

AC-1. The six quick reactions (👍 ❤️ 😂 😮 🙏 🎉) are the shortcuts on the web context menu, the phone-web drawer and the mobile drawer.
TEST: npx vitest run src/lib/reactions/reactionEmoji.test.ts src/components/messages/MessageBubble.reaction-picker.test.tsx

AC-2. With REACTION_PICKER_ENABLED=false (shipped) the web and mobile hooks add only the six and no "+" renders; removals are never gated.
TEST: npx vitest run src/hooks/useMessageReactions.gate.test.ts
TEST: cd apps/mobile && npx jest tests/inbox-chat/conversation-chat/reactions-expanded-gate.test.tsx

AC-3. A legacy bare heart (U+2764) and the canonical heart are one reaction: one chip, one count, toggle-off deletes the stored row form.
TEST: npx vitest run src/hooks/useMessageReactions.legacy-heart.test.ts
TEST: cd apps/mobile && npx jest tests/inbox-chat/conversation-chat/reactions-legacy-heart.test.tsx

AC-4. A seventh distinct emoji per member per message is refused by the database (reaction_cap_reached) and shows chatNative.reactions.capReached; removal still works.
TEST: npx vitest run src/hooks/useMessageReactions.gate.test.ts
TEST: cd apps/mobile && npx jest tests/inbox-chat/conversation-chat/reactions-picker.test.tsx

AC-5. With the picker on, "+" opens the picker limited to the 181-emoji set; a pick outside the six is added (desktop, phone web, mobile).
TEST: npx vitest run src/components/messages/MessageBubble.reaction-picker.test.tsx
TEST: cd apps/mobile && npx jest tests/inbox-chat/conversation-chat/reactions-picker.test.tsx

AC-6. Cross-client on an isolated database: mobile adds 🍎 via "+", reload shows it, web sees it and removes it, mobile reload shows it gone; legacy heart and cap behave as AC-3/AC-4.
TEST: outputs/isolated-db/run-isolated.sh <v1> outputs/isolated-db/cross-client.sh <v1> (opt-in; result outputs/cross-client-isolated.txt)

AC-7. Migration 20261117120000 is widening only, keeps every existing row, re-applies cleanly, and its rollback preserves member reactions (refuses while any reaction outside the six exists).
TEST: outputs/isolated-db/setup-db.mjs, reapply.mjs, rollback-rehearsal-v2.mjs (results outputs/rollback-rehearsal.txt)
