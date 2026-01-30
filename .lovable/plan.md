

## Fix Event Details Icon Buttons (Desktop & Mobile)

### Problems Identified

After investigating the codebase, I found three distinct issues:

| Issue | Root Cause |
|-------|------------|
| Calendar only exports to external apps | Uses `handleExportToCalendar` which opens Google/Outlook URLs, doesn't use the `addEvent` function already imported from `useCalendarEvents` |
| Promote popup opens behind drawer | `CampaignDialog` is in parent component (EventsAndMeetups.tsx) but drawer has same z-index (z-50), so dialog appears underneath |
| Share popup opens behind drawer | `UniversalShareDialog` is inside drawer content, but Dialog portal has same z-index as Sheet (both z-50) |
| Mobile buttons unresponsive | Touch events not reaching handlers due to Sheet's focus trap and portal conflicts |

### Solution Overview

1. **Add "Add to VITANA Calendar" as PRIMARY option** - Add a new menu item that uses the existing `addEvent` function to save to Smart Calendar
2. **Close drawer before opening child dialogs** - For both Share and Promote, close the drawer first, then open the dialog (avoiding z-index conflicts entirely)
3. **Move UniversalShareDialog to parent** - Similar pattern to CampaignDialog - manage state from parent
4. **Ensure mobile touch handling is complete** - Apply final fixes for mobile event propagation

### Implementation Details

#### 1. Calendar Menu - Add VITANA Calendar Option

Add "Add to VITANA Calendar" as the **first** menu item that uses the existing `addEvent` function:

```tsx
const handleAddToVitanaCalendar = async () => {
  if (!user) {
    toast({
      title: "Sign in required",
      description: "Please sign in to add to your calendar",
      variant: "destructive"
    });
    return;
  }
  
  const calendarEvent = {
    user_id: '',
    title: event.title,
    description: event.description || '',
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location || event.virtual_link || '',
    event_type: 'community' as const,
    status: 'confirmed' as const,
    priority: 'medium' as const,
    is_recurring: false,
    source_type: 'manual' as const,
    metadata: {
      meetup_id: event.id,
      meetup_slug: event.slug,
    }
  };
  
  await addEvent(calendarEvent);
  
  toast({
    title: "Added to Smart Calendar ✓",
    description: "Event saved. We'll remind you before it starts.",
  });
};
```

Update the dropdown:
```tsx
<DropdownMenuContent>
  {/* Primary action - VITANA Calendar */}
  <DropdownMenuItem onSelect={handleAddToVitanaCalendar}>
    <CalendarPlus className="h-4 w-4 mr-2" />
    Add to VITANA Calendar
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  {/* External calendars */}
  <DropdownMenuItem onSelect={() => handleExportToCalendar('google')}>
    Google Calendar
  </DropdownMenuItem>
  ...
</DropdownMenuContent>
```

#### 2. Share Button - Close Drawer First

Instead of opening the dialog while drawer is open, close the drawer first:

```tsx
// In MeetupDetailsDrawer - pass a callback to parent
onShareEvent?: (event: any) => void;

// Share button handler
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  // Close drawer first, then parent opens share dialog
  onOpenChange(false);
  onShareEvent?.(event);
}}
```

In `EventsAndMeetups.tsx`:
```tsx
const [shareDialogOpen, setShareDialogOpen] = useState(false);
const [eventToShare, setEventToShare] = useState(null);

const handleShareEvent = (event) => {
  setEventToShare(event);
  setShareDialogOpen(true);
};

// Pass to drawer
<MeetupDetailsDrawer
  ...
  onShareEvent={handleShareEvent}
/>

// Render dialog at root level (not inside drawer)
{eventToShare && (
  <UniversalShareDialog
    open={shareDialogOpen}
    onOpenChange={setShareDialogOpen}
    content={{...}}
  />
)}
```

#### 3. Promote Button - Already Uses Callback Pattern

The Promote button already calls `onPromoteEvent(event)` which is handled by the parent. The issue is the drawer stays open. Fix:

```tsx
// Promote button handler
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  onOpenChange(false); // Close drawer first
  onPromoteEvent(event);
}}
```

#### 4. Mobile Touch Handling - Final Fixes

Ensure all mobile buttons use the complete pattern:

```tsx
// All mobile action buttons need:
onPointerDown={(e) => e.stopPropagation()}
onTouchEnd={(e) => e.stopPropagation()}  // Add this
onClick={(e) => {
  e.stopPropagation();
  e.preventDefault();
  // action
}}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add VITANA calendar function, close drawer before opening Share/Promote dialogs, add `onShareEvent` prop, enhance mobile touch handling |
| `src/pages/community/EventsAndMeetups.tsx` | Add Share dialog state and handler, move `UniversalShareDialog` to root level |

### Expected Results

After these changes:

| Action | Desktop | Mobile |
|--------|---------|--------|
| Calendar → "Add to VITANA Calendar" | Adds to Smart Calendar, shows toast | Same |
| Calendar → "Google Calendar" | Opens Google Calendar in new tab | Same |
| Share button | Closes drawer, opens Share dialog on top | Same |
| Promote button | Closes drawer, opens Campaign dialog on top | Same |
| Save button | Toggles saved state, shows toast | Same |

### Technical Notes

The key insight is that when a Dialog (Share/Campaign) is opened from inside a Drawer/Sheet, they fight for z-index and portal precedence. The cleanest solution is to **close the drawer first** before opening the child dialog, rather than trying to layer them correctly. This also provides a better UX as the user isn't juggling multiple overlays.

