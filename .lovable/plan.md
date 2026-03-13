

## Revert in-bubble quote to show full name

The user wants:
- **Composer bar** (`ReplyPreview`): Keep "Replying to yourself" ✅ (already correct)
- **In-bubble quote** (`ReplyQuote`): Show **full name** instead of "You" when replying to own message

### Change

**`src/components/messages/ReplyQuote.tsx`**
- Remove the `currentUserId` prop and the "You" logic
- Always display the sender's full name

```typescript
// Remove: const isQuotedSelf = ...
// Remove: const senderName = isQuotedSelf ? 'You' : ...
// Use: const senderName = parentMessage?.sender?.display_name || parentMessage?.sender?.full_name || 'Unknown User';
```

