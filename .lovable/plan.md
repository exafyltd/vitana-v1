

# Fix: Orb Voice Session Not Responding

## Problem Diagnosis

The Orb successfully connects, authenticates, and sends audio to the gateway, but never receives a response from the AI. The user sees "I'm listening..." indefinitely with no welcome message or reply.

**Root Cause Analysis:**

The network logs show:
- Session start: `session_id: "live-044657e4-d899-48ce-8b2a-4ef6ba091c89"` - Success
- Audio chunks being sent via `POST /stream/send` with 200 responses - Success
- No `POST /stream/end-turn` request observed

The current implementation requires the user to **manually stop listening** (click the mic button again) to trigger `endTurn()`, which signals the gateway to process the audio and generate a response. Without this signal, the gateway continues buffering audio indefinitely.

---

## Missing Features

1. **No automatic welcome message** - The AI should greet the user when the session starts
2. **No Voice Activity Detection (VAD)** - The system relies on manual end-turn instead of detecting speech pauses
3. **Continuous listening UX** - User expects real-time conversation, not push-to-talk

---

## Solution Overview

Two-part fix:

### Part 1: Request Welcome Message on Session Start

Add an automatic greeting by sending a silent "hello" turn after the session connects. This triggers the AI to introduce itself.

### Part 2: Add Automatic End-Turn on Speech Pause (Optional Enhancement)

Implement client-side silence detection to automatically call `endTurn()` after 1.5-2 seconds of silence, enabling natural conversation flow.

---

## Technical Changes

### File 1: `src/lib/OrbVoiceClient.ts`

Add welcome message request after session starts:

```text
Current flow:
  1. POST /session/start → get session_id
  2. Connect SSE
  3. Init audio output
  4. Start recording
  5. Ready (waiting for user)

New flow:
  1. POST /session/start → get session_id
  2. Connect SSE
  3. Init audio output
  4. Start recording
  5. [NEW] Send greeting trigger: POST /stream/send {type: "text", text: "Hello"}
  6. [NEW] Call endTurn() to prompt AI response
  7. Ready (AI greets user)
```

Changes to `start()` method:
- After `startRecording()`, add a call to send a greeting message
- Call `endTurn()` immediately after to trigger AI response
- This produces a welcome from the AI without user action

### File 2: `src/lib/OrbVoiceClient.ts` (Silence Detection)

Add silence detection to automatically end turns:

```text
New private properties:
  - silenceTimer: NodeJS.Timeout | null
  - lastVoiceTime: number
  - SILENCE_THRESHOLD: 0.02 (volume level)
  - SILENCE_DURATION: 1500 (ms)

Modified volume monitoring:
  - If volume > SILENCE_THRESHOLD: reset timer, update lastVoiceTime
  - If volume < SILENCE_THRESHOLD for SILENCE_DURATION: call endTurn()
```

### File 3: `src/hooks/useOrbVoiceClient.ts`

No changes needed - the hook already exposes `endTurn()` correctly.

---

## Implementation Details

### Welcome Message (Part 1)

In `OrbVoiceClient.ts`, modify the `start()` method:

```typescript
async start(): Promise<void> {
  try {
    // ... existing session start, SSE connect, audio init ...

    await this.startRecording();

    this.callbacks.onConnectionStateChange?.('ready');

    // NEW: Trigger welcome greeting from AI
    await this.requestWelcome();
  } catch (err: any) {
    // ... existing error handling ...
  }
}

// NEW method
private async requestWelcome(): Promise<void> {
  if (!this.sessionId) return;
  
  // Send a greeting trigger to the AI
  await fetch(`${this.GATEWAY_URL}/api/v1/orb/live/stream/send`, {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify({
      session_id: this.sessionId,
      type: 'text',
      text: '[system] Session started. Greet the user warmly.'
    })
  });
  
  // Signal end of turn to get AI response
  await this.endTurn();
}
```

### Silence Detection (Part 2)

In `OrbVoiceClient.ts`, add automatic end-turn on silence:

```typescript
private silenceTimer: NodeJS.Timeout | null = null;
private readonly SILENCE_THRESHOLD = 0.02;
private readonly SILENCE_DURATION_MS = 1500;
private hasSpeechStarted = false;

private startVolumeMonitoring(): void {
  // ... existing code ...
  
  const updateVolume = () => {
    // ... existing volume calculation ...
    
    // Silence detection
    if (normalizedVolume > this.SILENCE_THRESHOLD) {
      this.hasSpeechStarted = true;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.hasSpeechStarted && !this.silenceTimer) {
      // User stopped speaking - start silence timer
      this.silenceTimer = setTimeout(() => {
        console.log('[OrbVoiceClient] Silence detected - ending turn');
        this.endTurn();
        this.hasSpeechStarted = false;
        this.silenceTimer = null;
      }, this.SILENCE_DURATION_MS);
    }
    
    // ... existing animation frame ...
  };
}
```

---

## Expected Behavior After Fix

1. User opens Orb overlay
2. Session connects (1-2 seconds)
3. AI automatically greets: "Hallo! Wie kann ich dir heute helfen?"
4. User speaks naturally
5. After 1.5 seconds of silence, AI processes and responds
6. Conversation continues naturally without manual button clicks

---

## Testing Checklist

- Open Orb overlay
- Verify AI welcome message plays within 3 seconds
- Speak a sentence and pause
- Verify AI responds after ~1.5 seconds of silence
- Test interruption: speak while AI is responding
- Verify session cleanup on overlay close

---

## Scope Note

This plan focuses on the **frontend changes only**. The gateway must support:
1. Processing text-type messages (for welcome trigger)
2. Generating audio responses when `end-turn` is called

If the gateway doesn't respond to text messages or end-turn signals, that would be a **backend issue** requiring gateway team investigation.

