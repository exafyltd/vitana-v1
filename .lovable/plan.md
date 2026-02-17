

## Fix: Host sees "Ready to join?" on their own live room

### Problem
When a host opens their own live room (especially on page refresh or direct URL), the database query for `host_user_id` hasn't resolved yet, so `effectiveIsHost` is `false` during the initial render. The entry gate shows "Ready to join?" and "Join Stream" instead of "Ready to start?" and "Start Stream".

### Solution

**File: `src/pages/community/LiveRoomViewer.tsx`**

**Change 1: Show a loading state while host detection is resolving**

The `useQuery` for `dbRoom` returns an `isLoading` state. Use it to show a brief loading spinner on the entry gate instead of defaulting to the "join" copy while host status is unknown:

```tsx
const { data: dbRoom, isLoading: isLoadingHost } = useQuery({ ... });
```

Then in the entry gate card, if `isLoadingHost` is true, show a spinner or neutral "Preparing..." text instead of the wrong role label.

**Change 2: Neutral loading state for the gate**

```tsx
{isLoadingHost ? (
  <Card className="p-8 text-center max-w-md">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </Card>
) : (
  <Card className="p-8 text-center max-w-md">
    <h2 className="text-2xl font-bold mb-4">
      {effectiveIsHost ? 'Ready to start?' : 'Ready to join?'}
    </h2>
    <p className="text-muted-foreground mb-6">
      {effectiveIsHost
        ? 'Click below to start your live stream'
        : 'Click below to join the live stream'}
    </p>
    <Button size="lg" onClick={() => setIsInRoom(true)} className="w-full">
      {effectiveIsHost ? 'Start Stream' : 'Join Stream'}
    </Button>
  </Card>
)}
```

This ensures the host never sees "Ready to join?" on their own room -- they either see a brief loading indicator or the correct "Ready to start?" message.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/community/LiveRoomViewer.tsx` | Destructure `isLoading` from the host query; show loading state on entry gate while host status is resolving |

