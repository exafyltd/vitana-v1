

# Fix: Translate Daily Diary & UnifiedCaptureCard

## Problem

The Daily Diary page and its UnifiedCaptureCard have ~40 hardcoded English strings. Only the utility action bar uses `translate()`. Everything else — page title, description, tab labels, mic prompts, toast messages, form labels, buttons, confirmation text — stays English regardless of language setting.

## Scope

Two files need i18n, plus translation keys added to both JSON files:

### 1. `src/pages/MobileDailyDiary.tsx` — Hardcoded strings

| String | Translation key |
|--------|----------------|
| `"📔 Daily Diary"` | `diary.title` |
| `"Track your wellness journey..."` | `diary.description` |
| `"Health Diary"` (tab) | `diary.healthTab` |
| `"Bug Reports"` (tab) | `diary.bugTab` |
| `"Text"` (plus option) | `diary.text` |
| `"Photo"` (plus option) | `diary.photo` |
| `"✍️ Text Entry"` | `diary.textEntry` |
| `"📸 Photo Entry"` | `diary.photoEntry` |

### 2. `src/components/capture/UnifiedCaptureCard.tsx` — Hardcoded strings

| String | Translation key |
|--------|----------------|
| `"Not Supported"` | `capture.notSupported` |
| `"Speech recognition is not supported..."` | `capture.notSupportedDesc` |
| `"Recording"` badge | `capture.recording` |
| `"Tap to start recording"` | `capture.tapToRecord` |
| `"Tap the mic to describe the issue"` | `capture.tapToDescribe` |
| `"Live Transcription"` | `capture.liveTranscription` |
| `"Your Voice Entry"` | `capture.yourVoiceEntry` |
| `"Your Feedback"` | `capture.yourFeedback` |
| `"Start speaking..."` | `capture.startSpeaking` |
| `"Edit or type directly..."` | `capture.editOrType` |
| `"Interim text appears..."` | `capture.interimHint` |
| `"Attach"` | `capture.attach` |
| `"Bug Report"` | `capture.bugReport` |
| `"UX Improvement"` | `capture.uxImprovement` |
| `"Severity"` | `capture.severity` |
| `"Affected Screen"` | `capture.affectedScreen` |
| `"Select..."` | `capture.select` |
| Low/Medium/High/Critical | `capture.low` / `capture.medium` / `capture.high` / `capture.critical` |
| `"Save Entry"` | `capture.saveEntry` |
| `"Sending..."` / `"Send to Exafy Team"` | `capture.sending` / `capture.sendToTeam` |
| `"Report Sent!"` | `capture.reportSent` |
| `"The Exafy team appreciates..."` | `capture.reportSentDesc` |
| `"Send Another Report"` | `capture.sendAnother` |
| `"Recording Started"` toast | `capture.recordingStarted` / `capture.recordingStartedDesc` |
| `"Recording Stopped"` toast | `capture.recordingStopped` / `capture.recordingStoppedDesc` |
| `"No Content"` / description | `capture.noContent` / `capture.noContentDesc` |
| `"Entry Saved"` / description | `capture.entrySaved` / `capture.entrySavedDesc` |
| `"Save Failed"` / description | `capture.saveFailed` / `capture.saveFailedDesc` |
| `"Send Failed"` / description | `capture.sendFailed` / `capture.sendFailedDesc` |
| `"Recognition Error"` | `capture.recognitionError` / `capture.recognitionErrorDesc` |

### 3. `src/i18n/de.json` & `src/i18n/en.json`

Add a `diary` block and a `capture` block with all keys above. German translations use formal style consistent with the app.

### Changes

| File | Action |
|------|--------|
| `src/i18n/en.json` | Add `diary.*` and `capture.*` keys |
| `src/i18n/de.json` | Add `diary.*` and `capture.*` keys (German) |
| `src/pages/MobileDailyDiary.tsx` | Replace all hardcoded strings with `translate()` calls |
| `src/components/capture/UnifiedCaptureCard.tsx` | Add `useTranslation`, replace all hardcoded strings with `translate()` |

No functional changes — pure i18n pass.

