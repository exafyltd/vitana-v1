
## Fix: Duplicate Key Error on Reserve Spot

### Root Cause

The participation check query filters by `status = 'attending'` AND uses `.single()`. If the record exists with any other status, or if `.single()` fails for any reason, the hook thinks the user isn't participating. When they click "Reserve Spot", it tries to INSERT a new row, but the unique constraint on `(event_id, user_id)` blocks it.

### Changes

**File: `src/hooks/useEventParticipation.ts`**

Two fixes:

1. **Check query**: Remove the `status` filter and use `.maybeSingle()` instead of `.single()`. This finds the record regardless of status, preventing the false negative that causes the duplicate insert.

2. **Join operation**: Replace `.insert()` with `.upsert()` using `onConflict: 'event_id,user_id'`. This way, if a record already exists for any reason, it gets updated to `status: 'attending'` instead of throwing a duplicate key error.

### Technical Details

```tsx
// Fix 1: Check query (line 42-48)
const { data, error } = await supabase
  .from('global_event_participants')
  .select('*')
  .eq('event_id', eventId)
  .eq('user_id', user.id)
  .maybeSingle();  // no status filter, use maybeSingle

// Then check: data exists AND status is 'attending'
setIsParticipating(!!data && data.status === 'attending');

// Fix 2: Join operation (line 153-159)
const { error } = await supabase
  .from('global_event_participants')
  .upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status: 'attending'
    },
    { onConflict: 'event_id,user_id' }
  );
```

These two changes together ensure:
- The check always finds existing records regardless of status
- Even if the check somehow misses a record, the upsert gracefully updates it instead of crashing
