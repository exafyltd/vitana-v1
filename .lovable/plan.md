

## Fix: Reaction Notification Body is Empty (NULL)

### Problem
The reaction notification trigger looks up the reactor's name with `SELECT ... FROM profiles WHERE id = NEW.user_id`, but in the `profiles` table, the auth user UUID is stored in the `user_id` column, not `id`. This causes the name lookup to return NULL, which makes the string concatenation for `body` also NULL.

Result: notifications are created and pushed to mobile, but with an empty body — the user sees a push with title "New Reaction" and no text.

### Fix
**Database migration** — Update `notify_on_reaction()` function, changing one line:

```sql
-- Before:
FROM profiles WHERE id = NEW.user_id;

-- After:
FROM profiles WHERE user_id = NEW.user_id;
```

This is a single-line fix in the existing function. The rest of the trigger logic is correct — tenant lookup, deduplication, self-reaction skip all work properly.

### Files to modify
- New SQL migration to `CREATE OR REPLACE FUNCTION notify_on_reaction()` with the corrected column reference

