

# Mobile Performance Enhancement Plan - Appilix PWA (11 Screens)

## Scope & Objectives

This plan implements the performance architecture **strictly scoped to the 11 Appilix mobile screens**:

| # | Screen URL | Component |
|---|------------|-----------|
| 1 | `/comm/events-meetups` | EventsAndMeetups |
| 2 | `/comm/live-rooms` | LiveRooms |
| 3 | `/comm/media-hub` | MediaHub |
| 4 | `/discover` | Discover |
| 5 | `/discover/orders` | Orders |
| 6 | `/wallet` | Wallet |
| 7 | `/health` | Health |
| 8 | `/inbox` | Messages |
| 9 | `/me/profile` | Profile |
| 10 | `/business` | BusinessHub |
| 11 | (OAuth portal) | MaxinaPortal (already done) |

**Goals:**
- Never show blank screens on tab navigation
- Instant tab switching for bottom nav (Events, Business, Live, Profile)
- Replace empty/brain loaders with premium skeleton loaders
- Cache-first rendering with background refresh
- Prefetch events immediately after login

---

## Implementation Strategy

### Phase 1: KeepAlive Tab Router for Bottom Navigation

Create a `MobileTabKeepAlive` component that keeps the 4 bottom tab destinations mounted but hidden, preventing remount/refetch on tab switch.

**Tab Destinations (KeepAlive applied):**
- Events: `/comm/events-meetups`
- Business: `/business`
- Live: `/comm/live-rooms`
- Profile: `/me/profile`

**Non-KeepAlive screens (normal routing):**
- `/comm/media-hub`
- `/discover`
- `/discover/orders`
- `/wallet`
- `/health`
- `/inbox`

**Technical approach:**
```text
// Conceptual structure - all 4 tabs always mounted
// Visibility controlled by CSS display: none/block

<div className="mobile-keepalive-container">
  <div style={{ display: isEventsActive ? 'block' : 'none' }}>
    <EventsAndMeetups />
  </div>
  <div style={{ display: isBusinessActive ? 'block' : 'none' }}>
    <BusinessHub />
  </div>
  <div style={{ display: isLiveActive ? 'block' : 'none' }}>
    <LiveRooms />
  </div>
  <div style={{ display: isProfileActive ? 'block' : 'none' }}>
    <Profile />
  </div>
</div>
```

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/mobile/MobileTabKeepAlive.tsx` | KeepAlive wrapper component using CSS visibility |

**Files to modify:**
| File | Change |
|------|--------|
| `src/App.tsx` | Add conditional mobile routing that uses `MobileTabKeepAlive` for bottom tab routes |

---

### Phase 2: Migrate Appilix-Used Hooks to React Query

**Target hooks that currently use `useState`/`useEffect`:**

| Hook | Used By | New QueryKey |
|------|---------|--------------|
| `useWallet` | Wallet | `['wallet-data', userId]` |
| `useCalendarEvents` | Calendar popup (across screens) | `['calendar-events', userId]` |
| `useOrganizerEvents` | Business Hub | `['organizer-events', userId]` |

**Migration pattern:**
```typescript
// Before (useState)
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => { fetchData(); }, []);

// After (useQuery)
const { data = [], isLoading, isFetching } = useQuery({
  queryKey: ['wallet-data', userId],
  queryFn: async () => { /* existing fetch logic */ },
  staleTime: 2 * 60 * 1000,
  enabled: !!userId,
});
```

**Files to modify:**
| File | Change |
|------|--------|
| `src/hooks/useWallet.ts` | Wrap `fetchBalances`/`fetchTransactions` with `useQuery` |
| `src/hooks/useCalendarEvents.ts` | Wrap `fetchEvents` with `useQuery` |
| `src/hooks/useOrganizerEvents.ts` | Convert `useEffect` fetch to `useQuery` |

---

### Phase 3: Add Missing Skeleton Loaders

Create premium skeleton components for screens that currently use basic loaders.

**New skeleton components:**

| Component | Matches Layout |
|-----------|----------------|
| `LiveRoomCardSkeleton` | LiveRoomCard (video card style) |
| `WalletSkeleton` | MobileWalletBalanceCard (3 cards) |
| `ProfileSkeleton` | ProfileIdCardFront (ID card style) |
| `BusinessHubSkeleton` | MobileKPIStrip + EarningPortal |
| `HealthSkeleton` | MobileHealthSnapshot (circular index + pills) |
| `DiscoverSkeleton` | MobileDiscoverView intent blocks |
| `OrdersSkeleton` | MobileOrdersView cards |

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/liverooms/LiveRoomCardSkeleton.tsx` | Live rooms grid skeleton |
| `src/components/wallet/WalletSkeleton.tsx` | Wallet balance cards skeleton |
| `src/components/profile/ProfileSkeleton.tsx` | Profile ID card skeleton |
| `src/components/business/BusinessHubSkeleton.tsx` | Business hub mobile skeleton |
| `src/components/health/HealthSkeleton.tsx` | Health dashboard skeleton |
| `src/components/discover/DiscoverSkeleton.tsx` | Discover view skeleton |

**Files to modify (integrate skeletons):**
| File | Change |
|------|--------|
| `src/pages/community/LiveRooms.tsx` | Replace loading div with `LiveRoomCardSkeleton` |
| `src/pages/Wallet.tsx` | Use `WalletSkeleton` in mobile branch |
| `src/pages/Profile.tsx` | Use `ProfileSkeleton` with cache guard |
| `src/pages/BusinessHub.tsx` | Use `BusinessHubSkeleton` in mobile branch |
| `src/pages/Health.tsx` | Use `HealthSkeleton` in mobile branch |
| `src/pages/Discover.tsx` | Use `DiscoverSkeleton` in mobile branch |

