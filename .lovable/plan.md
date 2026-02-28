

## Fix: Duplicate transcription on mobile

### Root cause
The `onEnd` callback in `VoiceDiaryRecorder.tsx` (line 72-76) restarts `SpeechRecognition` every time it fires. On mobile browsers, `onend` fires after every phrase/pause, and restarting causes the same audio to be re-processed, producing duplicate words.

Additionally, the `isRecording` check uses a stale closure (always `false`), so the guard doesn't work as intended.

### Fix in `src/components/memory/VoiceDiaryRecorder.tsx`

1. **Use a ref for `isRecording`** to avoid stale closure in the `onEnd` callback
2. **Add a debounce/guard** to prevent rapid restarts — use a small `setTimeout` (300ms) before restarting, and track the last `resultIndex` to detect if new results came in
3. **Clear interim text on restart** to prevent stale interim from duplicating into final text

Concrete changes:

- Add `isRecordingRef = useRef(false)` and keep it synced with `isRecording` state
- In `onEnd`, use `isRecordingRef.current` instead of `isRecording`
- Add a 300ms delay before restarting to let the browser settle, preventing overlapping sessions
- Track processed result indices to skip already-seen finals

### File: `src/components/memory/VoiceDiaryRecorder.tsx`

**Add ref** (after line 22):
```typescript
const isRecordingRef = useRef(false);
```

**Sync ref** in `startRecording` and `stopRecording`:
```typescript
// in startRecording, after setIsRecording(true):
isRecordingRef.current = true;

// in stopRecording, after setIsRecording(false):
isRecordingRef.current = false;
```

**Replace `onEnd` callback** (lines 72-77):
```typescript
onEnd: () => {
  if (isRecordingRef.current) {
    // Delay restart to prevent duplicate processing on mobile
    setTimeout(() => {
      if (isRecordingRef.current && sttRef.current) {
        try {
          sttRef.current.start();
        } catch (e) {
          console.warn('[Voice Diary] Failed to restart STT:', e);
        }
      }
    }, 300);
  }
}
```

This 300ms gap lets the browser fully tear down the previous session before starting a new one, preventing the overlap that causes duplicate transcriptions on mobile.

