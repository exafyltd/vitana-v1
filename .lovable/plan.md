
Goal
- Ensure the “Go Live / Live gehen” popup (GoLivePopup) fully respects the selected language (German) and contains zero hardcoded English UI strings.

What I found (root cause)
- The popup UI is rendered by `src/components/GoLivePopup.tsx`.
- That component currently contains many hardcoded English strings for:
  - Dialog title (“Go Live”, “Edit Live Stream”)
  - Field labels (“Stream Title”, “Description / Bio (Optional)”, etc.)
  - Placeholders (“Tell your audience…”, “Live with [Name]”, etc.)
  - Buttons (“Cancel”, “Go Live Now”, “Schedule Live Session”, “Update Stream”, …)
  - Validation/toast text (“Select Stream Type”, “You must be logged in…”, …)
  - Upload area (“Click to upload custom image”, “PNG, JPG up to 2MB”, …)
  - Advanced section (“Advanced Options”, “Access Level”, “Enable Chat”, …)
- Even though the Live Rooms utility bar button label is already translated (`translate('liveRooms.goLive', ...)`), opening the popup shows English because the popup itself does not use `useTranslation()` and uses English strings directly.

Important implementation detail (to avoid future bugs)
- `GoLivePopup.tsx` currently stores UI labels like `"Audio"` / `"Video"` in component state, and uses them for logic comparisons.
- If we translate those strings, state comparisons can break.
- Fix: store stable internal values (`'audio' | 'video'`) and only translate the displayed label.

Files involved
- `src/components/GoLivePopup.tsx` (main fix)
- `src/i18n/de.json` and `src/i18n/en.json` (add translation keys)

Implementation plan

1) Add translation keys for the popup (DE + EN)
Add a new nested namespace under existing `liveRooms` (keeps things discoverable and avoids duplicate top-level keys):
- `liveRooms.goLivePopup.*`

Suggested key set (minimal but complete for current UI):

A. Titles
- `liveRooms.goLivePopup.titleCreate` (EN: “Go Live”, DE: “Live gehen”)
- `liveRooms.goLivePopup.titleEdit` (EN: “Edit Live Stream”, DE: “Live-Stream bearbeiten”)

B. Form fields
- `liveRooms.goLivePopup.streamTitleLabel` (EN: “Stream Title”, DE: “Stream-Titel”)
- `liveRooms.goLivePopup.streamTitlePlaceholder` (EN: “Live with {name}”, DE: “Live mit {name}”)
- `liveRooms.goLivePopup.descriptionLabel` (EN: “Description / Bio (Optional)”, DE: “Beschreibung / Bio (optional)”)
- `liveRooms.goLivePopup.descriptionPlaceholder` (EN: “Tell your audience what this stream is about…”, DE: “Beschreiben Sie kurz, worum es in diesem Stream geht…”)
- `liveRooms.goLivePopup.charactersCount` (EN: “{count}/500 characters”, DE: “{count}/500 Zeichen”)

C. Stream type
- `liveRooms.goLivePopup.streamTypeLabel` (EN: “Stream Type”, DE: “Stream-Typ”)
- `liveRooms.goLivePopup.streamTypeAudio` (EN: “Audio”, DE: “Audio”)
- `liveRooms.goLivePopup.streamTypeVideo` (EN: “Video”, DE: “Video”)

D. Cover image
- `liveRooms.goLivePopup.coverLabel` (EN: “Cover Image / Thumbnail”, DE: “Titelbild / Thumbnail”)
- `liveRooms.goLivePopup.coverAlt` (EN: “Stream cover”, DE: “Stream-Titelbild”)
- `liveRooms.goLivePopup.coverUploadCta` (EN: “Click to upload custom image”, DE: “Tippen, um ein eigenes Bild hochzuladen”)
- `liveRooms.goLivePopup.coverUploadHint` (EN: “PNG, JPG up to 2MB”, DE: “PNG, JPG bis 2 MB”)
- `liveRooms.goLivePopup.aiAutoGenerateLabel` (EN: “Auto-generate with AI”, DE: “Mit KI automatisch erstellen”)
- `liveRooms.goLivePopup.aiAutoGenerateHint` (EN: “Generate image if none uploaded”, DE: “Bild erstellen, wenn kein Upload erfolgt”)
- `liveRooms.goLivePopup.generatingAiImage` (EN: “Generating AI image…”, DE: “KI-Bild wird erstellt…”)

