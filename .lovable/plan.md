

## Plan: Fix Edit/Delete — Refetch, Confirmation, and UX

### Root Cause Confirmed
Both `useGlobalMessages.fetchMessagesCompat` and `useTenantMessages.fetchMessages` guard with `if (threadId === activeThreadId)`. The calls at lines 1137 and 1167 of `ConversationView.tsx` pass no argument, so `threadId` is `undefined` and the guard never passes. The database mutation likely succeeds but the UI never refreshes.

### Changes

#### 1. `src/components/messages/ConversationView.tsx` — Fix refetch calls + add logging

**Lines 1136-1138** (edit handler): Replace `await fetchMessages()` with:
```typescript
console.log('[Edit] Mutation succeeded for message:', messageId, 'table:', table);
if (fetchMessages) {
  console.log('[Edit] Triggering refetch for threadId:', threadId);
  await fetchMessages(threadId);
}
```

**Lines 1166-1167** (delete handler): Same pattern:
```typescript
console.log('[Delete] Mutation succeeded for message:', messageId, 'table:', table);
toast({ title: "Message deleted" });
if (fetchMessages) {
  console.log('[Delete] Triggering refetch for threadId:', threadId);
  await fetchMessages(threadId);
}
```

Also add error logging at the mutation step itself so we can distinguish mutation failure vs refetch failure.

#### 2. `src/components/messages/MessageBubble.tsx` — Replace `confirm()` with inline state

**Add state**: `const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);`

**Replace `handleDelete`** (lines 182-187): Instead of `confirm()`, set `showDeleteConfirm = true`. Don't close the drawer yet.

**Add a confirmation view inside the Drawer** (before the action grid, ~line 859): When `showDeleteConfirm` is true, show a small confirmation panel:
```
"Delete this message?" 
[Cancel] [Delete]
```
- Cancel: `setShowDeleteConfirm(false)`
- Delete: call `onDeleteMessage(message.id)`, then on success close drawer via `setShowDoubleTapReactions(false)` and reset confirm state

**Edit drawer button** (line 843): Keep closing the drawer immediately since editing opens inline UI on the bubble itself. No change needed here — the drawer close is correct for edit.

#### 3. `src/components/messages/MessageBubble.tsx` — Close drawer only after success

**Delete**: The delete button currently calls `handleDelete()` then immediately `setShowDoubleTapReactions(false)`. Change to: show confirm step first, then only close drawer after `onDeleteMessage` resolves.

**Edit save** (`handleEditSave`, lines 203-211): After successful `onUpdateMessage`, the drawer is already closed (editing happens inline, drawer was closed when edit was triggered). No change needed.

#### 4. Optimistic UI updates

**Delete**: Before awaiting `onDeleteMessage`, optimistically hide the message bubble by setting a local `isDeleted` state. If the mutation fails, revert. This gives instant visual feedback.

**Edit**: After save, optimistically update the displayed content from `editContent` (already happens since `setIsEditing(false)` triggers re-render, but the content still shows old value until refetch). Add local state `optimisticContent` that overrides display until refetch completes.

#### 5. Desktop context menu

The `MessageContextMenu.tsx` already wires `onDelete` and `onEdit` correctly — no changes needed there since the fixes are in the handlers passed from `ConversationView`.

### Files Modified
- `src/components/messages/ConversationView.tsx` — pass `threadId` to `fetchMessages`, add logging
- `src/components/messages/MessageBubble.tsx` — replace `confirm()` with inline confirmation, optimistic updates, drawer lifecycle fix

