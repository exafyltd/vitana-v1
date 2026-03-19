

## Reaction Notifications

### Problem
When a user reacts to someone's message with an emoji, the message author receives no notification. They only discover the reaction when they open that specific chat.

### Solution
Create a database trigger on `message_reactions` that inserts a notification into `user_notifications` for the message author, following the same pattern as the existing `notify_on_chat_message` trigger.

### Implementation

**1. Database migration — Create trigger function and trigger**

A new `notify_on_reaction()` function that:
- Looks up the message author by checking `global_messages`, `chat_messages`, and `messages` tables (since reactions can be on any message type)
- Skips self-reactions (user reacting to their own message)
- Gets the reactor's display name from `profiles`
- Inserts a `user_notification` with type `'message_reaction'`, title like "New Reaction", body like "Alice reacted 👍 to your message"
- Deduplicates: skips if the same user already reacted to the same message within 5 seconds
- Looks up the recipient's tenant for the `tenant_id` field

The trigger fires `AFTER INSERT ON message_reactions`.

**2. Frontend — Handle reaction notification display**

- **`src/hooks/useNotifications.ts`** or notification rendering: Ensure `message_reaction` type notifications display properly with the emoji and link to `/inbox`
- No changes needed to the reaction hooks themselves — the trigger handles everything server-side

### Technical details

```sql
-- Trigger function pseudocode
CREATE FUNCTION notify_on_reaction() RETURNS TRIGGER AS $$
  -- Find message author from global_messages, chat_messages, or messages
  -- Skip if reactor == author
  -- Get reactor name from profiles
  -- Insert into user_notifications (type='message_reaction', body='Name reacted 👍')
$$;

CREATE TRIGGER trg_notify_reaction
  AFTER INSERT ON message_reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();
```

### Files to modify
- New SQL migration (database trigger)
- `src/hooks/useNotifications.ts` — minor: ensure `message_reaction` type renders correctly (if needed)

