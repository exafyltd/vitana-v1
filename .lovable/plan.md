

## Fix: Entry Gate Shows Wrong Label Because Auth Loads After Query Check

### Root Cause

The `useQuery` for `dbRoom` has `enabled: !!roomId && !!user?.id`. When the page loads:

1. `user` is initially `undefined` (auth context still resolving)
2. `enabled` becomes `false`
3. React Query does NOT set `isLoading: true` for disabled queries -- it sets `isLoading: false`
4. The gate renders immediately with `effectiveIsHost = false` (since `isHost` from navigation state is also missing on refresh)
5. Result: "Ready to join?" flashes before auth resolves

### Fix

**File: `src/pages/community/LiveRoomViewer.tsx`**

**Change the loading guard** to also account for auth not being ready yet:

```tsx
// Line ~60, after effectiveIsHost declaration
const isHostResolving = !user || isLoadingHost;
```

Then use `isHostResolving` instead of `isLoadingHost` in the entry gate conditional (line 277):

```tsx
{isHostResolving ? (
  <Card className="p-8 text-center max-w-md">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </Card>
) : (
  <Card className="p-8 text-center max-w-md">
    ...
  </Card>
)}
```

This way, the loading state covers both scenarios:
- Auth hasn't resolved yet (`!user`)
- Auth resolved but DB query is still fetching (`isLoadingHost`)

Once both are complete, `effectiveIsHost` will be accurate.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/community/LiveRoomViewer.tsx` | Add `isHostResolving` combining `!user` and `isLoadingHost`; use it in entry gate conditional |