E. Tags
- `liveRooms.goLivePopup.tagsLabel` (EN: “Tags / Category (Select 1-3)”, DE: “Tags / Kategorie (1–3 auswählen)”)
- `liveRooms.goLivePopup.tagsSelected` (EN: “{count}/3 selected”, DE: “{count}/3 ausgewählt”)
- Tag labels should be translatable while keeping stored tag IDs stable (see step 3).
  - Example: `liveRooms.goLivePopup.tags.wellness`, `...nutrition`, etc.

F. Advanced
- `liveRooms.goLivePopup.advancedTitle` (EN: “Advanced Options”, DE: “Erweiterte Optionen”)
- `liveRooms.goLivePopup.cohostLabel` (EN: “Co-Host / Guest Invite”, DE: “Co-Host / Gast einladen”)
- `liveRooms.goLivePopup.cohostPlaceholder` (EN: “Search and add co-host”, DE: “Co-Host suchen und hinzufügen”)

Access Level options:
- `liveRooms.goLivePopup.accessLevelLabel` (EN: “Access Level”, DE: “Zugriff”)
- `liveRooms.goLivePopup.access.public.label` (EN: “Public”, DE: “Öffentlich”)
- `liveRooms.goLivePopup.access.public.desc` (EN: “Anyone can join”, DE: “Jeder kann beitreten”)
- `liveRooms.goLivePopup.access.followers.label` (EN: “Followers Only”, DE: “Nur Follower”)
- `liveRooms.goLivePopup.access.followers.desc` (EN: “Only your followers”, DE: “Nur Ihre Follower”)
- `liveRooms.goLivePopup.access.group.label` (EN: “Group/VIP”, DE: “Gruppe/VIP”)
- `liveRooms.goLivePopup.access.group.desc` (EN: “Invited members only”, DE: “Nur eingeladene Mitglieder”)

Schedule:
- `liveRooms.goLivePopup.scheduleLabel` (EN: “Schedule for Later”, DE: “Für später planen”)
- `liveRooms.goLivePopup.goLiveNow` (EN: “Go Live Now”, DE: “Jetzt live gehen”)
- `liveRooms.goLivePopup.selectTime` (EN: “Select time”, DE: “Uhrzeit wählen”)
- `liveRooms.goLivePopup.selectTimeShort` (EN: “Select time”, DE: “Uhrzeit wählen”) (for button label)
- `liveRooms.goLivePopup.clearSchedule` (EN: “Clear schedule (go live now)”, DE: “Planung löschen (jetzt live gehen)”)
- `liveRooms.goLivePopup.scheduledAt` (EN: “{date} at {time}”, DE: “{date} um {time}”)
- `liveRooms.goLivePopup.dateNeedsTime` (EN: “{date} – select time”, DE: “{date} – Uhrzeit wählen”)

Engagement:
- `liveRooms.goLivePopup.engagementLabel` (EN: “Chat & Engagement”, DE: “Chat & Interaktion”)
- `liveRooms.goLivePopup.enableChatTitle` (EN: “Enable Chat”, DE: “Chat aktivieren”)
- `liveRooms.goLivePopup.enableChatDesc` (EN: “Allow viewers to chat”, DE: “Zuschauern erlauben zu chatten”)
- `liveRooms.goLivePopup.enablePollsTitle` (EN: “Enable Polls”, DE: “Umfragen aktivieren”)
- `liveRooms.goLivePopup.enablePollsDesc` (EN: “Create live polls during stream”, DE: “Live-Umfragen während des Streams”)
- `liveRooms.goLivePopup.recordReplayTitle` (EN: “Record for Replay”, DE: “Für Replay aufzeichnen”)
- `liveRooms.goLivePopup.recordReplayDesc` (EN: “Save stream for later viewing”, DE: “Stream zur späteren Wiedergabe speichern”)

G. Actions
- `liveRooms.goLivePopup.cancel` (EN: “Cancel”, DE: “Abbrechen”)
- `liveRooms.goLivePopup.starting` (EN: “Starting…”, DE: “Startet…”)
- `liveRooms.goLivePopup.updating` (EN: “Updating…”, DE: “Wird aktualisiert…”)
- `liveRooms.goLivePopup.updateStream` (EN: “Update Stream”, DE: “Stream aktualisieren”)
- `liveRooms.goLivePopup.scheduleSession` (EN: “Schedule Live Session”, DE: “Live-Session planen”)
- `liveRooms.goLivePopup.goLiveNowAction` (EN: “Go Live Now”, DE: “Jetzt live gehen”)

