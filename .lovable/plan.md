

## Fix: Internationalize Empty States on Events "Today" and "Following" Tabs

### Problem
Three empty states in `src/pages/community/EventsAndMeetups.tsx` use hardcoded English strings instead of translation keys. The rest of the page (tabs, header, action bar) is properly translated, but the empty state content is not.

Affected strings:
- **Today tab (mobile)**: "No Events Today", "There are no events scheduled for today...", "Create Event", "View Upcoming Events"
- **Today tab (desktop)**: Same strings in the `renderEventGrid` call
- **Following tab**: "Posts from People You Follow", "Content from people and groups you follow will appear here", "Find People to Follow"

### Changes

**1. Add translation keys to `src/i18n/de.json`**

Add an `emptyStates` block under the `events` namespace:
```json
"emptyStates": {
  "noEventsToday": "Heute keine Events",
  "noEventsTodayDesc": "Heute sind keine Events geplant. Schauen Sie sich kommende Events an oder erstellen Sie Ihr eigenes!",
  "createEvent": "Event erstellen",
  "viewUpcoming": "Kommende Events ansehen",
  "followingTitle": "Beiträge von Personen, denen Sie folgen",
  "followingDesc": "Inhalte von Personen und Gruppen, denen Sie folgen, erscheinen hier",
  "findPeople": "Personen zum Folgen finden"
}
```

**2. Add matching keys to `src/i18n/en.json`**

```json
"emptyStates": {
  "noEventsToday": "No Events Today",
  "noEventsTodayDesc": "There are no events scheduled for today. Check upcoming events or create your own!",
  "createEvent": "Create Event",
  "viewUpcoming": "View Upcoming Events",
  "followingTitle": "Posts from People You Follow",
  "followingDesc": "Content from people and groups you follow will appear here",
  "findPeople": "Find People to Follow"
}
```

**3. Update `src/pages/community/EventsAndMeetups.tsx`**

Replace all six hardcoded strings in the three empty state locations (lines ~755-766, ~780-789, ~880-887) with `translate('events.emptyStates.xxx')` calls. The component already imports and uses `useTranslation` -- just wire the keys.

### What Stays the Same
- Empty state layout, icons, and button behavior
- All other translated content on the page
- Tab navigation, carousel, card rendering

