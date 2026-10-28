# Requirements — Messenger: paste screenshots, Enter sends on desktop

Owner request 2026-10-16: *"We should be able to send a copy of the screenshot via Maxina chat/messenger, so that we
don't have to save and upload it, but just copy/paste it. Also, a message can be sent via enter, not just by clicking
on the arrow. This all slows down communication."*

Scope: the Messenger composer `src/components/messages/MessageInput.tsx` (direct chats, legacy groups and community
group chats all use it). Frontend only — no gateway, storage or database change.

## R1 — Paste an image from the clipboard
1. WHEN a member pastes (Ctrl/Cmd+V, or the phone's paste menu) into the message box AND the clipboard holds one or
   more files (e.g. a screenshot) AND no plain text, THEN each file is uploaded exactly as if it had been picked with
   the paperclip, and appears in the existing attachment preview above the box; nothing is sent until the member sends.
2. WHEN the clipboard holds plain text (with or without an image, e.g. a copy from Word/Excel), THEN the text is pasted
   as today and no attachment is added.
3. Pasted files go through the same checks as picked files (`validateFile`: 50 MB, allowed types; an open
   conversation is required) and show the same error toasts.
4. A pasted image without a real file name (browsers name it `image.png`) gets the name
   `screenshot-<yyyyMMdd-HHmmss>.<ext>` so the recipient sees a meaningful file name.
5. The member can type a caption with the pasted image and remove it before sending, as with picked files.

## R2 — Enter sends on desktop
1. WHEN the device has a fine pointer and hover (desktop/laptop keyboard) THEN Enter sends the message (same path and
   same double-send lock as the send button) and Shift+Enter inserts a new line.
2. WHEN the device is touch-first (phone/tablet: no fine pointer) THEN Enter keeps inserting a new line and only the
   send button sends — the VTID-04966 reason (no way to start a new line on a phone) stays solved.
3. Enter never sends while an IME composition is active (Japanese/Chinese/Korean input, some Android keyboards).
4. Enter that picks an @mention suggestion still only picks it (VTID-04926).
5. Enter with nothing to send (empty box, no attachment) or while an upload is running does nothing — no empty line
   is added on desktop either.
6. Phone keyboards keep `enterkeyhint="enter"`; desktop gets `enterkeyhint="send"`.

## Out of scope
Drag-and-drop of files, the Vitana assistant chat and the Operator chat composers, any server change.
