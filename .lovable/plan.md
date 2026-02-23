

## Fix Mixed German/English in Calendar Modal

Two issues cause English text to appear in the German calendar view:

### Issue 1: Date formatting ignores locale
Three `format()` calls in `MobileCalendarModal.tsx` and one in `EnhancedCalendarPopup.tsx` use `format(date, 'EEEE, MMM d')` without passing the German `date-fns` locale, so day and month names always render in English (e.g., "Sunday, Feb 22" instead of "Sonntag, 22. Feb").

Similarly, `EventDetailsPanel.tsx` has `format(date, 'EEEE, MMMM d, yyyy')` without locale.

### Issue 2: "Agenda" tab label should be "Tag"
The German translation for `calendar.agenda` is currently `"Agenda"`, but the user expects `"Tag"` (Day) in German.

### Changes

**1. `src/i18n/de.json`**
- Change `calendar.agenda` from `"Agenda"` to `"Tag"`

**2. `src/components/calendar/MobileCalendarModal.tsx`**
- Import `de` locale from `date-fns/locale/de`
- Import `isGerman` from `useTranslation`
- Update all three `format()` calls (lines 273, 404, and any others) to pass `{ locale: isGerman ? deLocale : undefined }`

**3. `src/components/calendar/EnhancedCalendarPopup.tsx`**
- Same locale fix for the `format()` call on line 702

**4. `src/components/calendar/EventDetailsPanel.tsx`**
- Same locale fix for the `format()` call on line 115

### Result
- "Sunday, Feb 22" becomes "Sonntag, 22. Feb" in German
- "Agenda" tab becomes "Tag" in German
- "Monat" tab stays as-is (already correct)

