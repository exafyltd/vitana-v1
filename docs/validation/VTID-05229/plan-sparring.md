# Plan sparring record — messenger-paste-enter (VTID-05229)

- Partner: plan-sparring-partner (independent, read-only), one instance, 2 rounds
- Class: standard
- Plan hash (sha256 of the text between the plan markers): 21330d777490fc49baf32566e02892c3d2583eb3af57c4fa5e4f5b26c3464db7
- Verdict: **CONVERGED** (round 2: F1–F6 closed, no new findings)
- Owner approval (Gate 1): chat 2026-10-16, "yes" (with `reviewer_seat: claude`)
- VTID: VTID-05229 (lane `composer`)

## Final plan
<!-- plan:begin -->
## Goal
Owner request 2026-10-16: members can paste a screenshot straight into the Messenger composer instead of saving and
uploading it, and Enter sends a message instead of only the arrow button.

## Measured state (origin/main 5c4632ea9)
- `src/components/messages/MessageInput.tsx` is the only Messenger composer (used by `ConversationView.tsx` and
  `pages/messages/GroupChat.tsx`). It has no `onPaste` handler; files arrive only via the hidden `<input type=file>`
  → `handleFileSelect` → `uploadChatAttachment` → attachment preview.
- Enter never sends: `handleKeyPress` only swallows an Enter that picked an @mention. This is VTID-04966 (owner
  request 2026-10-07, #1279): *"on a phone there was no way to start a new line"*. `enterKeyHint="enter"`.

## Decision on the conflict with VTID-04966
The 2026-10-07 request was about phones; today's request is about speed at a keyboard. Both hold if the behaviour
depends on the input device, not the screen width: fine pointer + hover (desktop keyboard) → Enter sends,
Shift+Enter new line (the convention of WhatsApp Web, Slack, Teams); touch-first devices → unchanged from today.

## Changes (one lane, one file — both features edit `MessageInput.tsx`)
1. Paste: `onPaste` on the textarea; clipboard files and no plain text → `preventDefault`, upload through the same
   path as the picker (extracted `uploadFiles`), same validation and toasts, generic `image.png` renamed to
   `screenshot-<timestamp>.<ext>`. Plain text in the clipboard → normal text paste.
2. Enter: `matchMedia('(hover: hover) and (pointer: fine)')`; on such devices Enter (no modifier, no IME composition,
   no mention list consuming it) calls the existing `handleSend` unconditionally (its own guards and double-send lock make it a no-op when there is
   nothing to send, no open conversation, an upload running or a send in flight); desktop Enter ALWAYS `preventDefault`s,
   so it never adds a blank line (R2.5); Shift+Enter is a new line. `enterKeyHint` `send` on desktop, `enter` on touch.

3. `handleKeyPress`/`onKeyPress` stay (VTID-04926 mention flag, pinned by its tests); IME guard gets a comment that it
   reads the DOM event, not the typing-indicator state `isComposing`.
4. `docs/validation/VTID-04966/staging-tests.json` is repointed to the new staging spec in the same PR (the old spec
   file is removed). Paste: text on the clipboard wins over an image (copy-image-from-browser pastes the URL/alt text);
   the PR states this edge case.

## Tests
Vitest for every requirement clause (desktop and touch via mocked `matchMedia`, IME, mention, empty, paste
image/text/disallowed). VTID-04966/04926 unit tests pinned to touch; the desktop contract change is stated in the PR.
Read-only staging spec (in-browser group injection, guard aborts the message POST, storage upload answered by
`route.fulfill`) replaces `vtid-04966-enter-newline.staging.spec.ts`; no production test.

## Risks
- A desktop member who used Enter for line breaks since 2026-10-07 now needs Shift+Enter — accepted, it is the request.
- Touch laptops with a mouse report a fine pointer → Enter sends; that is the keyboard case.
- No server, storage policy or data change; rollback is a revert of one file.
<!-- plan:end -->

## Round 1 — partner findings (summary, verified against `MessageInput.tsx`)
- F1 minor: `isComposing` state name collides with the IME concept.
- F2 minor: `onKeyPress`/`handleKeyPress` becomes dead code on desktop.
- F3 minor: text-wins paste drops a copied web image (URL/alt text wins).
- F4 minor: `docs/validation/VTID-04966/staging-tests.json:8` names the staging spec the plan removes.
- F5 major: "if canSend → handleSend, otherwise default" could add a blank line on desktop (R2.5) and used a stale closure.
- F6 minor: i18n — confirmed no new strings.

## Planner responses (round 1)
- F1 minor — ACCEPTED: comment on the IME guard that it reads the DOM event, not the typing-indicator state (plan item 3). No rename (churn).
- F2 minor — REJECTED: `handleKeyPress` carries the VTID-04926 mention-consumed flag (MessageInput.tsx:254-264) that its tests pin; some keyboards still fire keypress after a prevented keydown. Kept as is; removal is out of scope.
- F3 minor — ACCEPTED as a PR note: R1.2 text-wins is the deliberate rule; the PR body states the copy-image-from-browser edge case.
- F4 minor — ACCEPTED: verified `docs/validation/VTID-04966/staging-tests.json:8` names the old spec. The lane repoints it to the new spec (docs/validation/VTID-*/** is in lane paths).
- F5 major — ACCEPTED (wording): design already called preventDefault before the send, but the "otherwise default" line was ambiguous. Plan now: desktop Enter always preventDefault, handleSend called unconditionally (guards at MessageInput.tsx:~182 no-op when empty / uploading / sending / no conversation). Also avoids the stale `canSend` closure.
- F6 — no action.

## Round 2 — partner verdict
F1–F6 closed. No new blocker or major findings. **CONVERGED.**
