

# Fix: Orders Mobile Missing App Bar

## Problem

In `Orders.tsx` (line 529-538), the mobile path returns `<MobileOrdersView>` directly — **without wrapping in `<AppLayout>`**. Since `AppLayout` provides `MobileAppShell` which renders the `TopAppBar`, the app bar never renders on the Orders mobile screen.

The desktop path (line 541) correctly wraps in `<AppLayout>`.

## Fix

### 1. `src/pages/discover/Orders.tsx`
Wrap the mobile return in `<AppLayout>` so it goes through `MobileAppShell` → `TopAppBar`:

```tsx
if (isMobile) {
  return (
    <AppLayout>
      <MobileOrdersView ... />
    </AppLayout>
  );
}
```

### 2. `src/components/orders/MobileOrdersView.tsx`
The sticky header at line 240 uses `sticky top-0 z-20`. With the TopAppBar now rendering above it (fixed, 32px + safe-area), this sticky header needs an offset so it doesn't hide behind the app bar:

- Change `top-0` to `top-[calc(env(safe-area-inset-top,0px)+32px)]` to sit below the TopAppBar
- Remove the duplicate title/description from `MobileOrdersView`'s header since `Orders.tsx` already renders `StandardHeader` — or keep MobileOrdersView self-contained but ensure the sticky offset is correct

### Files changed

| File | Change |
|------|--------|
| `src/pages/discover/Orders.tsx` | Wrap mobile return in `<AppLayout>` |
| `src/components/orders/MobileOrdersView.tsx` | Adjust sticky header top offset for TopAppBar clearance |