---

### Phase 4: Expand Prefetch Registry

Add prefetch paths for all 11 Appilix screens.

**New `ADJACENT_PILLARS` entries:**
```typescript
'/comm/events-meetups': ['/business', '/comm/live-rooms', '/me/profile'],
'/business': ['/comm/events-meetups', '/wallet'],
'/comm/live-rooms': ['/comm/events-meetups', '/comm/media-hub'],
'/me/profile': ['/wallet', '/settings'],
```

**New prefetch entries in `prefetchForPath`:**
```typescript
// Business Hub
if (path.startsWith('/business')) {
  await queryClient.prefetchQuery({
    queryKey: ['organizer-events', userId],
    queryFn: fetchOrganizerEventsQueryFn,
    staleTime,
  });
}

// Wallet
if (path.startsWith('/wallet')) {
  await queryClient.prefetchQuery({
    queryKey: ['wallet-data', userId],
    queryFn: fetchWalletQueryFn,
    staleTime,
  });
}

// Profile
if (path.startsWith('/me/profile')) {
  await queryClient.prefetchQuery({
    queryKey: ['profiles', userId],
    queryFn: fetchProfileQueryFn,
    staleTime,
  });
}
```

**Files to modify:**
| File | Change |
|------|--------|
| `src/lib/prefetch-registry.ts` | Add business, wallet, profile prefetch paths |
| `src/main.tsx` | Add wallet, organizer-events to `PERSIST_KEYS` |

---

### Phase 5: Cache-First Loading Guards

Update all 11 screens to use the cache-aware skeleton pattern.

**Pattern:**
```typescript
// Show skeleton ONLY when loading AND no cached data
{isLoading && data.length === 0 ? (
  <ScreenSpecificSkeleton />
) : (
  <ActualContent data={data} />
)}
```

**Screens to update:**
- `EventsAndMeetups.tsx` - Already done
- `LiveRooms.tsx` - Update loading condition
- `MediaHub.tsx` - Update loading condition
- `Wallet.tsx` - Update loading condition
- `BusinessHub.tsx` - Update loading condition
- `Health.tsx` - Update loading condition
- `Discover.tsx` - Update loading condition
- `Profile.tsx` - Update loading condition
- `Messages.tsx` - Already done
- `Orders.tsx` - Update loading condition

---

## Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Create `MobileTabKeepAlive` component | Medium |
| 2 | Integrate KeepAlive into App.tsx for mobile routes | Medium |
| 3 | Migrate `useWallet` to React Query | Medium |
| 4 | Migrate `useCalendarEvents` to React Query | Medium |
| 5 | Migrate `useOrganizerEvents` to React Query | Low |
| 6 | Create 6 new skeleton components | Medium |
| 7 | Integrate skeletons into page components | Low |
| 8 | Expand prefetch registry | Low |
| 9 | Add query keys to PERSIST_KEYS | Low |
| 10 | Test tab switching + cache behavior | Testing |

---

## Technical Notes

### KeepAlive Considerations
- Only applies to mobile (`window.innerWidth < 768`)
- Deep routes (e.g., `/comm/live-rooms/:id/view`) bypass KeepAlive
- Desktop routing remains unchanged
- Memory impact: 4 screens always mounted (acceptable for modern devices)

### Scroll Position
- CSS `display: none` preserves scroll position natively
- No explicit `useScrollRestore` hook needed for KeepAlive tabs
- Nested ScrollAreas may need explicit restoration (monitor during testing)

### Cache Key Stability
- All prefetch queryKeys must match hook queryKeys exactly
- Use stable constants for object parameters (e.g., `EMPTY_PARAMS`)
- Verify with React Query DevTools during testing

### Skeleton Design Guidelines
- Use glassy backgrounds (`bg-gradient-to-br from-muted/60`)
- Apply shimmer animation (`animate-[shimmer_2s_infinite]`)
- Match exact layout dimensions of real components
- Include rounded corners, shadows matching VITANA premium style

---

## Files Summary

### New Files (8 total)
- `src/components/mobile/MobileTabKeepAlive.tsx`
- `src/components/liverooms/LiveRoomCardSkeleton.tsx`
- `src/components/wallet/WalletSkeleton.tsx`
- `src/components/profile/ProfileSkeleton.tsx`
- `src/components/business/BusinessHubSkeleton.tsx`
- `src/components/health/HealthSkeleton.tsx`
- `src/components/discover/DiscoverSkeleton.tsx`
- `src/components/orders/OrdersSkeleton.tsx`

### Modified Files (12 total)
- `src/App.tsx` - Mobile KeepAlive routing
- `src/hooks/useWallet.ts` - Migrate to React Query
- `src/hooks/useCalendarEvents.ts` - Migrate to React Query
- `src/hooks/useOrganizerEvents.ts` - Migrate to React Query
- `src/lib/prefetch-registry.ts` - Expand prefetch paths
- `src/main.tsx` - Expand PERSIST_KEYS
- `src/pages/community/LiveRooms.tsx` - Add skeleton + cache guard
- `src/pages/Wallet.tsx` - Add skeleton + cache guard
- `src/pages/Profile.tsx` - Add skeleton + cache guard
- `src/pages/BusinessHub.tsx` - Add skeleton + cache guard
- `src/pages/Health.tsx` - Add skeleton + cache guard
- `src/pages/Discover.tsx` - Add skeleton + cache guard

---

## Expected Outcomes

After implementation:
1. Tab switching between Events, Business, Live, Profile is **instant** (no remount)
2. All screens render cached data **immediately** on navigation
3. Background refresh updates stale data **without blocking UI**
4. Premium skeleton loaders appear **only on cold start**
5. Events data is **prefetched during login**, ready on first paint
6. Scroll position preserved when switching bottom tabs

