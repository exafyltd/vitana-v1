

## Plan: Align Bug Reports with Health Diary — Full Parity

### Problem
The FeedbackRecorder has none of the STT fixes applied to VoiceDiaryRecorder (overlap merging, duplicate detection, auto-restart, Android continuous-mode workaround, isRecordingRef). The UI also looks completely different from the Health Diary tab. The history list (FeedbackReportList) lacks delete functionality and visual consistency.

### Changes Overview

#### 1. FeedbackRecorder.tsx — Port all STT fixes
- Add `isRecordingRef` to prevent stale closure issues
- Add `restartTimeoutRef`, `lastFinalTranscriptRef`, `lastFinalAtRef` for duplicate detection
- Port `normalizeWords()` and `mergeFinalTranscript()` helper functions
- Disable `continuous` mode on Android (`!isAndroid`)
- Use `getLocalStorageItem` for language, defaulting to `de-DE`
- Re-assert language via `sttRef.current.setLanguage()` before start
- Treat `no-speech`, `aborted`, `audio-capture` as recoverable errors (don't stop recording)
- Add `onEnd` auto-restart logic with debounced timeout (750ms Android, 350ms otherwise)
- Clear interim text before restart
- In `stopRecording`: set `isRecordingRef = false` first, clear restart timeout

#### 2. FeedbackRecorder.tsx — UI redesign to match Health Diary
- Replace the current flat layout with a centered mic card matching VoiceDiaryRecorder style:
  - Large round mic button (h-16 w-16) centered, using red/orange tones instead of purple
  - A `+` button (absolute right) that opens file input for screenshot attachments (replaces the "Attach Screenshots" button)
  - Same audio visualization bars style
  - Report type toggle (Bug/UX) and severity/screen selectors shown below mic card
  - Transcript area in a Card component matching VoiceDiaryRecorder layout
- Remove the standalone "Attach Screenshots" button entirely

#### 3. FeedbackReportList.tsx — Match DiaryEntryList patterns
- Add pagination: show last 5 entries, "Load more" button (+10)
- Add trash icon (Trash2) on each report card with confirmation dialog (same as DiaryEntryList)
- Use `useQueryClient` to invalidate after delete
- Visual card styling consistent with DiaryEntryList cards

#### 4. MobileDailyDiary.tsx — Bug tab layout
- Wrap FeedbackRecorder in same card style as VoiceDiaryRecorder (neutral border, not destructive)
- Pass `onSubmitted` that also invalidates feedback query cache

### Files to Edit
1. `src/components/feedback/FeedbackRecorder.tsx` — STT fixes + UI overhaul
2. `src/components/feedback/FeedbackReportList.tsx` — Pagination + delete + visual consistency
3. `src/pages/MobileDailyDiary.tsx` — Bug tab card wrapper styling

