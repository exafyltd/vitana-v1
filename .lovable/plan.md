

## Fix: Event Reservation Disappearing on Second Login

### Root Cause

The `useEventParticipation` hook sets up its own `onAuthStateChange` listener, which fires `SIGNED_IN` before the Supabase client has fully updated its internal auth token. The subsequent database query then uses the old/expired token and silently returns no data, making the UI show "Reserve Spot" instead of "Cancel Reservation."

This explains the exact pattern you described:
- First re-login: token is still fresh enough in the client, query works
- Second re-login: previous token fully expired during logout, the query fires before the new token is ready, returns nothing

### Fix

**File: `src/hooks/useEventParticipation.ts`**

Replace the custom auth state listener with the `useAuth()` hook from `AuthProvider`, which already properly manages session state and guarantees the token is ready when `user` is set.

- Remove the entire first `useEffect` that calls `getUser()` and sets up `onAuthStateChange`
- Remove the `userId` state variable
- Import `useAuth` and get `user` from it
- Derive `userId` directly from `user?.id`
- The check effect depends on `[eventId, user?.id]` -- when AuthProvider updates the user (after the token is confirmed valid), the check re-runs with a valid session

This eliminates the race condition because `AuthProvider.onAuthStateChange` sets the user only after Supabase has fully processed the session, and all subsequent queries use the now-valid token.

### Technical Details

```tsx
import { useAuth } from "@/context/AuthProvider";

export function useEventParticipation(eventId, initialCount, eventDetails) {
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { addEvent, removeEvent } = useCalendarEvents();

  // Check participation -- depends on user from AuthProvider
  useEffect(() => {
    const checkParticipation = async () => {
      if (!eventId || !isValidUUID(eventId) || !user?.id) {
        setIsParticipating(false);
        return;
      }
      // ... existing fetch logic using user.id
    };
    checkParticipation();
  }, [eventId, user?.id]);

  // ... rest unchanged
}
```

This is a minimal change -- we remove ~15 lines of duplicate auth tracking and replace them with a single `useAuth()` call, which is the established pattern in the rest of the codebase.
