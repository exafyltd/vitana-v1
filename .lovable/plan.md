

## Mobile Calendar Modal Redesign (Bookings + Quick Add)

### Summary
Complete redesign of the Calendar modal opened from the mobile Utility/Action bar to be mobile-first, focused on VITANA bookings (fitness, training, health, community), with smooth scrolling, a clean header, and "Agenda | Month" tabbed navigation.

---

### Current Issues
1. **Desktop-first layout**: `max-w-[920px]`, `max-h-[80vh]` styling doesn't suit mobile bottom sheets
2. **Complex nested tabs**: Today | Week | Month with category filter chips adds clutter
3. **ScrollArea within Dialog**: Causes "stuck modal" scrolling bugs on mobile
4. **Header bloat**: Sync button, filter chips, and Autopilot suggestions compete for space
5. **No booking-centric focus**: Shows all events without highlighting VITANA bookings
6. **Wrong mental model**: "Smart Calendar" multi-purpose look vs. "My Calendar" personal bookings view

---

### Proposed Solution

Create a new **MobileCalendarModal** component that:
- Uses `ResponsiveDialog` for proper mobile bottom sheet behavior
- Height: 92vh with rounded-t-[24px] corners
- Single scroll container (body scrolls, header/footer sticky)
- Focuses on user's VITANA bookings
- Provides "Agenda | Month" segmented control (default: Agenda)

---

### Component Architecture

```text
MobileCalendarModal.tsx (new file)
├── Header (sticky)
│   ├── Calendar icon + "My Calendar"
│   └── "+ Event hinzufügen" button
│
├── Body (scrollable)
│   ├── TodaySection
│   │   ├── Date display
│   │   ├── Today's booked items (up to 3) OR "No bookings today"
│   │   └── Next upcoming card (title, time, category badge, location, CTA)
│   │
│   ├── SegmentedControl: [Agenda | Month]
│   │
│   ├── AgendaView (default tab)
│   │   ├── Group: Today
│   │   ├── Group: Tomorrow
│   │   ├── Group: This Week
│   │   └── Group: Later
│   │   Each row: title, time range, category badge, status pill
│   │
│   └── MonthView (secondary tab)
│       ├── Minimal month grid with dots on booked days
│       └── Selected day's events below grid
│
└── Footer (sticky)
    ├── Close button
    └── "Browse Activities" button
```

---

### Data Source: "Booked through VITANA"

All events where the user has a booking relationship:
- **Filter criteria**: events with `metadata.meetup_id` OR `metadata.ticket_id` OR `source_type: 'invite'` with accepted status
- **Include**: community, fitness, training, health, professional events that user actively joined/booked

Fields needed per booking:
- `id`, `title`, `start_time`, `end_time`
- `event_type` (for category badge)
- `location` (optional)
- `status` (for booking status pill)
- `metadata` (for route/link to detail)

---

### UI Specifications

#### Header (sticky)
```tsx
<div className="sticky top-0 z-10 bg-background px-4 pt-2 pb-3 border-b">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Calendar className="w-5 h-5 text-util-calendar-accent" />
      <div>
        <h2 className="text-lg font-semibold">My Calendar</h2>
        <p className="text-xs text-muted-foreground">Your booked activities in VITANA</p>
      </div>
    </div>
    <Button size="sm" className="gap-1.5 h-9">
      <Plus className="h-4 w-4" />
      Event hinzufügen
    </Button>
  </div>
</div>
```

#### Today Section
- Show current date formatted (e.g., "Tuesday, Feb 4")
- Up to 3 booked items for today with compact rows
- If no today bookings: "No bookings today" text
- "Next upcoming" card with:
  - Title
  - Time (e.g., "Fri, Feb 7 • 14:00")
  - Category badge (color-coded: Fitness, Health, Community, etc.)
  - Location (if available)
  - "Open →" CTA to navigate to event detail

#### Segmented Control
```tsx
<Tabs defaultValue="agenda" className="w-full">
  <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 rounded-lg">
    <TabsTrigger value="agenda">Agenda</TabsTrigger>
    <TabsTrigger value="month">Month</TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

#### Agenda View (grouped list)
- **Groups**: Today, Tomorrow, This Week, Later
- Each row:
  - Left: time range (e.g., "14:00–16:00")
  - Center: title (truncated)
  - Right: category badge + status pill
- Tap row → navigate to event detail
- Empty state: "No bookings yet" + "Browse activities" CTA

#### Month View
- Minimal calendar grid (prev/next arrows)
- Dots only on days with bookings
- Tap day → show that day's booked items below grid
- Compact event list for selected day

#### Footer (sticky)
```tsx
<div className="sticky bottom-0 z-10 bg-background px-4 py-3 border-t flex gap-2 pb-[env(safe-area-inset-bottom)]">
  <Button variant="outline" className="flex-1" onClick={onClose}>
    Close
  </Button>
  <Button variant="secondary" className="flex-1" onClick={onBrowseActivities}>
    Browse Activities
  </Button>
