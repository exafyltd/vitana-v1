

## Internationalize MeetupDetailsDrawer -- Full German Translation

The event detail drawer currently has ~35 hardcoded English strings that remain untranslated when German is selected. These need to be wrapped with `translate()` calls and corresponding keys added to both `de.json` and `en.json`.

### Hardcoded Strings to Translate

**Host Bar area (lines 839-887)**
- `"Host"` (badge label) -> `eventDrawer.host`
- `"Follow"` / `"Following"` / `"Following..."` -> `eventDrawer.follow` / `.following` / `.followingLoading`
- `"Unfollowed"` / `"Following!"` toast titles -> `eventDrawer.unfollowed` / `.followingToast`
- `"Community Host"` fallback -> `eventDrawer.communityHost`

**Social Proof (lines 911-946)**
- `"People you follow are going"` -> `eventDrawer.followersGoing`
- `"Follow back"` tooltip -> `eventDrawer.followBack`

**Badges (lines 894-908)**
- `"Community"` fallback -> `eventDrawer.community`
- `"Meetup"` fallback -> `eventDrawer.meetup`
- `"Accessible"` -> `eventDrawer.accessible`

**When and Where section (lines 949-1046)**
- `"When & Where"` heading -> `eventDrawer.whenWhere`
- `"Local"` / `"UTC"` toggle labels -> `eventDrawer.local` / `.utc`
- `"Starts {time}"` countdown -> `eventDrawer.startsIn`
- `"{duration} minutes"` -> `eventDrawer.durationMinutes`
- `"Virtual Event"` -> `eventDrawer.virtualEvent`
- `"Join link · Opens 5 min before"` -> `eventDrawer.joinLinkOpens`
- `"Get directions"` -> `eventDrawer.getDirections`

**Capacity (lines 1050-1066)**
- `"{current} / {capacity} attending"` -> `eventDrawer.attending`
- `"Only {count} left!"` -> `eventDrawer.spotsLeft`

**Autopilot (lines 1068-1090)**
- `"Autopilot Suggestions"` -> `eventDrawer.autopilotSuggestions`
- `"Fit into my week"` -> `eventDrawer.fitIntoWeek`
- `"Resolve schedule conflict"` -> `eventDrawer.resolveConflict`
- `"Plan commute"` -> `eventDrawer.planCommute`

**Section headings (lines 1092-1255)**
- `"About"` -> `eventDrawer.about`
- `"No description provided."` -> `eventDrawer.noDescription`
- `"Agenda"` -> `eventDrawer.agenda`
- `"Host"` (section heading) -> reuse `eventDrawer.host`
- `"Organizer"` -> `eventDrawer.organizer`
- `"Message"` / `"Sending..."` -> `eventDrawer.message` / `.sending`
- `"Attendees ({count})"` -> `eventDrawer.attendees`
- `"Tickets"` -> `eventDrawer.tickets`
- `"Sold Out"` badge -> reuse `eventCta.soldOut`
- `"View Sales"` / `"Hide Sales"` -> `eventDrawer.viewSales` / `.hideSales`
- `"Free tickets available"` -> `eventDrawer.freeTickets`
- `"From {price}"` -> `eventDrawer.fromPrice`
- `"Policies"` / `"Requirements"` / `"Cancellation"` -> `eventDrawer.policies` / `.requirements` / `.cancellation`

**Toast messages (lines 600-660, 1401-1411)**
- `"Authentication required"` / `"Please sign in to message the host"` -> reuse auth keys
- `"Cannot message host"` / `"Cannot message yourself"` toasts -> `eventDrawer.cannotMessageHost` etc.
- `"Message sent!"` -> `eventDrawer.messageSent`
- `"Left MeetUp"` / `"Reservation Cancelled"` -> `eventDrawer.leftMeetup` / `.reservationCancelled`

**Calendar dropdown (lines 1516-1548)**
- `"Add to calendar"` aria-label -> `eventDrawer.addToCalendar`
- `"Google Calendar"` / `"Outlook"` / `"Apple Calendar"` / `"Download ICS"` -> `eventDrawer.googleCal` etc.

**Date formatting (line 984)**
- `format(startDate, 'EEEE, MMMM d, yyyy')` needs `date-fns/locale/de` when German is selected

### Files Changed

**1. `src/i18n/de.json`** -- Add `eventDrawer` namespace with all German translations

**2. `src/i18n/en.json`** -- Add matching `eventDrawer` namespace with English values

**3. `src/components/meetups/MeetupDetailsDrawer.tsx`** -- Replace all hardcoded strings with `translate('eventDrawer.key', 'English fallback')` calls. Import `de` locale from `date-fns` and use it conditionally for date formatting.

**4. `src/lib/eventsCtaUtils.ts`** -- No changes needed (already localized via `getLocalizedEventCta`)

### German Translations (key samples)

| Key | German |
|-----|--------|
| `eventDrawer.host` | Gastgeber |
| `eventDrawer.follow` | Folgen |
| `eventDrawer.following` | Folge ich |
| `eventDrawer.followersGoing` | Personen, denen Sie folgen, nehmen teil |
| `eventDrawer.whenWhere` | Wann & Wo |
| `eventDrawer.local` | Lokal |
| `eventDrawer.virtualEvent` | Virtuelles Event |
| `eventDrawer.getDirections` | Route planen |
| `eventDrawer.attending` | {current} / {capacity} Teilnehmer |
| `eventDrawer.spotsLeft` | Nur noch {count} Plätze! |
| `eventDrawer.autopilotSuggestions` | Autopilot-Vorschläge |
| `eventDrawer.fitIntoWeek` | In meine Woche einpassen |
| `eventDrawer.resolveConflict` | Terminkonflikt lösen |
| `eventDrawer.planCommute` | Anfahrt planen |
| `eventDrawer.about` | Über |
| `eventDrawer.agenda` | Agenda |
| `eventDrawer.organizer` | Veranstalter |
| `eventDrawer.message` | Nachricht |
| `eventDrawer.attendees` | Teilnehmer ({count}) |
| `eventDrawer.policies` | Richtlinien |
| `eventDrawer.requirements` | Voraussetzungen |
| `eventDrawer.cancellation` | Stornierung |
| `eventDrawer.accessible` | Barrierefrei |
| `eventDrawer.durationMinutes` | {duration} Minuten |
| `eventDrawer.addToCalendar` | Zum Kalender hinzufügen |
| `eventDrawer.downloadIcs` | ICS herunterladen |

