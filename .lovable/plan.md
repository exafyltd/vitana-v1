

## Fix Profile Preview Loading and Message Modal Issues from Event Drawer

### Problem 1: Profile Preview Loads Forever

The `ProfilePreviewDialog` is rendered **inside** the Sheet/Drawer content (line 1540 of `MeetupDetailsDrawer.tsx`). When it opens, Radix UI's focus trap on the Sheet conflicts with the Dialog's own focus management, preventing the component from functioning correctly. The query fires but the UI gets stuck in a loading state.

This is the same class of issue that was already solved for the Share Dialog and Campaign Dialog -- those were moved to the parent component (`EventsAndMeetups.tsx`) and triggered via callback props.

### Problem 2: Message Modal Behavior

The message compose modal now appears correctly above the drawer (z-index fix is working). The sending delay is inherent to the two-step process (create thread, then send message) and is normal behavior.

### Solution

Move the `ProfilePreviewDialog` out of the `MeetupDetailsDrawer` and into the parent `EventsAndMeetups.tsx` page, following the established drawer-modal-stacking pattern.

### Changes

**1. `src/components/meetups/MeetupDetailsDrawer.tsx`**

- Remove the `ProfilePreviewDialog` component render (line 1540)
- Remove the import of `ProfilePreviewDialog`
- Keep the `useProfilePreview()` hook call and `openPreview` usage (these work via the global context provider in App.tsx)

**2. `src/pages/community/EventsAndMeetups.tsx`**

- Import and render `ProfilePreviewDialog` at the page level, alongside the existing `UniversalShareDialog` and `CampaignDialog`
- This ensures the dialog renders outside the Sheet portal, avoiding focus-trap conflicts

### Why This Works

The `ProfilePreviewProvider` is already at the App level (in `App.tsx`). The `openPreview()` call inside the drawer sets the context state, and the `ProfilePreviewDialog` reads from the same context. Moving where the Dialog component renders doesn't change the data flow -- it just ensures the Dialog portal isn't nested inside the Sheet portal, eliminating the focus-trap conflict.

```text
Before (broken):
  App (ProfilePreviewProvider)
    EventsAndMeetups
      MeetupDetailsDrawer (Sheet portal)
        ProfilePreviewDialog (Dialog portal nested inside Sheet)
          -> Focus trap conflict -> stuck loading

After (fixed):
  App (ProfilePreviewProvider)
    EventsAndMeetups
      MeetupDetailsDrawer (Sheet portal)
        -> openPreview() sets context
      ProfilePreviewDialog (Dialog portal at page level)
        -> No focus trap conflict -> works correctly
```

### Technical Details

- No new dependencies or components
- Follows the exact same pattern already used for `UniversalShareDialog` and `CampaignDialog` in this codebase
- The `useProfilePreview` context handles all state synchronization automatically
