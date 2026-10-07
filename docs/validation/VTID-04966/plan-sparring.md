# Plan sparring record — VTID-04966

- Change class: light (1 source file + tests + a staging spec)
- Plan hash (sha256 of text between plan markers): e62d5fd55b154985c5aa067a6e36ad330635db45e02cdd74529bd24d20fcbc1c
- Partner: plan-sparring-partner, 2 passes
- Round 1: 3 minor (F1 onKeyPress is deprecated, move the mention guard to onKeyDown; F2 add enterKeyHint so phone keyboards don't show a send key; F3 staging spec must use real key presses and check the box grew). Verdict CONVERGED.
- Round 2: F1 rejection acknowledged (no dispute), F2/F3 closed. No new findings. Verdict **CONVERGED**.
- Owner approval: the owner's own instruction in chat (2026-10-07) — "Sending a text message should only be possible by pressing the send button. Same like here in Claude" — followed by "What is your problem? Get the job done" on the previous change; recorded as the Gate 1 yes (VTID-04947).

## Decisions taken during implementation
- The staging spec counts only POSTs to the message tables as a send: the chat issues a HEAD count on `global_messages` when it opens, which is a read.
- The VTID-04926 mentions staging spec is added to this change's suite so the deployed composer proves the Enter-picks-a-name path still works.
- Negative control: the new staging spec run read-only against the current staging build (old code) fails — Enter fired `POST global_messages`, which the staging guard aborted (nothing written) — and passes on a local build of this branch.

# Plan: Enter makes a new line in the Messenger composer; only the send button sends

Change class: light (1 source file + its tests + a staging spec; no i18n, migration, route, auth, workflow)
Scope: vitana-v1 `src/components/messages/MessageInput.tsx`, `src/components/messages/MessageInput.mentions.vtid-04926.test.tsx`, new `src/components/messages/MessageInput.enter-newline.<VTID>.test.tsx`, new `tests/e2e/staging/<vtid>-enter-newline.staging.spec.ts`, `docs/validation/<VTID>/`.

<!-- plan:begin -->
## Owner request (2026-10-07, after VTID-04959 shipped)
"When I write a text message in the Messenger and press enter it displays the message instead of making space to move to next row. Sending a text message should only be possible by pressing the send button. Same like here in Claude."

## Verified facts
- The one Messenger composer is `MessageInput` (`src/components/messages/MessageInput.tsx`), used by `ConversationView` (direct/legacy group chats) and `pages/messages/GroupChat.tsx` (community group chats). No other component under `src/components/messages` or `src/pages/messages` sends on Enter.
- `handleKeyPress` (L254-268): Enter without Shift → `preventDefault()` + `handleSend()`; Shift+Enter → newline. On a phone keyboard there is no Shift+Enter, so a new line is impossible there.
- The textarea already auto-grows (L116-131, `scrollHeight` capped at a max height, then scrolls), so multi-line text displays correctly once Enter inserts a newline.
- The send button is `type="submit"` in the composer `<form>`; a `<textarea>` does not submit a form on Enter, so removing the keypress send leaves the button (and its form submit) as the only send path.
- VTID-04926 mention logic: while the @mention list is open, the keydown handler (`mentionComposer.onKeyDown`) picks a suggestion on Enter and calls `preventDefault`; `mentionEnterConsumedRef` stops the following keypress. That must keep working — and the Enter that picks a suggestion must not ALSO insert a newline.

## Change
1. `handleKeyPress`: delete the Enter-sends branch. Keep only the mention guard (Enter that just picked a suggestion → `preventDefault`, no newline). Plain Enter and Shift+Enter fall through to the browser default: a newline. No keyboard shortcut sends (owner: "only by pressing the send button"); the button stays reachable by Tab + Enter/Space as a normal button for keyboard/screen-reader users.
1b. Add `enterKeyHint="enter"` to the textarea so phone keyboards show a return key, not a send key (sparring F2).
2. Update the comment above it to the new rule.
3. No other composer (Live Room chat, AI chat, comments) changes — owner named the Messenger.
4. No What's New (behaviour fix the owner asked for).

## Tests
5. Vitest (new file): plain Enter and Shift+Enter → `onSendMessage` not called and the keypress default NOT prevented (newline allowed); submitting the form (the send button) → sent; Enter while the mention list is open → picks the suggestion, default prevented, not sent.
6. Update VTID-04926 test "Enter still sends when '@word' matches nobody" → "Enter adds a line, not a send, when '@word' matches nobody" (not called).
7. Read-only staging spec, phone viewport, reusing the VTID-04959 approach (one made-up legacy group appended to the inbox's own GET reads inside the browser; nothing written, guard not widened): open the group, type "Zeile eins", press Enter with `locator.press('Enter')`, type "Zeile zwei" → the textarea value is "Zeile eins\nZeile zwei", read via `toHaveValue`, the textarea's clientHeight grew after the second line, and no POST to `global_messages` was attempted (recorded via page.on('request')). Never clicks send.

## Release
PR → merge → staging → STAGING-VERIFY → Gate 2 with the commit range.
<!-- plan:end -->

## Planner responses (round 1)
- F1 REJECTED: the VTID-04926 comment (MessageInput.tsx:255-257) records that some keyboards still deliver a keypress after a prevented keydown; the keypress guard is what stops a mention-picking Enter from adding a line. Partner acknowledged, no dispute.
- F2 ACCEPTED: `enterKeyHint="enter"` (item 1b).
- F3 ACCEPTED: `locator.press('Enter')`, `toHaveValue`, clientHeight grows (item 7).
