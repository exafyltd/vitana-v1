

## Fix: "Replying to yourself" label

When you reply to your own message, both the composer reply bar and the in-bubble quote currently show your own name (e.g., "Replying to John"). Instead, they should say "Replying to yourself" / "You" respectively, matching WhatsApp behavior.

### Changes

**1. `src/components/messages/ReplyPreview.tsx`** (composer bar)
- Add an optional `currentUserId` prop.
- Compare it against `message.sender_id` or `message.sender?.id`.
- If they match, display **"Replying to yourself"** instead of "Replying to {name}".

**2. `src/components/messages/ReplyQuote.tsx`** (in-bubble quote)
- Add an optional `currentUserId` prop.
- If the parent message sender matches the current user, display **"You"** instead of the sender's name.

**3. `src/components/messages/MessageInput.tsx`** (passes prop)
- Import `useAuth` (or equivalent) to get the current user ID.
- Pass `currentUserId` to `ReplyPreview`.

**4. `src/components/messages/MessageBubble.tsx`** (passes prop)
- Already has `isOwnMessage` and access to `message.sender_id`.
- Pass `currentUserId={message.sender_id}` context or use the existing user reference when rendering `ReplyQuote`.

Minimal, scoped change — no backend or schema modifications.

