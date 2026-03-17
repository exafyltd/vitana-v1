

## Plan: Replace Share with Edit, Wire Up Delete and Edit in Message Actions

### Problem
1. The **Share** button in the mobile long-press drawer should be **Edit** (only for own messages)
2. **Delete** currently just logs to console — not functional
3. No **Edit** functionality exists yet

### Changes

**File: `src/components/messages/MessageBubble.tsx`**

1. **Add `Pencil` import** from lucide-react (already used elsewhere in the project)

2. **Add `onDeleteMessage` prop** to `MessageBubbleProps`:
   ```
   onDeleteMessage?: (messageId: string) => void;
   ```

3. **Replace `handleShare`** with `handleEdit` that puts the message into an edit mode — sets state to show an inline edit input, and on confirm calls `onUpdateMessage(messageId, { body: newContent, content: newContent })` then closes the drawer

4. **Wire `handleDelete`** to show a confirmation dialog, then call `onDeleteMessage(messageId)` which will delete from the correct Supabase table

5. **In the mobile drawer UI (lines ~803-809)**: Replace the Share button with an Edit button (using `Pencil` icon), shown only for `isOwnMessage`. Keep the same grid layout.

6. **Add edit state**: `editingMessageId` and `editContent` state. When editing, render a small inline text input overlaying the bubble content with Save/Cancel buttons.

7. **Add delete confirmation**: Use a simple `window.confirm()` or inline confirmation before executing delete.

**File: `src/components/messages/ConversationView.tsx`**

8. **Pass `onDeleteMessage` prop** to `MessageBubble`, implementing it as:
   ```typescript
   onDeleteMessage={async (messageId: string) => {
     await supabase
       .from(messageContext === 'global' ? 'global_messages' : 'messages')
       .delete()
       .eq('id', messageId);
     if (fetchMessages) await fetchMessages();
   }}
   ```

**File: `src/components/messages/MessageContextMenu.tsx`**

9. **Replace `onShare` with `onEdit`** in the desktop right-click context menu as well, using Pencil icon and "Edit" label (only for own messages).

### Summary
- Share → Edit (own messages only) in both mobile drawer and desktop context menu
- Delete actually deletes from database with confirmation
- Edit updates message content via existing `onUpdateMessage` mechanism