</div>
```

---

### Implementation Plan

#### Phase 1: Create New Mobile Calendar Component

**New file: `src/components/calendar/MobileCalendarModal.tsx`**

Structure:
1. Use `ResponsiveDialog` with `fullscreenOnMobile={false}` for 92vh bottom sheet
2. Custom height styling: `h-[92vh]` with `rounded-t-[24px]`
3. Native scrolling via `overflow-y-auto` on body (no `ScrollArea`)
4. Import `useCalendarEvents` for data
5. Filter for booked events only

#### Phase 2: Add Helper Functions

**Within `MobileCalendarModal.tsx`:**
- `getBookedEvents()`: Filter events that represent bookings
- `groupEventsByTimeframe()`: Group into Today/Tomorrow/ThisWeek/Later
- `getCategoryLabel()`: Map event_type to user-friendly labels

#### Phase 3: Create Sub-Components

**`TodayBookingsSection.tsx`** (can reuse/adapt `BookedVitanaEventsSection`)
- Today's date
- Up to 3 compact event rows
- "Next upcoming" card

**`AgendaGroupedList.tsx`**
- Grouped list with section headers
- Compact event rows with category badges and status pills

**`MonthGridView.tsx`**
- Minimal month calendar with dots
- Day selection → event list

#### Phase 4: Update Entry Point

**Modify `EnhancedCalendarPopup.tsx`:**
- Add `useIsMobile()` check at top
- If mobile, render `MobileCalendarModal` instead of desktop Dialog
- Desktop view remains unchanged

#### Phase 5: Add Translation Keys

**`src/i18n/en.json` and `src/i18n/de.json`:**
```json
"calendar": {
  "myCalendar": "My Calendar",
  "bookedActivities": "Your booked activities in VITANA",
  "noBookingsToday": "No bookings today",
  "nextUpcoming": "Next upcoming",
  "open": "Open",
  "noBookingsYet": "No bookings yet",
  "browseActivities": "Browse Activities",
  "agenda": "Agenda",
  "categories": {
    "fitness": "Fitness",
    "training": "Training",
    "health": "Health",
    "community": "Community",
    "professional": "Work"
  },
  "bookingStatus": {
    "booked": "Booked",
    "rsvp": "RSVP",
    "ticket": "Ticket",
    "reserved": "Reserved"
  },
  "timeGroups": {
    "today": "Today",
    "tomorrow": "Tomorrow",
    "thisWeek": "This Week",
    "later": "Later"
  }
}
```

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/calendar/MobileCalendarModal.tsx` | Create | New mobile-first calendar modal |
| `src/components/calendar/TodayBookingsSection.tsx` | Create | Today's bookings + next upcoming |
| `src/components/calendar/AgendaGroupedList.tsx` | Create | Grouped agenda list view |
| `src/components/calendar/MonthGridMobile.tsx` | Create | Minimal month grid for mobile |
| `src/components/calendar/EnhancedCalendarPopup.tsx` | Modify | Add mobile detection and delegate to MobileCalendarModal |
| `src/i18n/en.json` | Modify | Add new translation keys |
| `src/i18n/de.json` | Modify | Add German translations |

---

### Removed Elements (Mobile Only)
- Category filter chips (Persönlich / Arbeit / Gesundheit / Training / Community)
- "Smart Calendar" branding
- Sync button (de-emphasized to small footer text if kept)
- Week view tab (Agenda replaces Today + Week combined)
- Autopilot suggestions section (simplify focus)
- Quick actions on event rows (hover states don't work well on mobile)

---

### Technical Details

**Scrolling Fix:**
```tsx
// MobileCalendarModal.tsx body section
<div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
  {/* Content */}
</div>
```

**Event Filtering for Bookings:**
```typescript
const bookedEvents = events.filter(event => 
  (event.metadata?.meetup_id) || 
  (event.metadata?.ticket_id) ||
  (event.source_type === 'invite' && event.status === 'confirmed')
);
```

**Time Grouping Logic:**
```typescript
const groupEvents = (events: CalendarEvent[]) => {
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const endOfWeek = endOfWeek(now);
  
  return {
    today: events.filter(e => isSameDay(new Date(e.start_time), now)),
    tomorrow: events.filter(e => isSameDay(new Date(e.start_time), tomorrow)),
    thisWeek: events.filter(e => {
      const date = new Date(e.start_time);
      return isAfter(date, tomorrow) && isBefore(date, endOfWeek);
    }),
    later: events.filter(e => isAfter(new Date(e.start_time), endOfWeek))
  };
};
```

---

### Acceptance Criteria
- Scrolling works smoothly (no stuck modal)
- Calendar is the visual focus
- Shows Today + Next upcoming immediately at top
- Shows all booked items regardless of category
- "+ Event hinzufügen" is available and opens create flow
- Agenda is default tab, Month is secondary
- Mobile-first, uncluttered UI
- Fully localized (DE/EN)

