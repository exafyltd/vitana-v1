

## Display Booked Vitana Events in Mobile Calendar

### Summary
Add a dedicated "Booked Vitana Events" section to the mobile calendar view (accessed from the utility/action bar) that prominently displays:
1. Today's booked community/meetup events
2. The next upcoming booked event (if exists)

This surfaces the user's RSVP'd/joined Vitana community events at the top of the calendar for quick visibility.

---

### Background
When users join a Vitana meetup via "Add to VITANA Calendar", the event is saved to `calendar_events` with:
- `event_type: 'community'`
- `metadata.meetup_id`: the original Vitana meetup ID

The current calendar popup shows ALL events mixed together. The request is to highlight booked Vitana events specifically.

---

### Solution Overview

Add a new **"Your Booked Events"** section at the top of the "Today" tab in the EnhancedCalendarPopup, displaying:
- **Today's booked events** (community type with metadata.meetup_id)
- **Next upcoming event** if nothing is scheduled for today

This section appears BEFORE the Autopilot suggestions and regular event list.

---

### Implementation Details

#### 1. Add Helper Logic to Filter Booked Vitana Events

Inside `EnhancedCalendarPopup.tsx`, add computed values for booked events:

```typescript
// Filter for booked Vitana events (community type with meetup metadata)
const bookedVitanaEvents = events.filter(event => 
  event.event_type === 'community' && 
  event.metadata?.meetup_id
);

// Today's booked events
const todayBookedEvents = bookedVitanaEvents.filter(event => {
  const eventDate = new Date(event.start_time);
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
}).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

// Next upcoming booked event (after today)
const nextUpcomingBooked = bookedVitanaEvents
  .filter(event => new Date(event.start_time) > new Date())
  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  [0] || null;
```

#### 2. Add "Your Booked Events" Section Component

Create a new section above the Autopilot suggestions in the "Today" tab:

**Section structure:**
- Section header with Users icon and title "Your Booked Events" / "Ihre gebuchten Events"
- If today has booked events → show them with time, title, location
- If no today events but has upcoming → show "Next up:" card with date/time
- If no booked events at all → hide section entirely (no empty state)

**Visual treatment:**
- Domain community accent color (`domain-community-accent`)
- Pill-style badges
- Compact card format similar to existing event rows

#### 3. Add Translation Keys

**English (`en.json`):**
```json
"calendar": {
  "bookedEvents": {
    "title": "Your Booked Events",
    "todayLabel": "Today",
    "nextUp": "Next up",
    "noEventsToday": "No events today"
  }
}
```

**German (`de.json`):**
```json
"calendar": {
  "bookedEvents": {
    "title": "Ihre gebuchten Events",
    "todayLabel": "Heute",
    "nextUp": "Als Nächstes",
    "noEventsToday": "Heute keine Events"
  }
}
```

---

### UI Layout (Today Tab)

```text
┌────────────────────────────────────────┐
│ 🎟️ Your Booked Events                  │
├────────────────────────────────────────┤
│ ● 14:00–16:00  Yoga im Park            │
│   📍 Stadtpark München                  │
├────────────────────────────────────────┤
│ Next up:                                │
│ ● Sat, Feb 8  Longevity Dance Night    │
│   📍 Community Center                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🎯 Autopilot Suggestions               │
│ ...                                     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ All Today's Events                      │
│ ...                                     │
└────────────────────────────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/calendar/EnhancedCalendarPopup.tsx` | Add booked events filtering logic and new UI section |
| `src/i18n/en.json` | Add `calendar.bookedEvents.*` keys |
| `src/i18n/de.json` | Add German translations |

---

### Visibility Logic

The "Your Booked Events" section will:
- **Show** if there are any booked Vitana events (today OR upcoming)
- **Hide** if the user has no booked community events at all
- Display today's events first, then "Next up" for the soonest future event

---

### Design Tokens

Using existing community domain tokens:
- Background: `bg-domain-community-tint`
- Accent: `text-domain-community-accent`
- Border: `border-domain-community-accent/20`
- Icon: Users (from lucide-react)

