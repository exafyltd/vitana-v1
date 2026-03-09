

# Localize the Create New Event Popup

## Problem
The `CreateEventPopup.tsx` component has ~60+ hardcoded English strings — every label, placeholder, toast message, category name, button, and helper text. No `useTranslation` hook is used.

## Solution
1. Add a `createEventPopup` namespace to both `en.json` and `de.json` with all strings
2. Import `useTranslation` in `CreateEventPopup.tsx` and replace every hardcoded string with `translate()` calls

## Translation keys needed (~60 strings)

Covering: title, section headers (Event Details, Schedule & Location, Ticket Sales, Reseller Options), all labels, all placeholders, all toast messages, category names, duration options, button text, helper text.

## Files to change

### 1. `src/i18n/en.json` — add `createEventPopup` namespace
All current English strings organized by section.

### 2. `src/i18n/de.json` — add `createEventPopup` namespace with German translations
Examples:
- "Create New Event" → "Neues Event erstellen"
- "Event Title *" → "Eventtitel *"
- "Description" → "Beschreibung"
- "Schedule & Location" → "Zeitplan & Ort"
- "Date *" → "Datum *"
- "Time *" → "Uhrzeit *"
- "Location" → "Standort"
- "Max Attendees" → "Max. Teilnehmer"
- "Ticket Sales" → "Ticketverkauf"
- "Enable Ticket Sales" → "Ticketverkauf aktivieren"
- "Cancel" → "Abbrechen"
- "Create Event" → "Event erstellen"
- "Creating..." → "Wird erstellt..."
- "Virtual Event" → "Virtuelles Event"
- "Reseller Options" → "Reseller-Optionen"
- Category names translated (e.g., "Fitness & Exercise" → "Fitness & Training")
- Duration options (e.g., "30 minutes" → "30 Minuten", "Half day" → "Halber Tag")
- All toast messages translated
- All placeholders translated

### 3. `src/components/CreateEventPopup.tsx`
- Import `useTranslation` hook
- Call `const { translate } = useTranslation();` at component top
- Replace all ~60 hardcoded strings with `translate('createEventPopup.xxx')` calls
- Toast messages use translated strings

