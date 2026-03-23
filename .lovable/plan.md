

## Add "Delete Account" to the Profile Drawer

### Problem

The Delete Account link only appears on the sign-in page footer. Once authenticated, mobile users have no way to reach it — there's no mobile Settings screen.

### Fix

Add a "Delete Account" link to `ProfileDrawer.tsx`, visible to all authenticated users (mobile and desktop). Place it after the "Edit Profile" button, separated by a divider, styled as a destructive ghost button with a `Trash2` icon.

### Changes

**File: `src/components/profile/ProfileDrawer.tsx`**

1. Import `Trash2` from `lucide-react`
2. After the "Edit Profile" button block (line ~148), add a `Separator` followed by a destructive "Delete Account" button:

```tsx
<Separator />
<div className="space-y-2">
  <DrawerClose asChild>
    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" asChild>
      <Link to="/delete-account">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Account
      </Link>
    </Button>
  </DrawerClose>
</div>
```

### Result
- Authenticated users on any device can reach account deletion from their profile drawer
- Styled as a clearly destructive action, visually distinct from other options
- One file change only

