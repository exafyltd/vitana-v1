

## Root Cause: Unstable `useEffect` Dependencies Spawn Duplicate Sessions

Line 81 in `VitanaAudioOverlay.tsx`:
```
}, [audioOverlayVisible, connect, disconnect]);
```

The `connect` function from `useOrbVoiceClient` is recreated on every render because its `useCallback` depends on `[user, activeTenantId, setTenantBySlug]`. Every time any of those change (or any parent re-render), React sees a new `connect` reference → the effect re-fires → calls `connect()` again → opens a **new session** without closing the previous one. Each session has its own SSE stream delivering audio, so you hear 2x or 3x overlapping playback.

The recent visual-only changes (background, rings, glowIntensity) triggered extra re-renders of the overlay component, which amplified this pre-existing instability.

---

## Fix (2 files, minimal changes)

### 1. `src/hooks/useOrbVoiceClient.ts` — Add session guard + stabilize refs

- **Guard**: At the top of `connect()`, check `if (clientRef.current) return;` — prevents a second session from ever being created while one is active.
- **Stable refs**: Store `connect` and `disconnect` logic in `useRef` wrappers, return stable functions that delegate to the ref. This stops downstream effects from re-triggering.

### 2. `src/components/audio/VitanaAudioOverlay.tsx` — Fix dependency arrays

- **Line 81**: Change `[audioOverlayVisible, connect, disconnect]` → `[audioOverlayVisible]`
- **Line 88**: Change `[isSpeaking, isProcessing, micMuted, connectionState, isListening, startListening]` → remove `startListening` (use ref instead)
- Store `connect`, `disconnect`, `startListening` in refs so the effects always call the latest version without needing them as dependencies.

### Why this won't break anything else
- `OrbVoiceClient.start()` already creates exactly one session, one SSE, one recorder. The guard just prevents calling `start()` twice.
- The ref pattern is standard React — the actual logic is identical, only the reference stability changes.
- No changes to `OrbVoiceClient.ts` itself, no changes to SSE, audio playback, or recording logic.

