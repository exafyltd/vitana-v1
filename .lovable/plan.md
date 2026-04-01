

# Investigating: Group chats not visible on mobile

## Analysis

After thorough code review, **the mobile and desktop inbox use identical data pipelines**. There is no mobile-specific code that filters out group chats. Both viewports:
- Use `useHybridMessages(messageContext)` → `useGlobalMessages()` → same `fetchLegacyThreads()` function
- Render threads from the same `displayThreads` array
- Apply the same filter logic (`getFilteredThreads`)

The mobile layout at line 1050-1069 of `Messages.tsx` shows a `SplitBar` with "Community" and "Network" tabs, plus sub-filters for "All", "Direct", and "Groups" — all using the same thread data.

## Likely causes (data, not code)

1. **Context tab mismatch**: Group chats only appear under the "Community" tab. If the user's `currentRole` resolves to something other than `community`, the default tab will be "Network" (tenant), which fetches from a different message store that has no group threads.

2. **No group thread participants**: The reactivation migration returned 0 rows — meaning either all participants were already active, or none existed. If the user was never added as a participant to group threads, they won't see them.

3. **RLS blocking**: The `global_message_threads` SELECT policy requires `is_active = true` in `global_thread_participants`. If somehow a user's participation row has `is_active = false` for a non-group thread type (the migration only targeted `type = 'group'`), that's fine — but it's worth verifying.

## Recommended diagnostic steps

Since the issue is data-level, not code-level, we need to run SQL queries in the Supabase SQL Editor to diagnose:

### Query 1: Check if the user has any group thread participations
```sql
SELECT gtp.thread_id, gtp.is_active, gtp.role, gmt.type, gmt.name
FROM global_thread_participants gtp
JOIN global_message_threads gmt ON gmt.id = gtp.thread_id
WHERE gtp.user_id = '<USER_ID>'
AND gmt.type = 'group';
```

### Query 2: Check all group threads that exist
```sql
SELECT id, name, type, created_by, created_at
FROM global_message_threads
WHERE type = 'group'
ORDER BY created_at DESC
LIMIT 20;
```

### Query 3: Check community group memberships vs thread participants
```sql
SELECT gcgm.group_id, gcg.name, gcg.chat_thread_id,
  EXISTS(
    SELECT 1 FROM global_thread_participants gtp 
    WHERE gtp.thread_id = gcg.chat_thread_id 
    AND gtp.user_id = '<USER_ID>'
  ) as has_thread_participant
FROM global_community_group_members gcgm
JOIN global_community_groups gcg ON gcg.id = gcgm.group_id
WHERE gcgm.user_id = '<USER_ID>';
```

## Next steps

No code changes needed at this stage. The user should:
1. Confirm they are on the **"Community" tab** (not "Network") on mobile
2. Run the diagnostic queries above with their user ID to identify whether group thread participant rows exist
3. If rows are missing, we can write a migration to backfill them

