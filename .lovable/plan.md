

## Plan: Update Desktop Profile Drawer

**File:** `src/components/profile/ProfileDrawer.tsx`

### Two changes:

1. **Hide "Delete Account" on desktop** — Wrap the Delete Account `<Separator>` + button block (around lines 148-158) with `{isMobile && (...)}`.

2. **Keep role switcher desktop-only** — Leave the `!isMobile &&` condition on the role switcher as-is (no change needed there).

Only one file changed. One small edit to conditionally hide Delete Account on desktop.

