
# Translate Calendar and Create Selection Popups to German

## Problem

When clicking "Kalender" (Calendar) or "Erstellen" (Create) buttons with German selected, the resulting popups display entirely in English. Two main components are affected:

1. **CreateSelectionDialog** - "Create New" dialog with Event/MeetUp options
2. **EnhancedCalendarPopup** - Smart Calendar with tabs, filters, and Autopilot suggestions

---

## Identified Hardcoded English Strings

### CreateSelectionDialog.tsx (~6 strings)

| English | German Translation |
|---------|-------------------|
| Create New | Neu erstellen |
| Choose the type of gathering you want to create | Wählen Sie die Art der Veranstaltung, die Sie erstellen möchten |
| Event | Event |
| Formal gatherings with scheduled times and structured programs | Formelle Veranstaltungen mit festen Zeiten und strukturierten Programmen |
| MeetUp | MeetUp |
| Casual gatherings for networking and community building | Lockere Treffen zum Netzwerken und für die Community |

### EnhancedCalendarPopup.tsx (~25 strings)

| English | German Translation |
|---------|-------------------|
| Smart Calendar | Smart Calendar |
| Add Event | Event hinzufügen |
| Synced | Synchronisiert |
| Syncing | Synchronisierung... |
| Today | Heute |
| Week | Woche |
| Month | Monat |
| Event created | Event erstellt |
| Your event has been added to the calendar | Ihr Event wurde dem Kalender hinzugefügt |
| Error | Fehler |
| Failed to create event | Event konnte nicht erstellt werden |
| Event deleted | Event gelöscht |
| The event has been removed from your calendar | Das Event wurde aus Ihrem Kalender entfernt |
| Syncing... | Synchronisierung... |
| Syncing with external calendars | Synchronisierung mit externen Kalendern |
| Calendar is up to date | Kalender ist aktuell |
| Suggestion accepted | Vorschlag akzeptiert |
| Autopilot has updated your calendar | Autopilot hat Ihren Kalender aktualisiert |
| Suggestion undone | Vorschlag rückgängig gemacht |
| Changes have been reverted | Änderungen wurden rückgängig gemacht |
| Suggestion snoozed | Vorschlag zurückgestellt |
| Reminder set for later today | Erinnerung für später heute gesetzt |
| Reminder set for tomorrow | Erinnerung für morgen gesetzt |
| Nothing scheduled | Nichts geplant |
| Try Quick Add or let Autopilot plan your day | Versuchen Sie Quick Add oder lassen Sie Autopilot Ihren Tag planen |
| Click any slot to create an event • Drag to reschedule | Klicken Sie auf einen Slot, um ein Event zu erstellen • Ziehen zum Verschieben |
| No events on this date | Keine Events an diesem Datum |
| Last synced | Zuletzt synchronisiert |
| just now | gerade eben |
| Close | Schließen |
| Joining event | Event beitreten |
| Opening video call... | Videoanruf wird geöffnet... |
| Message attendees | Teilnehmern schreiben |
| Feature coming soon | Funktion bald verfügbar |
| Invite followers | Follower einladen |
| Reschedule event | Event verschieben |
| Share to group | In Gruppe teilen |
| Now: | Jetzt: |
| Untitled Event | Unbenanntes Event |
| New Event | Neues Event |

### CalendarFilters.tsx (~5 strings)

| English | German Translation |
|---------|-------------------|
| Personal | Persönlich |
| Community | Community |
| Work | Arbeit |
| Health | Gesundheit |
| Workout | Training |

### AutopilotCalendarSuggestions.tsx (~10 strings)

| English | German Translation |
|---------|-------------------|
| Autopilot Suggestions | Autopilot-Vorschläge |
| Autopilot | Autopilot |
| Accept | Akzeptieren |
| Snooze | Zurückstellen |
| Dismiss | Verwerfen |
| Undo | Rückgängig |
| Later today | Später heute |
| Tomorrow | Morgen |
| Conflicts with: | Konflikt mit: |
| Recommend focus block | Fokusblock empfehlen |
| You have a 90-minute window available. Perfect for deep work. | Sie haben ein 90-minütiges Zeitfenster verfügbar. Perfekt für konzentriertes Arbeiten. |

