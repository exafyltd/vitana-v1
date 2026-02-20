
## iOS Audio Routing Fix — Soft Mute Implementation

### Exact Changes (3 files, all surgical)

---

### File 1 — `src/lib/ios-audio-polyfill.ts`

Add `_muted` field, `mute()`, `unmute()`, and `isMuted` getter to `CrossPlatformAudioRecorder`.

The stream field in this class is `this.mediaStream` (line 22) — that's the correct name to use in `mute()`/`unmute()`. No rename needed.

**Add after line 28** (`private targetSampleRate: number;`):
```typescript
private _muted: boolean = false;
```

**Add after the existing `isRecording` getter (after line 45)**:
```typescript
get isMuted(): boolean {
  return this._muted;
}

mute(): void {
  if (this.mediaStream) {
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
  }
  this._muted = true;
  console.log('[AudioRecorder] Soft-muted (track.enabled = false)');
}

unmute(): void {
  if (this.mediaStream) {
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
  }
  this._muted = false;
  console.log('[AudioRecorder] Soft-unmuted (track.enabled = true)');
}
```

`stop()` is **not touched** — it remains the only place that calls `track.stop()` and destroys the `MediaStream`.

---

### File 2 — `src/lib/OrbVoiceClient.ts`

Three targeted edits:

**Edit A — `stopListening()` (lines 398–419): soft-mute instead of destroy**

Replace `this.recorder.stop(); this.recorder = null;` with `this.recorder.mute()`. Keep the recorder alive so iOS does not reset `AVAudioSession` routing.

```typescript
stopListening(): void {
  if (this.silenceTimer) {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }
  this.hasSpeechStarted = false;

  // Soft-mute: disable tracks but keep MediaStream alive
  // (prevents iOS from resetting AVAudioSession routing)
  if (this.recorder) {
    this.recorder.mute();
  }

  if (this.volumeAnimationFrame) {
    cancelAnimationFrame(this.volumeAnimationFrame);
    this.volumeAnimationFrame = null;
  }

  this.callbacks.onListeningChange?.(false);
  this.callbacks.onVolumeChange?.(0);
}
```

**Edit B — `startListening()` (lines 421–424): resume from mute without new getUserMedia**

- Guard: `this.recorder?.isRecording` → `this.recorder` (if a recorder exists at all and is muted, we just unmute it)
- Fast-path: `unmute()` + fire callback. No `startVolumeMonitoring()` call (the audio callback on the existing `ScriptProcessorNode`/`AudioWorklet` is still running and handles everything)

```typescript
async startListening(): Promise<void> {
  // If recorder exists and is soft-muted, just unmute (avoids new getUserMedia → iOS route switch)
  if (this.recorder && this.recorder.isMuted) {
    this.recorder.unmute();
    this.callbacks.onListeningChange?.(true);
    return;
  }
  if (this.recorder) return; // Already actively recording
  await this.startRecording();
}
```

**Edit C — `stop()` (lines 426–466): inline full recorder teardown**

`stop()` currently calls `this.stopListening()` (line 430) — after Edit A that would only mute, not destroy the stream. So `stop()` needs to do the full teardown directly instead:

```typescript
async stop(): Promise<void> {
  console.log('[OrbVoiceClient] Stopping...');

  // Clear silence detection
  if (this.silenceTimer) {
    clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }
  this.hasSpeechStarted = false;

  // Cancel volume monitoring
  if (this.volumeAnimationFrame) {
    cancelAnimationFrame(this.volumeAnimationFrame);
    this.volumeAnimationFrame = null;
  }

  // Full recorder teardown — only place where MediaStream is destroyed
  if (this.recorder) {
    this.recorder.stop();
    this.recorder = null;
  }

  // Stop session with auth
  if (this.sessionId) {
    try {
      await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/session/stop`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ session_id: this.sessionId })
      });
    } catch (e) {
      console.warn('[OrbVoiceClient] Error stopping session', e);
    }
  }

  // Close SSE
  if (this.eventSource) {
    this.eventSource.close();
    this.eventSource = null;
  }

  // Close audio output context
  if (this.audioContext) {
    this.audioContext.close().catch(() => {});
    this.audioContext = null;
  }

  // Reset audio state
  this.sessionId = null;
  this.nextStartTime = 0;

  this.callbacks.onConnectionStateChange?.('disconnected');
  this.callbacks.onSpeakingChange?.(false);
  this.callbacks.onProcessingChange?.(false);

  console.log('[OrbVoiceClient] Stopped');
}
```

---

### File 3 — `src/hooks/useOrbVoiceClient.ts`

Remove `clientRef.current.endTurn()` from the `stopListening` callback (lines 165–171):

```typescript
const stopListening = useCallback(() => {
  if (clientRef.current) {
    clientRef.current.stopListening();
    // endTurn() intentionally NOT called — muting is a pause, not end-of-turn
  }
}, []);
```

---

### Why Each Change Matters

| Change | Why |
|--------|-----|
| `mute()` uses `this.mediaStream.getAudioTracks()` | `mediaStream` is the correct field name (line 22 of polyfill) — `this.stream` does not exist |
| Guard is `this.recorder` not `this.recorder?.isRecording` | After soft-mute, `isRecording` is still `true` (nodes still exist) — we need to check `isMuted` specifically, not re-enter `startRecording()` |
| No `startVolumeMonitoring()` in unmute fast-path | The `ScriptProcessorNode`/`AudioWorklet` and its `onaudioprocess` callback keep running while muted; `startVolumeMonitoring()` would start a second `requestAnimationFrame` loop, doubling the monitoring overhead |
| `stop()` inlines teardown instead of calling `stopListening()` | After Edit A, `stopListening()` only mutes — full `recorder.stop()` must happen explicitly in `stop()` |
| `endTurn()` removed from `useOrbVoiceClient.stopListening` | Muting is a pause — the user should be able to unmute and continue the same turn |
