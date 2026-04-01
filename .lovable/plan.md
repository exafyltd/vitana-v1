

# Fix Hot tab: keep Maxina creator + add one specific event

## Problem
The current filter includes ALL events from both creator IDs. The user only wants:
- All events by the original Maxina creator (`07ade9bf-...`)
- Plus one specific event: "Dancing Filmevent" (`6bb46db6-a3ba-42b6-8a50-2be8658e436f`)

## Change — `src/pages/community/EventsAndMeetups.tsx`

Replace the `HOT_CREATOR_IDS` Set approach with a filter that checks either the original Maxina creator ID OR the specific event ID:

```typescript
const MAXINA_CREATOR_ID = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b';
const HOT_EVENT_IDS = new Set([
  '6bb46db6-a3ba-42b6-8a50-2be8658e436f', // Dancing Filmevent
]);

const maxinaEvents = useMemo(() => {
  return dbEvents
    .filter(event => event.created_by === MAXINA_CREATOR_ID || HOT_EVENT_IDS.has(event.id))
    .map(event => ({ ...event, event_type: 'event' }));
}, [dbEvents]);
```

Single file, single change.

