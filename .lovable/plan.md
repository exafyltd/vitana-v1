

## Fix: Event Reservation Still Not Persisting Across Logins

### Root Cause

The Supabase client's internal access token may not be fully synchronized when the `useAuth()` hook provides the `user` object. When the participation check query runs, the RLS policy `is_community_user()` calls `auth.uid()`, which returns NULL if the client token isn't ready yet. The query silently returns no rows, and `isParticipating` stays `false`.

This explains why it works on the first login (token is fresh) but fails on subsequent logins (token refresh hasn't completed when the query fires).

### Fix

**File: `src/hooks/useEventParticipation.ts`**

Inside the `checkParticipation` effect, call `supabase.auth.getSession()` before running the database query. This ensures the Supabase client has the latest valid access token set internally before the RLS-protected query runs.

```tsx
useEffect(() => {
  const checkParticipation = async () => {
    if (!eventId || !isValidUUID(eventId) || !user?.id) {
      setIsParticipating(false);
      return;
    }

    try {
      // Ensure the Supabase client has the latest token before querying
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setIsParticipating(false);
        return;
      }

      const { data, error } = await supabase
        .from('global_event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking participation:', error);
        return;
      }

      setIsParticipating(!!data && data.status === 'attending');
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

  checkParticipation();
}, [eventId, user?.id]);
```

### Why This Works

- `supabase.auth.getSession()` forces the client to resolve and apply the current session token before any query runs
- If the session is already valid, this is a near-instant local operation (no network call)
- It guarantees `auth.uid()` returns the correct user ID inside the RLS policy when the participation query executes
- The early return when no session exists prevents silent failures

### What Changes

One file modified: `src/hooks/useEventParticipation.ts` -- adding a `getSession()` call (3 lines) before the existing database query in the check effect.

