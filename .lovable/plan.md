

## Update Drawer Header: "Vitanaland" Instead of "Maxina"

### Change

**`src/components/mobile/SideDrawerNav.tsx`** -- lines 83-84

Currently the header shows the tenant name ("Maxina") from `tenant?.name`. For the Maxina tenant, it should instead display "Vitanaland" as the primary title, while keeping "Maxina Experience" as the subtitle below it.

- Line 84: Change `{tenantName}` to `{isMaxina ? 'Vitanaland' : tenantName}`
- Everything else (subtitle, gradient, close button) stays unchanged

### What stays unchanged
- "Maxina Experience" subtitle -- already present
- Header gradient styling
- Non-Maxina tenants still show their tenant name
- Top App Bar ("MAXINA" centered text) -- untouched

