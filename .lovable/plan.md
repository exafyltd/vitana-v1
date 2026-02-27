

## Restructure Daily Diary: Two-Category Layout

Replace the three pill tabs (Voice, Photo, Text) with two top-level horizontal segment tabs: **Health Diary** and **Bug Reports**.

### Health Diary Tab
- **Prominent microphone button** centered (the existing `VoiceDiaryRecorder` mic UI).
- **"+" button** next to or near the mic that opens a bottom sheet/popover with options: Text entry, Camera capture, Photo upload.
- When "+" option is selected, the corresponding input UI (TextDiaryEditor or PhotoDiaryUploader) appears inline or in a sheet.
- Below the input area: `DiaryEntryList` showing all diary entries (voice + photo + text combined, not filtered by type).

### Bug Reports Tab
- Shows `FeedbackRecorder` directly (no collapsible wrapper).
- Below it: `FeedbackReportList`.
- Uses the existing red/destructive visual distinction.

### Changes

**1. `src/pages/MobileDailyDiary.tsx`** - Full rewrite of the tab structure:
- Replace `EntryMode` type with `CategoryTab = "health" | "bugs"`.
- Two segment-style tabs at top: "🩺 Health Diary" and "🐛 Bug Reports".
- Health tab: render VoiceDiaryRecorder prominently + a floating/inline "+" button that toggles a small action menu (Text, Camera, Photo) using a Popover or simple expandable row.
- When a "+" option is picked, show the relevant component (TextDiaryEditor or PhotoDiaryUploader) in a card below the mic.
- DiaryEntryList without entryType filter (show all sources).
- Bug tab: render FeedbackRecorder + FeedbackReportList directly, no collapsible.
- Remove the old feedbackOpen state and collapsible section.

**2. `src/components/diary/DiaryEntryList.tsx`** - Make `entryType` prop optional:
- When `entryType` is undefined/not provided, don't apply the `.eq('source', entryType)` filter — fetch all diary entries.
- Adjust icon/badge display to be dynamic per-entry based on `entry.source` rather than the prop.

