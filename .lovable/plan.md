

# Unified Capture Card — Implementation Plan

## Parity Checklist

Every behavior from both source components mapped and verified:

| # | Feature | VoiceDiaryRecorder | FeedbackRecorder | UnifiedCaptureCard |
|---|---------|-------------------|-----------------|-------------------|
| 1 | ClientSTT init with language from localStorage/context | Yes | Yes | Shared |
| 2 | Android: continuous=false, restart delay 750ms | Yes | Yes | Shared |
| 3 | Desktop: continuous=true, restart delay 350ms | Yes | Yes | Shared |
| 4 | isRecordingRef to prevent stale closures | Yes | Yes | Shared |
| 5 | mergeFinalTranscript with overlap detection | Yes | Yes | Shared (extract to util) |
| 6 | Duplicate final transcript suppression (1500ms) | Yes | Yes | Shared |
| 7 | Recoverable error handling (no-speech/aborted/audio-capture) | Yes | Yes | Shared |
| 8 | onEnd auto-restart loop | Yes | Yes | Shared |
| 9 | Language re-assertion before restart | Yes | Yes | Shared |
| 10 | Recording duration timer | Yes | Yes | Shared |
| 11 | Interim text display | Yes | Yes | Shared |
| 12 | Textarea editable when not recording | Yes | Yes | Shared |
| 13 | Waveform visualization during recording | Yes | Yes | Shared |
| 14 | "Recording Started" toast | Yes | No | Health mode only |
| 15 | "Recording Stopped" toast | Yes | No | Health mode only |
| 16 | Save to diary_entries with user_id, text, duration, source | Yes | N/A | Health mode |
| 17 | Query invalidation (diary-entries) | Yes | N/A | Health mode |
| 18 | onRecordingChange callback | Yes | N/A | Preserved as prop |
| 19 | onSaveComplete callback | Yes | N/A | Preserved as prop |
| 20 | Report type toggle (bug_report/ux_improvement) | N/A | Yes | Bug mode |
| 21 | Severity select (low/medium/high/critical) | N/A | Yes | Bug mode |
| 22 | Affected screen select (SCREEN_OPTIONS) | N/A | Yes | Bug mode |
| 23 | File attachment (image picker, previews, removal) | N/A | Yes | Bug mode |
| 24 | Upload to feedback-attachments bucket + signed URLs | N/A | Yes | Bug mode |
| 25 | POST to gateway /voice-feedback/submit | N/A | Yes | Bug mode |
| 26 | Inline confirmation state (green checkmark) | N/A | Yes | Bug mode |
| 27 | "Send Another Report" reset | N/A | Yes | Bug mode |
| 28 | onSubmitted callback | N/A | Yes | Preserved as prop |
| 29 | Form reset after submit | N/A | Yes | Bug mode |

**Phase 2 items** (explicitly deferred, not dropped):
- Merge text/camera/photo add flows into the unified card (currently remain as separate inline cards below)
- Health mode tag/category selectors (not in current VoiceDiaryRecorder — future enhancement)

## UX Refinements per User Request

1. **No dominant floating plus button** — secondary actions (text/camera/photo for health, screenshot attach for bugs) sit in a compact icon row below the mic area
2. **Bug/UX switch inside card** — report type toggle lives inside the unified card, above severity/screen fields
3. **Progressive disclosure** — initial state shows only the hero mic + mode tabs; transcript area + contextual fields appear only after recording starts or text exists
4. **Unified card height** — `min-h-[340px]` for both modes

## File Changes

### 1. New: `src/utils/sttHelpers.ts`
Extract shared helpers used by both recorders (and now the unified card):
- `normalizeWords()`
- `mergeFinalTranscript()`
- `formatDuration()`

Small file (~50 lines). Avoids duplication.

### 2. New: `src/components/capture/UnifiedCaptureCard.tsx`

Props:
```ts
interface UnifiedCaptureCardProps {
  mode: 'health' | 'bug_report' | 'ux_improvement';
  onModeChange?: (mode: 'bug_report' | 'ux_improvement') => void; // bug sub-mode
  onRecordingChange?: (isRecording: boolean) => void;
  onSaveComplete?: () => void;   // health
  onSubmitted?: () => void;      // bugs
}
```

Layout (progressive disclosure):

```text
┌──────────────────────────────────┐
│                                  │
│         🎤  (h-20 w-20)         │  ← always visible hero mic
│      "Tap to start recording"   │
│                                  │
│   [waveform — only if recording] │
│                                  │
│  ┌─ transcript area ──────────┐  │  ← appears after recording
│  │  editable textarea         │  │     starts or text exists
│  └────────────────────────────┘  │
│                                  │
│  ── action row (compact) ──────  │  ← small icon buttons
│  Health: [📝] [📷] [🖼]         │     no dominant FAB
│  Bugs:   [📎 attach]            │
│                                  │
│  ── contextual fields ─────────  │  ← progressive: only with
│  Health: (phase 2 tags)          │     transcript present
│  Bugs: [Bug|UX] toggle          │
│         severity + screen        │
│                                  │
│  [Save Entry] or [Send Report]   │  ← only when transcript &
│                                  │     not recording
└──────────────────────────────────┘
```

Internal state mirrors both source components. All STT logic (items 1-12 from checklist) is implemented once. Mode-specific save/submit logic (items 16-29) branches on `mode` prop.

Confirmation state for bugs renders inline (same green checkmark UI).

### 3. Modify: `src/pages/MobileDailyDiary.tsx`

- Replace `VoiceDiaryRecorder` + its wrapping Card with `<UnifiedCaptureCard mode="health" />`
- Replace `FeedbackRecorder` + its wrapping Card with `<UnifiedCaptureCard mode={bugSubMode} onModeChange={setBugSubMode} />`
- Add `bugSubMode` state: `useState<'bug_report' | 'ux_improvement'>('bug_report')`
- Remove the floating `Popover` plus button from the health card
- Keep the inline `activePlusOption` cards (text/camera/photo) below the unified card — **phase 2** to merge these
- Keep `DiaryEntryList` and `FeedbackReportList` below unchanged
- Remove imports of `VoiceDiaryRecorder` and `FeedbackRecorder` from this page

### 4. No changes to existing components

`VoiceDiaryRecorder` and `FeedbackRecorder` remain untouched — still used by `HealthTrackerMasterActionPopup` and potentially other surfaces.

## Summary

3 files created, 1 file modified. All 29 checklist items preserved. Phase 2 items explicitly marked.

