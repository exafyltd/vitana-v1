

## Plan: Fix ProfileDrawer — Show Roles + Add Email/Tenant Info

### Problem
Two issues with the ProfileDrawer when opened from Command Hub:

1. **Role switcher is empty** — When `activeTenantId` is null, `useMemberships(undefined)` returns `Membership[]` objects. The `roles` derivation checks `typeof data[0] === 'string'`, which fails for objects → `roles` is `undefined` → `availableRoles` is `[]` → switcher hidden.

2. **Missing email and tenant context** — Screenshot 1 shows email (`j.tadic@exafy.io`) and tenant ID (`Tenant: 2e7528b8...`) displayed in the drawer, but the current code doesn't render these.

### Changes — Single File: `src/components/profile/ProfileDrawer.tsx`

**1. Fix role derivation**
Extract `memberships` from `useMemberships` and derive `availableRoles` robustly:
- If `isExafyAdmin` → full hardcoded list
- If `membershipRoles` (string array from RPC) exists → use directly
- Else if `memberships` (object array from edge function) exists → extract unique roles from them
- Fallback → empty array

**2. Add email + tenant info to drawer header**
Below the display name and role badge, add:
- User email (from `useAuth().user?.email`)
- Active tenant ID (truncated, from `useTenant().activeTenantId`)

This matches the layout in screenshot 1 and ensures the drawer is fully unified whether opened from Command Hub or the main app.