H. Toasts / validation
(Prefer using the existing i18n toast wrapper, see step 4)
- `liveRooms.goLivePopup.errors.selectStreamTypeTitle`
- `liveRooms.goLivePopup.errors.selectStreamTypeDesc`
- `liveRooms.goLivePopup.errors.notLoggedInTitle`
- `liveRooms.goLivePopup.errors.notLoggedInDesc`
- `liveRooms.goLivePopup.errors.invalidFileTypeTitle`
- `liveRooms.goLivePopup.errors.invalidFileTypeDesc`
- `liveRooms.goLivePopup.errors.fileTooLargeTitle`
- `liveRooms.goLivePopup.errors.fileTooLargeDesc`
- `liveRooms.goLivePopup.errors.imageUploadFailedTitle`
- `liveRooms.goLivePopup.errors.imageUploadFailedDesc`
- `liveRooms.goLivePopup.success.streamUpdatedTitle`
- `liveRooms.goLivePopup.success.streamUpdatedDesc`
- `liveRooms.goLivePopup.success.streamScheduledTitle`
- `liveRooms.goLivePopup.success.streamScheduledDesc` (use placeholders for date/time)
- `liveRooms.goLivePopup.success.youAreLiveTitle`
- `liveRooms.goLivePopup.success.youAreLiveDesc`
- `liveRooms.goLivePopup.errors.genericTitle`
- `liveRooms.goLivePopup.errors.genericDesc` (use placeholder for action “create/update”)

2) Update `GoLivePopup.tsx` to use translations everywhere
- Import `useTranslation()` and use `translate(...)` for every visible label, placeholder, helper text, and alt text.
- Ensure German uses formal “Sie” (already reflected in the suggested DE copy, e.g. “Beschreiben Sie …”, “Nur Ihre Follower”).

3) Refactor internal state values to be language-safe
A. Stream type
- Change state from `"Audio" | "Video" | ""` to: `streamType: 'audio' | 'video' | ''`.
- Buttons will display translated labels but set stable values:
  - onClick: `setStreamType('audio')` / `setStreamType('video')`
  - Display text: `translate('liveRooms.goLivePopup.streamTypeAudio', 'Audio')`, etc.
- When persisting: `stream_type: streamType` directly (already lowercase).

B. Tags
- Keep stored tag identifiers stable (avoid breaking existing streams that already store English tags).
- Convert `streamTags` from array of strings to array of IDs, e.g.:
  - `['wellness','nutrition','fitness', ...]`
- Display label via translation keys:
  - `translate('liveRooms.goLivePopup.tags.wellness','Wellness')`
- Continue saving the stable IDs into `tags` so existing data remains compatible (no database migration).

C. Access options
- Keep existing `id` values stable (`public`, `followers`, `group`).
- Replace `label`/`description` with translated text via keys (rather than hardcoding in `accessOptions`).

4) Switch popup to translated toast helper (no raw strings)
- Replace `useToast()` usage (raw strings) with the existing `useI18nNotify()` hook:
  - `const { notify } = useI18nNotify();`
- Then use:
  - `notify.error('liveRooms.goLivePopup.errors.notLoggedInTitle', 'liveRooms.goLivePopup.errors.notLoggedInDesc')`
  - `notify.success(...)`
- For dynamic date/time descriptions, use the existing helper behavior (it supports replacements). We’ll pass `{ date: ..., time: ... }` replacements and ensure the translation strings include `{date}` / `{time}`.

5) Verification steps (what you should see)
- Set language to German.
- Go to Live Rooms → tap “+ Live gehen”.
- Popup should now render in German for:
  - Title (“Live gehen”)
  - Labels (“Stream-Titel”, “Beschreibung …”)
  - Upload box, AI toggle, advanced options, scheduling, engagement, buttons, toasts.
- Switch to English and confirm it flips back.

6) Optional follow-up (not required for your reported issue, but clearly present)
While investigating, I also saw hardcoded English strings in other Live Rooms / Profile areas (e.g., `ProfileLayout.tsx` mobile “About / No bio yet / Tap to edit”, and parts of `LiveRooms.tsx` empty/loading texts and search placeholder). If you want, we can do a separate i18n sweep for those next; I’ll keep this change focused on the Go Live popup first.

Risk/Edge cases
- Stream tag refactor must preserve existing stored values; using stable IDs mapped to translations avoids breaking current streams.
- Ensure no duplicate `liveRooms` keys are introduced in JSON (continue the “namespace integrity” rule you’re already enforcing).

Deliverables (exact files to change)
- `src/components/GoLivePopup.tsx`
- `src/i18n/de.json`
- `src/i18n/en.json`
