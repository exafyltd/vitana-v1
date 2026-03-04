

# Plan: Update all MAXINA meetups to event type in database

## What
Run a SQL UPDATE to change `event_type` from `'meetup'` to `'event'` for all events created by the MAXINA creator (`07ade9bf-9c2f-4fe1-a733-29e85a1d253b`) in the `global_community_events` table.

## Steps

1. **Run SQL update** — Use the insert tool to execute:
   ```sql
   UPDATE global_community_events 
   SET event_type = 'event' 
   WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b' 
     AND event_type = 'meetup';
   ```

2. **Verify** — Query the table to confirm no meetups remain for that creator.

## Impact
- Hot tab events will now show "Reserve Spot" instead of "Join MeetUp"
- Pillar badge will show "EVENT" instead of "MEETUP"
- Ticketing features (Buy Ticket, etc.) will apply when ticket types are configured
- No code changes needed — the existing CTA logic already handles `event_type = 'event'` correctly

