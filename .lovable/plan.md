

## Make "Delete Account" Accessible on Mobile

### Problem

The "Delete Account" button was added to `ProfileDrawer`, but that component is only rendered in the **desktop sidebar** (triggered by the avatar). On mobile, navigation uses `SideDrawerNav` which reads from `drawer-nav.config.ts` — the ProfileDrawer is never shown.

### Fix

Add a "Delete Account" entry to the mobile side drawer, placed just before "Log Out" so it's easy to find.

### Changes

**File: `src/config/drawer-nav.config.ts`**
1. Import `Trash2` from `lucide-react`
2. Add a new nav item before `logout`:
   ```typescript
   { id: 'delete-account', route: '/delete-account', icon: Trash2, translationKey: 'drawerNav.deleteAccount' }
   ```

**File: `src/components/mobile/SideDrawerNav.tsx`**
3. Style the `delete-account` item with destructive colors (same treatment as `logout`):
   ```typescript
   const isDestructive = item.id === 'logout' || item.id === 'delete-account';
   ```
   Use `isDestructive` instead of `isLogout` for the red styling.

**File: Translation config** (wherever `drawerNav.*` keys are defined)
4. Add `drawerNav.deleteAccount` translation key (e.g., "Delete Account" / "Konto löschen")

### Result
- Mobile users see "Delete Account" in the side drawer, styled in red, just above "Log Out"
- Desktop users still have it in the ProfileDrawer (unchanged)
- One consistent path: both lead to `/delete-account`

