

## Simplify Audio Playback: Remove Queue, Use Direct Scheduling

### Summary
Simplify the audio playback in `OrbVoiceClient.ts` by removing the queue-based approach and scheduling each audio chunk immediately when it arrives. The Web Audio API's scheduling system handles seamless playback automatically.

---

### What's Changing

**Current Approach (Complex)**
```text
┌──────────────┐     ┌────────────┐     ┌──────────────┐
│ Audio chunk  │ ──> │ audioQueue │ ──> │ playNextAudio│
│ arrives      │     │ (array)    │     │ (onended)    │
└──────────────┘     └────────────┘     └──────────────┘
```

**New Approach (Simple)**
```text
┌──────────────┐     ┌─────────────────────────────────┐
│ Audio chunk  │ ──> │ Schedule at nextStartTime       │
│ arrives      │     │ nextStartTime += buffer.duration│
└──────────────┘     └─────────────────────────────────┘
```

---

### Code Changes

**File: `src/lib/OrbVoiceClient.ts`**

#### Remove
- `audioQueue` property
- `isPlaying` property  
- `lastScheduledEnd` property
- `playNextAudio()` method
- `playPcmWithScheduling()` method

#### Add
- `nextStartTime` property (simpler name, same purpose)

#### Simplify
Replace `handleAudioChunk()` with direct scheduling logic

---

### Implementation Details

**1. Update class properties (lines 26-28)**
```typescript
// REMOVE these:
private audioQueue: Array<{ data: string; mime: string }> = [];
private isPlaying = false;
private lastScheduledEnd: number = 0;

// ADD this:
private nextStartTime: number = 0;
```

**2. Replace handleAudioChunk method (lines 143-151)**
```typescript
private handleAudioChunk(base64: string): void {
  if (!this.audioContext) return;
  
  // Resume if suspended (browser autoplay policy)
  if (this.audioContext.state === 'suspended') {
    this.audioContext.resume();
  }

  // Decode base64 → Int16 → Float32
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }

  // Create audio buffer at 24kHz
  const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
  buffer.copyToChannel(float32, 0);

  const source = this.audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(this.audioContext.destination);

  // Schedule to start exactly when previous ends
  const now = this.audioContext.currentTime;
  if (this.nextStartTime < now) {
    this.nextStartTime = now;
  }
  source.start(this.nextStartTime);
  this.nextStartTime += buffer.duration;

  this.callbacks.onSpeakingChange?.(true);
  source.onended = () => {
    // Check if timeline is empty (no more scheduled audio)
    if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
      this.callbacks.onSpeakingChange?.(false);
    }
  };
}
```

**3. Delete playNextAudio() and playPcmWithScheduling() methods (lines 153-216)**

Completely remove both methods.

**4. Update initAudioOutput (line 140)**
```typescript
private async initAudioOutput(): Promise<void> {
  this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  this.nextStartTime = 0;  // Reset on new context
}
```

**5. Update stop() method (lines 414-416)**
```typescript
// REMOVE these lines:
this.audioQueue = [];
this.lastScheduledEnd = 0;
this.isPlaying = false;

// ADD this:
this.nextStartTime = 0;
```

---

### Why This Works

| Aspect | Old Queue Approach | New Direct Scheduling |
|--------|-------------------|----------------------|
| When chunks are scheduled | After previous `onended` fires | Immediately on arrival |
| Gap potential | Yes - event loop delay | No - pre-scheduled |
| Code complexity | 3 methods, queue array | 1 method, 1 number |
| State tracking | `isPlaying`, `audioQueue.length` | Just `nextStartTime` |

The Web Audio API's scheduling is sample-accurate. By pre-scheduling each chunk at `nextStartTime` and incrementing by `buffer.duration`, there's literally zero gap between audio segments.

---

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/OrbVoiceClient.ts` | Remove queue logic, simplify to direct scheduling |

