

# Fix Language Switching Revert Issue

## Root Cause

The error **"Cannot coerce the result to a single JSON object"** comes from `useUserPreferences.ts` line 95: `.select().single()` on the update query. This fails when there are multiple `user_preferences` rows for the same user (or zero rows). 

When the mutation fails:
1. Language is set locally to German
2. `updatePreferences` fires but fails → error toast shown
3. Server still has the old language value
4. React Query refetches preferences → old language comes back
5. Although `pendingLanguageRef` should guard against revert, the failed mutation + query invalidation from other sources causes the 2-second snap-back

## Fix

### `src/hooks/useUserPreferences.ts`

**Line 90-95**: Remove `.select().single()` from the update mutation. We don't need the returned data since `onSuccess` already invalidates the query cache to refetch.

```ts
// Before
const { data, error } = await supabase
  .from("user_preferences")
  .update(updates)
  .eq("user_id", user.id)
  .select()
  .single();

// After
const { error } = await supabase
  .from("user_preferences")
  .update(updates)
  .eq("user_id", user.id);
```

Also update `mutationFn` return and `onSuccess` accordingly (no data needed).

**Line 100-106**: Suppress the generic "Preferences updated" toast for language changes — it's noise. Remove the toast from `onSuccess` (language context already handles UX feedback implicitly).

This is a one-file, minimal fix that eliminates the Supabase `.single()` error and prevents the revert.

