

## Root Cause: Blocking `await` Chain in `setRole`

The `handleRoleChange` in ProfileDrawer does `await setRole(newRole)`, which sequentially:

1. `await supabase.rpc("set_role_preference")` — DB call that runs `validate_role_assignment` + membership check + upsert `role_preferences` + insert `audit_events`
2. `await queryClient.invalidateQueries(["rolePref"])` — waits for a **refetch** of `get_role_preference` RPC to complete

The user is blocked on both awaits before the drawer closes and navigation happens. On slow network or DB load, this compounds to 10-20s.

The fix: **make it optimistic**. The cache is already updated via `setQueryData` on line 54, so the `await invalidateQueries` is redundant blocking. And the navigation doesn't need to wait for the RPC to confirm — the RPC can run in the background.

## Changes

### 1. `src/hooks/useRole.tsx` — Make `setRole` optimistic

- Call `queryClient.setQueryData` **before** the RPC (optimistic update)
- Dispatch `role.changed` event immediately
- Fire the RPC and invalidation as fire-and-forget (no `await` on the user-facing path)
- Add error rollback if the RPC fails

```typescript
const setRole = async (role: UserRole) => {
  if (!activeTenantId) return;
  
  const previousRole = query.data;
  
  // Optimistic: update cache + emit event immediately
  queryClient.setQueryData(["rolePref", activeTenantId], role);
  window.dispatchEvent(new CustomEvent("role.changed", {
    detail: { from: previousRole, to: role }
  }));
  
  // Fire RPC in background — don't block the caller
  supabase.rpc("set_role_preference", { 
    p_tenant_id: activeTenantId, 
    p_role: role 
  }).then(({ error }) => {
    if (error) {
      console.error('Error setting role preference:', error);
      // Rollback on failure
      queryClient.setQueryData(["rolePref", activeTenantId], previousRole);
      window.dispatchEvent(new CustomEvent("role.changed", {
        detail: { from: role, to: previousRole }
      }));
    }
    // Background revalidation
    queryClient.invalidateQueries({ queryKey: ["rolePref", activeTenantId] });
  });
};
```

### 2. `src/components/profile/ProfileDrawer.tsx` — Remove `await` from handler

Change `handleRoleChange` to call `setRole` without awaiting, since it's now optimistic:

```typescript
const handleRoleChange = (newRole: UserRole) => {
  setRole(newRole); // no await — optimistic
  
  // Close drawer and navigate immediately
  const drawerCloseButton = document.querySelector('[data-vaul-drawer-close]');
  if (drawerCloseButton) (drawerCloseButton as HTMLButtonElement).click();
  
  setTimeout(() => {
    switch (newRole) { /* existing navigation logic */ }
  }, 100);
};
```

This reduces perceived role-switch time from 10-20s to ~instant. If the RPC fails, the role silently rolls back and the user sees a revert.

