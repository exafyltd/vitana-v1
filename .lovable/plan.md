
Root cause is now clear: this is not primarily a file-opening problem. In direct chat, the uploaded files are never saved on the message record at all.

What I found:
- Recent `chat_messages` rows for your test sends are stored like:
  - `message_type = 'text'`
  - `content = 'Shared 2 files'` / `Shared Screenshot_...`
  - `metadata = {}`
- So after upload, the app sends only a plain text message and drops the attachment payload.
- That is why sender and recipient both see the same broken result: there is no attachment metadata to render, no `path` to re-sign, and no real file card/image to open.

Why this happens in code:
- `MessageInput.tsx` correctly uploads files and builds `attachments`.
- But direct messages go through `useGlobalMessages.ts`.
- In `sendMessageLegacy(...)`, the direct-message branch ignores `_messageType` and `_contentData` and always sends/stores plain text.
- `sendChatMessage()` in `useChatApi.ts` only accepts `{ receiver_id, content }`, so attachment metadata is discarded before it ever reaches the database.

Implementation plan:
1. Fix direct-message sending so attachment messages persist as real attachment messages
   - Update direct-message send flow in `useGlobalMessages.ts` to preserve `type` and `contentData`.
   - For DMs with attachments, bypass the limited gateway `/send` call and insert directly into `chat_messages` with:
     - `message_type = 'attachment'`
     - `metadata = { attachments: [...] }`
     - `content = typed caption or fallback text`
   - Keep existing gateway path for plain text messages.

2. Preserve attachments in optimistic UI
   - Update optimistic message creation in `useGlobalMessages.ts` to use the real message type/content data instead of hardcoded `"text"`.
   - This makes the sender immediately see the attachment card/image after pressing send.

3. Ensure fetched DM messages map attachment payload correctly
   - Confirm the direct-chat mapping already uses:
     - `message_type` from `chat_messages.message_type`
     - `content_data` from `chat_messages.metadata`
   - If needed, normalize metadata so `MessageBubble` consistently receives `content_data.attachments`.

4. Verify `MessageBubble` uses the stored attachment paths
   - Keep the signed-URL refresh logic already added.
   - Once attachment metadata is actually present, the existing rendering/open/download code should start working for both sender and receiver.

Files to update:
- `src/hooks/useGlobalMessages.ts` — main fix
- `src/hooks/useChatApi.ts` — only if we decide to extend the gateway client API shape, otherwise no change needed
- `src/components/messages/MessageBubble.tsx` — only minor normalization if required after wiring data correctly

Expected result after fix:
- Sender sends files and immediately sees real attachment bubbles instead of plain “Shared X files” text
- Recipient sees the same attachment bubbles
- Clicking images/files works because the message now contains the storage `path`, allowing fresh signed URLs to be generated

Technical note:
```text
Current DM flow:
upload files -> attachments[] exists in composer
-> send via gateway text-only API
-> chat_messages row saved as text + empty metadata
-> UI has nothing real to render

Fixed DM flow:
upload files -> attachments[] exists in composer
-> direct insert for attachment DMs with message_type='attachment' + metadata.attachments
-> fetch/map into MessageBubble
-> signed URL resolution works from attachment.path
```
