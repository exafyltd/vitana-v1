

# Add "Dancing Filmevent" creator to Hot tab filter

## What
The Hot tab currently only shows events created by one specific user ID. We need to also include events created by `c7d3260d-8311-4a0b-ab1c-53928a37caec` (the creator of "MAXINA Experience präsentiert: Dancing Filmevent").

## Change — `src/pages/community/EventsAndMeetups.tsx`

**Lines 443–448**: Replace single ID check with a Set of authorized creator IDs:

```typescript
const HOT_CREATOR_IDS = new Set([
  '07ade9bf-9c2f-4fe1-a733-29e85a1d253b',
  'c7d3260d-8311-4a0b-ab1c-53928a37caec',
]);

const maxinaEvents = useMemo(() => {
  return dbEvents
    .filter(event => HOT_CREATOR_IDS.has(event.created_by))
    .map(event => ({ ...event, event_type: 'event' }));
}, [dbEvents]);
```

Single file, single change.

