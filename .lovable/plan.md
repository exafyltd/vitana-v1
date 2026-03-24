

## Fix: "View Profile" and "Message" Buttons on Search Results Page

### Problem
In `src/pages/Search.tsx`, the "View Profile" and "Message" buttons on people search result cards (lines 201-202) have no `onClick` handlers — they are plain `<Button>` elements with no navigation or action attached.

### Fix

**File: `src/pages/Search.tsx`**

1. Import `useNavigate` from `react-router-dom`
2. Add `onClick` to **"View Profile"** button: navigate to `/u/${result.id}` (the `result.id` is already the user's `user_id`)
3. Add `onClick` to **"Message"** button: navigate to `/inbox` with the user ID as a query param to open a DM conversation — e.g., `/inbox?dm=${result.id}` — or use the existing direct message creation pattern from the codebase
4. Look up how DM initiation works elsewhere in the app to use the same pattern (likely navigating to inbox with a recipient param or using a `useDirectMessage` hook)

I'll check the existing DM initiation pattern to ensure consistency.

### Files
- `src/pages/Search.tsx`

