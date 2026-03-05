

## Analysis: Why ORB works on Dev UI but dies on vitanaland.com

### The evidence

| | Dev UI (working) | vitanaland.com (dead) |
|---|---|---|
| Origin | `gateway-q74ibpv6ia-uc.a.run.app` (same-origin) | `vitanaland.com` (cross-origin) |
| Turns | 11 | 0 |
| Audio chunks | 847 in / 231 out | 0 / 0 |

Same user, same backend, same time window. The difference is **frontend behavior**.

### Root causes found in `OrbVoiceClient.ts`

**1. Race condition: `requestWelcome()` fires before SSE is open (line 153-164)**

```text
start() does:
  1. POST /session/start        ← REST, awaited
  2. connectSSE()               ← creates EventSource, NOT awaited for onopen
  3. initAudioOutput()          ← awaited
  4. startRecording()           ← awaited
  5. requestWelcome()           ← sends text + endTurn immediately
```

`connectSSE()` calls `new EventSource(url)` but returns immediately. On cross-origin (vitanaland.com), the SSE handshake takes longer than same-origin (dev UI). By the time `requestWelcome()` sends the greeting text and `endTurn()`, the SSE stream isn't open yet. The gateway generates the audio response but has nowhere to deliver it. The client is stuck in `isProcessing = true` forever, which blocks auto-resume of listening (line 86 of VitanaAudioOverlay).

**2. SSE errors are silently swallowed (line 242-244)**

```typescript
this.eventSource.onerror = (error) => {
  console.warn('[OrbVoiceClient] SSE connection issue', error);
  // Nothing else — no reconnect, no state change, no error callback
};
```

If SSE drops or fails to connect, the client never knows. It stays in "ready" state with no audio flowing.

**3. No response validation on `requestWelcome()` (line 182-195)**

The welcome POST doesn't check `response.ok`. If the gateway rejects it (session not ready), it fails silently.

**4. No heartbeat/timeout after `endTurn()`**

After calling `endTurn()`, the client sets `isProcessing = true` and waits for SSE audio. If SSE never delivers, it waits forever.

### Plan

#### File 1: `src/lib/OrbVoiceClient.ts`

**A. Add SSE readiness gate** — Make `connectSSE()` return a Promise that resolves on `onopen` (with 10s timeout). Await it in `start()` before calling `requestWelcome()`.

**B. Add SSE error handling** — In `onerror`, increment a failure counter. After 3 consecutive errors without any successful message, call `onError` and `onConnectionStateChange('disconnected')`. Attempt one reconnect before giving up.

**C. Validate `requestWelcome()` response** — Check `response.ok`. If it fails, log but don't block the session (user can still speak first).

**D. Add response timeout after `endTurn()`** — Start a 15s timer. If no SSE message arrives, fire `onError` with "No response from AI" and reset `isProcessing` to false so auto-resume can kick in.

**E. Reset timeout on every SSE message** — Any incoming SSE event clears the response timeout.

#### File 2: `src/context/IntelligentGreetingProvider.tsx`

**Suppress browser TTS greeting when ORB overlay is active** — Import `useStreamingState` and skip `triggerGreeting()` when `audioOverlayVisible` is true. This prevents the confusing situation where browser TTS plays but the ORB is actually dead.

#### File 3: `src/components/audio/VitanaAudioOverlay.tsx`

**Surface reconnecting state** — When `connectionState` transitions to `disconnected` unexpectedly (was previously `ready`), show "Reconnecting..." status and attempt one reconnect automatically.

### What this does NOT fix (backend side)

- If the gateway closes SSE connections from cross-origin requests prematurely, that's a backend CORS/proxy issue
- If the gateway's SSE endpoint doesn't support proper keep-alive headers for cross-origin clients, the connection may drop

### Summary

The core bug is a **race condition**: the welcome message fires before SSE is open. On same-origin (dev UI) this works by luck (fast handshake). On cross-origin (vitanaland.com) it fails consistently. The fix is to gate `requestWelcome()` on SSE `onopen`, plus add proper error handling so the client doesn't silently die.

