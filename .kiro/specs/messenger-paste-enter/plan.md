# Plan — messenger-paste-enter

Author: Kiro, session `kiro-202610161055-a631`. Repo: `exafyltd/vitana-v1` (frontend only; no backend, no migration,
no gateway change). Spec: `requirements.md`, `design.md`, `tasks.md`, `lanes/composer.md` in this folder.

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
