

## Analysis: Stuck at "One moment..." after first response

The ORB successfully connects, delivers the greeting, and handles the first user turn. But on the second (or subsequent) turn, it gets stuck showing "One moment..." (processing state). Here is why:

### Root causes identified

**1. Response timeout is cleared by ANY SSE message — including heartbeats/keep-alives**

In `OrbVoiceClient.ts` line 262-263, `clearResponseTimeout()` is called on every `onmessage` event BEFORE checking the message type. If the gateway sends heartbeat/ping/status messages (common for SSE), the 15-second safety timeout keeps resetting, but `isProcessing` is never set to `false` because those messages aren't `audio` type. The client stays stuck in "processing" forever.

**2. No `turn_complete` / `end_of_turn` handler**

The SSE message handler only processes `audio`, `transcript`, `assistant_text`, and `error`. The gateway likely sends a completion signal (e.g., `turn_complete`, `end_of_turn`, `done`) after finishing its response. Without handling this, the client has no reliable way to know the AI is done speaking — it relies entirely on the last audio chunk's `source.onended` callback, which can misfire due to audio scheduling timing.

**3. `isSpeaking` may never go false due to audio scheduling edge case**

In `handleAudioChunk` (line 461-464), `source.onended` only sets `isSpeaking = false` if `audioContext.currentTime >= nextStartTime - 0.05`. If audio chunks are buffered with gaps, or the last chunk schedules far ahead of `currentTime`, no `onended` callback triggers the `false` state. The auto-resume effect then never fires because `isSpeaking` stays true.

### Plan

#### File: `src/lib/OrbVoiceClient.ts`

**A. Only clear response timeout on meaningful messages** — Move `clearResponseTimeout()` inside the switch statement, specifically into the `audio` and `turn_complete` cases. Heartbeats or unknown message types should NOT reset the timeout.

**B. Handle `turn_complete` / `end_of_turn` / `done` messages** — Add cases for gateway completion signals. On receipt: set `isSpeaking = false`, `isProcessing = false`, clear the response timeout. This provides a reliable end-of-turn signal rather than depending on audio playback timing.

**C. Add a `speakingDoneTimer` as a fallback** — After the last audio chunk plays, if no more audio arrives within 1 second, force `isSpeaking = false`. This handles the edge case where `source.onended` doesn't fire correctly. Implemented as a timer that resets on each incoming audio chunk and fires 1s after the last one.

**D. Log unhandled SSE message types** — Add a `default` case in the switch that logs the message type, so we can see what the gateway is actually sending (heartbeats, turn_complete, etc.) and handle them.

**E. Make response timeout only reset on audio/turn_complete, not any message** — This ensures the 15s safety net actually works even when heartbeats flow.

#### File: `src/components/audio/VitanaAudioOverlay.tsx`

**F. Add a secondary UI-level timeout** — If the overlay shows "processing" for more than 20 seconds, auto-reset to listening state. This is a last-resort safety net visible to the user.

### Expected outcome

After the AI finishes its response, one of these signals will reliably transition the state:
1. `turn_complete` SSE event (primary)
2. Speaking-done timer fires 1s after last audio chunk (secondary)
3. 15s response timeout (tertiary — no longer defeated by heartbeats)
4. 20s UI-level timeout (last resort)

