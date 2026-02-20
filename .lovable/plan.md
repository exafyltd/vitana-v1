
## Fix: Inbox Search on Mobile

### What's Broken

There are three compounding issues causing search to appear completely broken:

**Issue 1 — The search callback is a stub**
Line 913 of `Messages.tsx`:
```typescript
onSearch={(query) => console.log('Search:', query)}
```
The result is discarded. There is no `inboxSearchQuery` state variable, so nothing ever gets filtered.

**Issue 2 — `renderMobileConversationList` doesn't filter by name**
The function reads from `displayThreads` and applies only the `conversationFilter` (all/direct/groups) filter. No name/text search filter exists anywhere in this path.

**Issue 3 — `ExpandableSearchButton` only fires on Enter, not on typing**
The component calls `onSearch` only on form submit — not on `onChange`. On mobile this is unexpected: users expect results to update live as they type.

---

### The Fix

**Single file to edit:** `src/pages/Messages.tsx`

**Change 1 — Add `inboxSearchQuery` state** (alongside the existing state declarations ~line 70):
```typescript
const [inboxSearchQuery, setInboxSearchQuery] = useState("");
```

**Change 2 — Wire the search button to state** (line 911–914):
```typescript
onSearch={(query) => setInboxSearchQuery(query)}
```

Also pass `onClear` so collapsing/clearing the search resets the filter:
```typescript
// Inside ExpandableSearchButton collapse handler → call onSearch("") 
```
Since `ExpandableSearchButton` already clears its internal state on collapse (line 37: `setSearchQuery("")`) but doesn't notify the parent, we also need to add an `onClear` prop to `ExpandableSearchButton` that fires when the X button is clicked, resetting `inboxSearchQuery` to `""`.

**Change 3 — Make `ExpandableSearchButton` call `onSearch` live on each keystroke** (in `expandable-search-button.tsx`):
Change the `onChange` handler from only updating local state to also calling `onSearch?.(value)` immediately (live search), so results update as the user types — matching the UX of Events and Orders screens.

**Change 4 — Apply the search filter in `renderMobileConversationList`**
After the `getFilteredThreads` call, add a name-based filter:
```typescript
const searchFiltered = inboxSearchQuery.trim()
  ? filteredThreads.filter(thread => {
      const name = getConversationDisplayTitle(thread, user?.id) || '';
      const lastMsg = thread.last_message?.body || '';
      const q = inboxSearchQuery.toLowerCase();
      return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
    })
  : filteredThreads;
```
Then use `searchFiltered` instead of `filteredThreads` for the rest of the render logic.

**Change 5 — Show "no results" state when search has no matches** (instead of the generic `MobileInboxEmptyState`):
```typescript
if (searchFiltered.length === 0 && inboxSearchQuery.trim()) {
  return (
    <div className="text-center py-12">
      <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
      <p className="text-muted-foreground">No conversations matching "{inboxSearchQuery}"</p>
    </div>
  );
}
```

**Change 6 — Reset search when context (global/tenant tab) changes**
Add `setInboxSearchQuery("")` inside the existing `useEffect` that resets on `messageContext` change (line 124–129).

---

### Files to Edit
- `src/pages/Messages.tsx` — 5 targeted changes (add state, wire handler, apply filter, empty state, reset on context switch)
- `src/components/ui/expandable-search-button.tsx` — make `onChange` call `onSearch` live (live-as-you-type) + add `onClear` prop
