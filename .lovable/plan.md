

## Fix: ORB Disco Flickering — Infinite Re-render Loop

### Root Cause

The console shows **"Maximum update depth exceeded"** — an infinite render loop. Here's the chain:

1. User closes overlay → `disconnect()` fires, calling 6 `setState` calls synchronously (line 164-172 in `useOrbVoiceClient.ts`)
2. These state changes trickle through one at a time. During intermediate renders, `isListening` becomes `false` while `connectionState` is still `'ready'`
3. The auto-resume `useEffect` (line 85-90 in `VitanaAudioOverlay.tsx`) sees: not speaking, not processing, not muted, connection ready, NOT listening → calls `startListening()`
4. `startListening()` sets `isListening = true` → triggers the effect again
5. The overlay's close effect fires `disconnect()` again → sets `isListening = false` → step 3 repeats
6. Infinite loop → flickering

### Fix (2 files)

**File 1: `src/hooks/useOrbVoiceClient.ts`** — Batch disconnect state

In `disconnectRef.current` (line 164), set `connectionState` to `'disconnected'` **first**, before clearing other states. This ensures the auto-resume effect's guard (`connectionState === 'ready'`) fails immediately:

```ts
disconnectRef.current = () => {
  // Set disconnected FIRST to prevent auto-resume race
  setConnectionState('disconnected');
  if (clientRef.current) {
    clientRef.current.stop();
    clientRef.current = null;
  }
  setIsListening(false);
  setIsProcessing(false);
  setIsSpeaking(false);
  setVolumeLevel(0);
};
```

**File 2: `src/components/audio/VitanaAudioOverlay.tsx`** — Add guard to auto-resume effect

Add `audioOverlayVisible` as a condition in the auto-resume effect (line 86) so it never tries to restart listening when the overlay is closing:

```ts
useEffect(() => {
  if (audioOverlayVisible && !isSpeaking && !isProcessing && !micMuted && connectionState === 'ready' && !isListening) {
    startListening();
  }
}, [audioOverlayVisible, isSpeaking, isProcessing, micMuted, connectionState, isListening]);
```

These two changes break the infinite loop from both sides — the disconnect batches state correctly, and the auto-resume won't fire during teardown.

