# Database Performance Optimization Plan

## ✅ IMPLEMENTATION COMPLETE

All Phase 1 optimizations have been applied to reduce Disk IO usage by an estimated 60-80%.

---

## Changes Made

### 1. Created Debounce Utility
**File**: `src/utils/realtimeDebounce.ts`
- Shared debounce function for realtime handlers
- Tab visibility checker to skip operations when hidden
- Batch invalidation support

### 2. Presence & Heartbeat Optimization
**File**: `src/hooks/useUserPresence.ts`
- Heartbeat interval: 30s → 60s (50% fewer writes)
- Health check interval: 10s → 30s (66% fewer checks)
- Added visibility guard to skip when tab is hidden

### 3. Background Refresh Optimization
**File**: `src/hooks/useBackgroundRefresh.ts`
- Notifications: 30s → 60s
- Wallet/earnings: 60s → 120s
- Background data: 120s → 180s

### 4. Realtime Handler Debouncing (2s delay)
**Files Updated**:
- `src/hooks/useWalletRealtime.ts` - Debounced balance/transaction updates
- `src/hooks/useRealtimeAPIMonitoring.ts` - Debounced all invalidateQueries
- `src/hooks/useActivityHistory.ts` - Debounced activity updates
- `src/hooks/useUnreadSync.ts` - Debounced unread changes with batching

### 5. Query Column Selection
**Files Updated**:
- `src/hooks/useActivityHistory.ts` - Specific columns instead of `*`
- `src/hooks/usePaginatedMessages.ts` - Specific columns for messages

### 6. Realtime Subscription Scope Reduction
- Changed `event: '*'` to specific events (`INSERT`, `UPDATE`)
- Reduced event volume and cascade refetches

---

## Expected Impact

| Optimization | DB Operations Reduced |
|--------------|----------------------|
| Presence heartbeat 30s → 60s | ~50% fewer writes |
| Health check 10s → 30s | ~66% fewer checks |
| Tab visibility guards | ~70% reduction when tab hidden |
| Realtime debouncing (2s) | ~80% fewer cascade refetches |
| Column selection | ~30% smaller data transfers |
| Specific event subscriptions | ~40% fewer event triggers |

**Total Expected Reduction: 60-80% of current disk IO usage**

---

## Monitoring

After the Disk IO budget regenerates, monitor the Supabase dashboard:
- Dashboard > Settings > Compute and Disk
- Check IOPS usage over time
- Verify budget is no longer being depleted

---

## If Issues Persist

1. **Upgrade Compute Tier**: Supabase Dashboard > Settings > Compute and Disk
2. **Add Database Indexes**: For frequently queried columns
3. **Implement Read Replicas**: For read-heavy workloads