---

## Implementation Plan

### Phase 1: Add Translation Keys (~50 new keys)

Add new namespaces to `src/i18n/de.json` and `src/i18n/en.json`:

```json
{
  "createSelection": {
    "title": "Neu erstellen",
    "description": "Wählen Sie die Art der Veranstaltung, die Sie erstellen möchten",
    "event": "Event",
    "eventDescription": "Formelle Veranstaltungen mit festen Zeiten und strukturierten Programmen",
    "meetup": "MeetUp",
    "meetupDescription": "Lockere Treffen zum Netzwerken und für die Community"
  },
  "calendar": {
    "smartCalendar": "Smart Calendar",
    "addEvent": "Event hinzufügen",
    "synced": "Synchronisiert",
    "syncing": "Synchronisierung...",
    "today": "Heute",
    "week": "Woche",
    "month": "Monat",
    "nothingScheduled": "Nichts geplant",
    "tryQuickAdd": "Versuchen Sie Quick Add oder lassen Sie Autopilot Ihren Tag planen",
    "clickSlotHint": "Klicken Sie auf einen Slot, um ein Event zu erstellen • Ziehen zum Verschieben",
    "noEventsOnDate": "Keine Events an diesem Datum",
    "lastSynced": "Zuletzt synchronisiert",
    "justNow": "gerade eben",
    "now": "Jetzt",
    "untitledEvent": "Unbenanntes Event",
    "newEvent": "Neues Event",
    "filters": {
      "personal": "Persönlich",
      "community": "Community",
      "work": "Arbeit",
      "health": "Gesundheit",
      "workout": "Training"
    },
    "autopilot": {
      "suggestions": "Autopilot-Vorschläge",
      "badge": "Autopilot",
      "accept": "Akzeptieren",
      "snooze": "Zurückstellen",
      "dismiss": "Verwerfen",
      "undo": "Rückgängig",
      "laterToday": "Später heute",
      "tomorrow": "Morgen",
      "conflictsWith": "Konflikt mit:",
      "suggestionAccepted": "Vorschlag akzeptiert",
      "calendarUpdated": "Autopilot hat Ihren Kalender aktualisiert",
      "suggestionUndone": "Vorschlag rückgängig gemacht",
      "changesReverted": "Änderungen wurden rückgängig gemacht",
      "suggestionSnoozed": "Vorschlag zurückgestellt",
      "reminderLaterToday": "Erinnerung für später heute gesetzt",
      "reminderTomorrow": "Erinnerung für morgen gesetzt",
      "recommendFocus": "Fokusblock empfehlen",
      "focusBlockDesc": "Sie haben ein 90-minütiges Zeitfenster verfügbar. Perfekt für konzentriertes Arbeiten."
    },
    "toasts": {
      "eventCreated": "Event erstellt",
      "eventCreatedDesc": "Ihr Event wurde dem Kalender hinzugefügt",
      "eventDeleted": "Event gelöscht",
      "eventDeletedDesc": "Das Event wurde aus Ihrem Kalender entfernt",
      "syncingTitle": "Synchronisierung...",
      "syncingDesc": "Synchronisierung mit externen Kalendern",
      "syncedTitle": "Synchronisiert",
      "syncedDesc": "Kalender ist aktuell",
      "joiningEvent": "Event beitreten",
      "openingVideoCall": "Videoanruf wird geöffnet...",
      "messageAttendees": "Teilnehmern schreiben",
      "featureComingSoon": "Funktion bald verfügbar",
      "inviteFollowers": "Follower einladen",
      "rescheduleEvent": "Event verschieben",
      "shareToGroup": "In Gruppe teilen"
    },
    "error": {
      "failedToCreate": "Event konnte nicht erstellt werden"
    }
  }
}
```

