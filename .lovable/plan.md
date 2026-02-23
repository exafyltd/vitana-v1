
## Fix: Event Reservation Not Persisting After Re-login

### Root Cause

The `useEventParticipation` hook checks if the user has reserved a spot only when the `eventId` changes. After logging out and back in, the event ID stays the same, so the check never re-runs. The reservation data is still in the database -- it's just not being read again after authentication changes.

### Fix 1: Re-check participation when auth state changes

**File: `src/hooks/useEventParticipation.ts`**

Add an auth state listener so that when the user logs in or out, the participation check re-runs automatically.

- Add a `userId` state variable that updates on `onAuthStateChange`
- Add `userId` to the dependency array of the `checkParticipation` effect
- When user logs out, reset `isParticipating` to `false`
- When user logs in, re-fetch participation status from the database

### Fix 2: Add missing DELETE RLS policy

**Database migration**

The `global_event_participants` table currently has INSERT, SELECT, and UPDATE policies but no DELETE policy. This means users cannot actually leave events (the `.delete()` call fails silently). Add:

```sql
CREATE POLICY "Users can leave events"
  ON global_event_participants
  FOR DELETE
  USING (user_id = auth.uid() AND is_community_user());
```

### Technical Details

Updated hook structure:

```tsx
export function useEventParticipation(eventId, initialCount, eventDetails) {
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Track auth state changes
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
        if (!session?.user) {
          setIsParticipating(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Check participation -- now depends on userId too
  useEffect(() => {
    const checkParticipation = async () => {
      if (!eventId || !isValidUUID(eventId) || !userId) {
        setIsParticipating(false);
        return;
      }
      // ... existing fetch logic using userId instead of getUser()
    };
    checkParticipation();
  }, [eventId, userId]);

  // ... rest unchanged
}
```

This ensures that every time the user's auth state changes (login, logout, token refresh), the hook re-checks participation status from the database.
