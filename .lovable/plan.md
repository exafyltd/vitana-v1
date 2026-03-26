

## Fix: Remove duplicate `handleEditProfile` declaration

The build error is caused by two `handleEditProfile` functions in `ProfileDrawer.tsx`:
- **Lines 60-63**: First declaration (uses `setOpen(false)` + setTimeout)
- **Lines 104-113**: Second declaration (uses DOM query for drawer close button)

### Change
Delete the duplicate at lines 104-113. Keep the first one at lines 60-63 which already uses the controlled `open` state pattern — the cleaner approach.

### File: `src/components/profile/ProfileDrawer.tsx`
Remove lines 104-113 entirely.

