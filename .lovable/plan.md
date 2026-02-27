

## Enhance Daily Diary mobile header + mic prominence

### Changes to `src/pages/MobileDailyDiary.tsx`

**1. Replace inline header with StandardHeader**
- Import `StandardHeader` and use it with title "📔 Daily Diary" and description "Track your wellness journey and help us improve".
- This gives us the consistent title + subtitle pattern used by Events, Live Rooms, etc.

**2. Add UtilityActionButton bar below header**
- Import `UtilityActionButton` and render it between the header and the category tabs, matching the Events screen pattern.

**3. Enlarge the mic area in Health Diary tab**
- Replace the current compact Card wrapping VoiceDiaryRecorder + Plus button with a taller, centered layout:
  - Large centered mic button area (like the screenshot: big purple circle with mic icon, ~20h card with centered content)
  - The "+" button positioned to the right of the mic area
  - When no recording is active and no transcription exists, show placeholder text: "No voice entries yet" / "Start recording your wellness journey" below the mic icon
  - The VoiceDiaryRecorder component itself handles recording state — we keep using it but the card gets more vertical breathing room (py-8 instead of p-3)

### Files to edit
- `src/pages/MobileDailyDiary.tsx` — replace header, add utility bar, enlarge mic card

