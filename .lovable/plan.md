

# Database Performance Optimization Plan

## Problem Summary

Your Supabase project is depleting its **Disk IO Budget** because the application is performing too many database operations. When the budget is exhausted, all database queries slow down dramatically, causing the 503/504 "upstream timeout" errors you're seeing.

## What is Disk IO Budget?

Think of it like a daily data allowance for your database:
- Every read/write to the database consumes this budget
- When depleted, operations become extremely slow or timeout
- The budget regenerates over time, but heavy usage can outpace regeneration

---

## Root Causes Identified

### 1. Aggressive Polling & Heartbeats
- **User Presence**: Writes to `thread_presence` table every 30 seconds per user
- **Connection Health Check**: Runs every 10 seconds per user
- **Background Refresh**: 7 interval timers refreshing various data

### 2. Excessive Realtime Subscriptions  
- 38+ files with realtime postgres_changes subscriptions
- Many subscribe to `*` (all events) instead of specific events
- Each subscription triggers database reads when events occur

### 3. Heavy Query Patterns
- 80+ files using `SELECT *` instead of selecting specific columns
- Many queries lack pagination or limits
- Activity history fetches from multiple tables simultaneously

### 4. Cache Invalidation Storms
- 41 files calling `invalidateQueries` which triggers refetches
- Realtime events triggering immediate cache invalidation

---

## Optimization Strategy (3 Phases)

### Phase 1: Quick Wins (Immediate Relief)

**A. Reduce Presence Heartbeat Frequency**
- Change heartbeat from 30s to 60s
- Change health check from 10s to 30s
- Skip heartbeat when tab is hidden

**B. Add Tab Visibility Guards**
- Stop all polling/intervals when browser tab is hidden
- Resume when tab becomes visible

**C. Throttle Realtime-Triggered Refetches**
- Add 2-second debounce to realtime event handlers
- Prevent multiple rapid refetches from cascading

### Phase 2: Query Optimization

**A. Select Only Required Columns**
Instead of:
```typescript
.select('*')
```
Use:
```typescript
.select('id, name, created_at')
```

**B. Add Proper Pagination**
- Ensure all list queries have reasonable limits
- Use cursor-based pagination for infinite scroll

**C. Batch Profile Lookups**
- Cache user profiles in memory
- Batch multiple profile requests into single queries

### Phase 3: Architectural Improvements

**A. Reduce Realtime Subscription Scope**
- Subscribe to specific events (INSERT only, not *)
- Add filters to reduce broadcast scope

**B. Implement Request Deduplication**
- Prevent duplicate concurrent requests for same data
- Use the existing `useRequestDeduplication` hook more broadly

**C. Add Client-Side Caching Layer**
- Extend localStorage persistence for more query types
- Cache static data (profiles, tenant info) longer

---

## Implementation Steps (What You'll Do)

### Step 1: Presence System Optimization
Modify `src/hooks/useUserPresence.ts`:
- Heartbeat: 30s to 60s
- Health check: 10s to 30s
- Add visibility check to skip when hidden

### Step 2: Background Refresh Optimization  
Modify `src/hooks/useBackgroundRefresh.ts`:
- Increase intervals (30s to 60s for critical, 60s to 120s for semi-critical)
- Add visibility pause

### Step 3: Realtime Handler Debouncing
Add debounce to realtime event handlers in:
- `useWalletRealtime.ts`
- `useRealtimeAPIMonitoring.ts`  
- `useActivityHistory.ts`
- `useUnreadSync.ts`

### Step 4: Query Column Selection
Update heavy queries to select only needed columns in:
- `useActivityHistory.ts`
- `usePaginatedMessages.ts`
- `useUserPresence.ts`

---

## Expected Impact

| Optimization | DB Operations Reduced |
|--------------|----------------------|
| Presence heartbeat 30s to 60s | ~50% fewer writes |
| Health check 10s to 30s | ~66% fewer checks |
| Tab visibility guards | ~70% reduction when tab hidden |
| Realtime debouncing | ~80% fewer cascade refetches |
| Column selection | ~30% smaller data transfers |

**Total Expected Reduction: 60-80% of current disk IO usage**

---

## Technical Details

### Files to Modify

1. `src/hooks/useUserPresence.ts`
   - Line 295-301: Change heartbeat interval
   - Line 303-313: Change health check interval
   - Add visibility check

2. `src/hooks/useBackgroundRefresh.ts`
   - Lines 18-32: Increase all interval values

3. `src/hooks/useWalletRealtime.ts`
   - Lines 15-50: Add debounce wrapper to callbacks

4. `src/hooks/useRealtimeAPIMonitoring.ts`
   - Add debounce to all invalidateQueries calls

5. `src/hooks/useActivityHistory.ts`
   - Lines 369-384: Select specific columns
   - Lines 304-340: Debounce realtime handlers

6. Create utility: `src/utils/realtimeDebounce.ts`
   - Shared debounce function for realtime handlers

---

## Alternative: Upgrade Compute

If optimization alone isn't sufficient, you can also upgrade your Supabase compute tier:
- Go to Supabase Dashboard > Settings > Compute and Disk
- Higher tiers have higher baseline IOPS (disk operations per second)
- This is a paid option but provides immediate relief

