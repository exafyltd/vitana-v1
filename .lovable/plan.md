

## Plan: Fix "Edit Profile" Button to Navigate Instead of Opening Popup

### Problem
The `DrawerClose asChild` → `Button asChild` → `Link` triple nesting causes Radix's `asChild` composition to break. The click doesn't properly navigate to `/me/profile`.

### Fix — `src/components/profile/ProfileDrawer.tsx`

Replace the nested `DrawerClose > Button asChild > Link` pattern with a simple `Button` that uses `onClick` to navigate and close the drawer programmatically:

```tsx
// Replace lines 152-159
<Button 
  variant="ghost" 
  className="w-full justify-start"
  onClick={() => {
    navigate('/me/profile');
  }}
>
  <User className="mr-2 h-4 w-4" />
  Edit Profile
</Button>
```

The drawer will close automatically when navigation occurs (route change unmounts/re-renders the layout). Single file, single edit.

