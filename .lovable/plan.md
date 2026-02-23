
## Add Search Dropdown to Inbox (Messages) Screen

When typing in the Inbox search field, a dropdown will appear showing matching conversations. Clicking a result opens that conversation directly.

### How it works today

The Inbox search (`inboxSearchQuery`) already filters the conversation list inline -- matching by participant name and last message. But there is no dropdown preview of results while typing.

### Changes

**File: `src/pages/Messages.tsx`**

1. Add a `useMemo` that builds `searchDropdownItems` from `displayThreads` filtered by `inboxSearchQuery`:
   - Matches against conversation title (participant name) and last message body
   - Limited to 6 results
   - Each item: `{ id: thread.id, title: conversationDisplayTitle, subtitle: lastMessage (truncated) }`

2. Create a `handleSearchItemClick` callback that:
   - Sets `selectedThreadId` to the clicked thread's ID
   - Clears `selectedRecipientId`
   - Marks it as read (calls `handleConversationOpened` if unread)

3. Pass `dropdownItems` and `onItemClick` to both `ExpandableSearchButton` instances:
   - **Mobile** (line ~934): the one inside the mobile layout's `UtilityActionButton`
   - **Desktop** (line ~1057): the one inside the desktop layout's `UtilityActionButton`

The existing inline filtering behavior is preserved -- the dropdown is an addition on top of it. Tapping a dropdown item immediately opens the conversation (on mobile, it navigates into the chat view; on desktop, it selects the conversation panel).

### Technical Details

```text
+-------------------------------+
| Search: "John"                |
+-------------------------------+
| John Doe                      |  <-- tap to open conversation
|   Hey, are you coming today?  |
|-------------------------------|
| John & Sarah (Group)          |
|   Let's meet at 5pm           |
+-------------------------------+
```

- Reuses the portal-based dropdown already built in `ExpandableSearchButton` (same `createPortal` + `getBoundingClientRect` approach from the Events fix)
- No new components or dependencies needed
- Works identically on mobile and desktop since the same `ExpandableSearchButton` component is used in both layouts
