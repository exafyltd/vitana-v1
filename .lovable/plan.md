
## Move Share Button to Top-Right Action Area on Event Cards

### Problem
The Share button sits in the bottom-right of the card alongside the CTA ("Buy Ticket", "Reserve Spot"), where it collides with the centered Orb on mobile.

### Solution
Move the Share button from `actionButton` (bottom zone) to `utilityTopRight` (top-right zone, next to the time pill and edit icon).

### Changes

**File: `src/components/community/MobileEventCarousel.tsx`** (~lines 171-205)

1. Remove the `actionButton` prop entirely (delete the SocialShareButton from the actionButton assignment)
2. Update `utilityTopRight` to always include the Share button, and conditionally include the Edit icon for owners/admins

Current structure:
```
utilityTopRight: canEdit ? <EditButton /> : undefined
actionButton: <SocialShareButton />
```

New structure:
```
utilityTopRight: (
  <div className="flex items-center gap-1">
    <SocialShareButton ... />
    {canEdit && <EditButton ... />}
  </div>
)
// actionButton removed
```

### What Stays the Same
- CTA button ("Buy Ticket", "Reserve Spot", etc.) remains at bottom-right via `getSmartAction()`
- Card layout, snap scrolling, sizing, shadows
- Share button appearance (icon variant, sm size)
- Edit button visibility logic (only for owner/admin)
- Time pill in top-right
- All other card content
