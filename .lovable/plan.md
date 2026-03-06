

## Add Kebab Menu (Edit, Share, Delete) to Event Cards and Drawer

### What Changes

Replace the current single Edit pencil icon on event cards with a **kebab menu** (⋮) containing Edit, Share, and Delete options. Add the same kebab menu to the **MeetupDetailsDrawer** top-right corner.

### Implementation

**1. Create `EventKebabMenu` component** (`src/components/events/EventKebabMenu.tsx`)
- Reusable component using the existing `KebabMenu` from `dropdown-menu-kebab.tsx`
- Props: `event`, `currentUserId`, `onEdit`, `onDelete`, `onShare`, `className`
- **Edit** (Pencil icon): visible only if `currentUserId === event.created_by` and event is in the future
- **Share** (Share2 icon): always visible, triggers share dialog or copies link
- **Delete** (Trash2 icon, destructive red): visible only if `currentUserId === event.created_by`, opens `AlertDialog` confirmation per the project's delete-confirmation standard
- Delete action: deletes from `global_community_events` (cascades to participants, tickets, etc.), then calls `onDelete` callback
- Styled with white text + semi-transparent background to work on image card overlays

**2. Update `transformEventToNewsCard` in 3 files**
- **`EventsAndMeetups.tsx`** (line 146-158): Replace the Edit-only `utilityTopRight` with `<EventKebabMenu>`, passing `onEdit`, `onDelete` (removes from list + toast), and `onShare` (existing share logic)
- **`Meetups2.tsx`** (line 288-309): Same replacement
- **`Events.tsx`**: Add kebab menu (currently has no edit button at all)

**3. Update `MeetupDetailsDrawer.tsx`**
- Add `onEditEvent` and `onDeleteEvent` props to the interface
- Place `<EventKebabMenu>` in the top-right corner of the drawer (next to close button area), checking `user?.id === event.created_by` for edit/delete visibility
- On delete: close the drawer, call `onDeleteEvent` callback

**4. Wire callbacks in parent pages**
- **`EventsAndMeetups.tsx`**: Pass `onEditEvent` (opens EditMeetupPopup) and `onDeleteEvent` (refreshes event list) to drawer
- **`Meetups2.tsx`**: Same wiring
- **`Events.tsx`**, **`Community.tsx`**, **`Home.tsx`**: Pass delete callback that refreshes events

### Files to Change
1. `src/components/events/EventKebabMenu.tsx` — **new** reusable component
2. `src/components/meetups/MeetupDetailsDrawer.tsx` — add kebab menu + new props
3. `src/pages/community/EventsAndMeetups.tsx` — replace edit button with kebab, wire drawer callbacks
4. `src/pages/community/Meetups2.tsx` — replace edit button with kebab, wire drawer callbacks
5. `src/pages/community/Events.tsx` — add kebab menu to cards
6. `src/pages/Community.tsx` — wire drawer delete callback
7. `src/pages/Home.tsx` — wire drawer delete callback