### Phase 2: Refactor CreateSelectionDialog.tsx

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function CreateSelectionDialog({ ... }: CreateSelectionDialogProps) {
  const { translate } = useTranslation();
  
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {translate('createSelection.title', 'Create New')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {translate('createSelection.description', 'Choose the type of gathering you want to create')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Option */}
            <Card ...>
              <h3>{translate('createSelection.event', 'Event')}</h3>
              <p>{translate('createSelection.eventDescription', 'Formal gatherings...')}</p>
            </Card>

            {/* MeetUp Option */}
            <Card ...>
              <h3>{translate('createSelection.meetup', 'MeetUp')}</h3>
              <p>{translate('createSelection.meetupDescription', 'Casual gatherings...')}</p>
            </Card>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
```

### Phase 3: Refactor EnhancedCalendarPopup.tsx

Key updates include:
- Import `useTranslation` hook
- Replace all hardcoded strings with `translate()` calls
- Update all toast messages to use translation keys
- Localize tab labels (Today, Week, Month)
- Localize sync status indicators
- Localize empty state messages

### Phase 4: Refactor CalendarFilters.tsx

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function CalendarFilters({ ... }: CalendarFiltersProps) {
  const { translate } = useTranslation();
  
  const getFilterLabel = (type: CalendarEvent['event_type']) => {
    switch (type) {
      case 'personal': return translate('calendar.filters.personal', 'Personal');
      case 'community': return translate('calendar.filters.community', 'Community');
      case 'professional': return translate('calendar.filters.work', 'Work');
      case 'health': return translate('calendar.filters.health', 'Health');
      case 'workout': return translate('calendar.filters.workout', 'Workout');
      default: return type;
    }
  };
  // Use getFilterLabel() instead of static label property
}
```

### Phase 5: Refactor AutopilotCalendarSuggestions.tsx

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function AutopilotCalendarSuggestions({ ... }: AutopilotCalendarSuggestionsProps) {
  const { translate } = useTranslation();
  
  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="h-4 w-4 text-sys-autopilot-accent" />
        <h3 className="text-sm font-semibold">
          {translate('calendar.autopilot.suggestions', 'Autopilot Suggestions')}
        </h3>
        ...
      </div>
      
      {/* Update all button labels */}
      <Button>{translate('calendar.autopilot.accept', 'Accept')}</Button>
      <Button>{translate('calendar.autopilot.snooze', 'Snooze')}</Button>
      <Button>{translate('calendar.autopilot.dismiss', 'Dismiss')}</Button>
      <Button>{translate('calendar.autopilot.undo', 'Undo')}</Button>
      
      {/* Update dropdown items */}
      <DropdownMenuItem>
        {translate('calendar.autopilot.laterToday', 'Later today')}
      </DropdownMenuItem>
      <DropdownMenuItem>
        {translate('calendar.autopilot.tomorrow', 'Tomorrow')}
      </DropdownMenuItem>
    </div>
  );
}
```

---

## Files to Modify

### Translation Files
| File | Changes |
|------|---------|
| `src/i18n/de.json` | +50 new keys under `createSelection.*` and `calendar.*` |
| `src/i18n/en.json` | +50 new keys (English equivalents) |

### Component Files
| File | Key Changes |
|------|-------------|
| `src/components/CreateSelectionDialog.tsx` | All dialog text (~6 strings) |
| `src/components/calendar/EnhancedCalendarPopup.tsx` | All popup text + toasts (~25 strings) |
| `src/components/calendar/CalendarFilters.tsx` | Filter labels (~5 strings) |
| `src/components/calendar/AutopilotCalendarSuggestions.tsx` | All UI text (~10 strings) |

---

## Acceptance Criteria

- [ ] "Create New" dialog shows "Neu erstellen" in German
- [ ] Event/MeetUp descriptions display in German
- [ ] Smart Calendar popup header shows German text
- [ ] Tab labels show "Heute", "Woche", "Monat" in German
- [ ] Filter badges show German labels (Persönlich, Arbeit, etc.)
- [ ] Autopilot Suggestions section fully translated
- [ ] All toast messages display in German when German is selected
- [ ] Empty states ("Nothing scheduled", etc.) display in German
- [ ] Sync status shows German text
- [ ] All components continue to show English when English is selected

---

## Technical Notes

- The `EnhancedCalendarPopup` component has many toast calls that need localization
- Default autopilot suggestion text is hardcoded in state initialization and needs translation
- Calendar filter labels are currently in a static `FILTER_CONFIG` array - will need to make dynamic with `translate()`
- Toast messages should use the `translate()` function directly in the toast call
