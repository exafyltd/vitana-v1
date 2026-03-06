

## Fix: Delete Option Missing from Kebab Menu + Mobile Carousel Not Using Kebab

### Two Issues Found

**Issue 1: Delete not showing on desktop kebab menu**
The screenshot shows Edit and Share but no Delete. This means `canDelete` is `false` because `event.created_by !== currentUserId`. The user can Edit (because they're a co-creator), but `canDelete` only checks `isCreator`. Since the user is the event organizer, they should be able to delete. Fix: allow co-creators to delete as well, or at minimum add debug logging.

Actually, more likely: the user IS the creator but `created_by` might not match due to a UUID mismatch or the field not being passed through. I'll add a console log to debug, but also change the logic so co-creators can also delete (since they have organizer-level access).

**Issue 2: `MobileEventCarousel.tsx` still uses old Edit icon + Share button pattern**
This component was never updated to use `EventKebabMenu`. It still renders a `SocialShareButton` + pencil `Edit` icon in `utilityTopRight` (lines 171-202). It has no `onDelete` prop at all.

### Plan

**1. Update `EventKebabMenu.tsx`**
- Allow co-creators to delete: change `canDelete = isCreator || isCoCreator`

**2. Update `MobileEventCarousel.tsx`**
- Add `onDelete` and `onShare` props to interface
- Replace the old `utilityTopRight` (Share button + Edit icon) with `<EventKebabMenu>`
- Import and use `EventKebabMenu`

**3. Update `EventsAndMeetups.tsx` MobileEventCarousel calls**
- Pass `onDelete` and `onShare` handlers to the three `<MobileEventCarousel>` instances

### Files to Change
1. `src/components/events/EventKebabMenu.tsx` — co-creators can delete
2. `src/components/community/MobileEventCarousel.tsx` — replace old UI with EventKebabMenu
3. `src/pages/community/EventsAndMeetups.tsx` — pass onDelete/onShare to MobileEventCarousel

