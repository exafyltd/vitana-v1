

## New OrbVoiceClient Implementation (REST + SSE Architecture)

### Summary
Replace the current WebSocket-based `useVitanalandLive` hook with a new **REST + SSE** architecture using the `OrbVoiceClient` class. The new client connects to the external gateway at `https://gateway-86804897789.us-central1.run.app` using REST endpoints for session management and SSE for streaming responses.

**Key Changes:**
- Replace WebSocket connection with REST + SSE pattern
- Create AudioWorklet processor for high-quality audio capture
- Maintain all existing UI and multimodal features for future phases
- Voice-only functionality in this phase (camera/screen share UI remains but will connect later)

---

### Architecture Comparison

| Aspect | Current (WebSocket) | New (REST + SSE) |
|--------|---------------------|------------------|
| Protocol | WebSocket to Supabase Edge Function | REST + SSE to Gateway |
| Session Management | Implicit via WS connection | Explicit REST endpoints |
| Audio Input | ScriptProcessorNode (deprecated) | AudioWorklet (modern) |
| Audio Output | 24kHz PCM via binary WS | 24kHz PCM via base64 SSE |
| Sample Rate In | 24kHz | 16kHz (gateway requirement) |
| Sample Rate Out | 24kHz | 24kHz |

---

### New Gateway Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/orb/live/session/start` | POST | Create new session, returns `session_id` |
| `/api/v1/orb/live/stream?session_id=...` | GET (SSE) | Stream audio/transcripts from AI |
| `/api/v1/orb/live/stream/send?session_id=...` | POST | Send audio chunks to AI |
| `/api/v1/orb/live/stream/end-turn?session_id=...` | POST | Signal end of user turn |
| `/api/v1/orb/live/session/stop` | POST | Close session |

---

### Implementation Plan

#### Phase 1: Create AudioWorklet Processor

**New file: `public/audio-processor.js`**

```javascript
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.bufferSize = 4096; // ~256ms at 16kHz
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];
            for (let i = 0; i < channelData.length; i++) {
                this.buffer.push(channelData[i]);
            }
            while (this.buffer.length >= this.bufferSize) {
                const chunk = new Float32Array(this.buffer.splice(0, this.bufferSize));
                this.port.postMessage(chunk);
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
```

#### Phase 2: Create OrbVoiceClient Class

**New file: `src/lib/OrbVoiceClient.ts`**

Core class with:
- Session management (start/stop)
- SSE connection for receiving audio/transcripts
- AudioWorklet-based recording at 16kHz
- PCM audio queue playback at 24kHz
- Error handling and reconnection logic

**Key Methods:**
- `start()`: Create session → connect SSE → init audio → start recording
- `stop()`: Stop session → close SSE → cleanup audio
- `endTurn()`: Signal end of user speaking
- `sendTextMessage(text: string)`: Send text instead of audio (for text input feature)

#### Phase 3: Create React Hook

**New file: `src/hooks/useOrbVoiceClient.ts`**

React hook that wraps `OrbVoiceClient` with:
- Connection state management (`disconnected`, `connecting`, `ready`)
- Listening state (`isListening`)
- Processing state (`isProcessing`)
- Speaking state (`isSpeaking`)
- Error state
- Volume level tracking for orb animation
- Transcript handling

**Interface matching current hook:**
```typescript
{
  connectionState: 'disconnected' | 'connecting' | 'ready';
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
  volumeLevel: number;
  transcript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (text: string) => void;
}
```

#### Phase 4: Update VitanaAudioOverlay

**Modify: `src/components/audio/VitanaAudioOverlay.tsx`**

Changes:
1. Replace `useVitanalandLive` import with `useOrbVoiceClient`
2. Replace `useVitanaPCMAudio` (playback now handled inside client)
3. Update `connect()` call signature
4. Keep all multimodal UI controls (camera, screen share, text input)
5. Keep tool execution and navigation logic
6. Update volume level source (now from hook directly)

**Preserved Features (for future phases):**
- Camera toggle button and `useVisualContext` integration
- Screen share toggle button
- Text input slide-up panel
- Diary/Autopilot tool execution
- Navigation commands via `useVitanaOrbTools`

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `public/audio-processor.js` | **Create** | AudioWorklet processor for 16kHz capture |
| `src/lib/OrbVoiceClient.ts` | **Create** | Core client class (REST + SSE + audio) |
| `src/hooks/useOrbVoiceClient.ts` | **Create** | React hook wrapping OrbVoiceClient |
| `src/components/audio/VitanaAudioOverlay.tsx` | **Modify** | Switch to new hook, keep UI intact |

---

### Technical Specifications

#### Audio Input (Microphone → Gateway)
- Sample Rate: **16,000 Hz** (gateway requirement)
- Format: PCM 16-bit signed integer
- Encoding: Base64
- Buffer Size: 4096 samples (~256ms)
- MIME: `audio/pcm;rate=16000`

#### Audio Output (Gateway → Speaker)
- Sample Rate: **24,000 Hz**
- Format: PCM 16-bit signed integer (base64 in SSE)
- Playback: Web Audio API AudioBufferSourceNode

#### SSE Message Types
```typescript
type SSEMessage = 
  | { type: 'audio'; data_b64: string }
  | { type: 'transcript'; text: string }
  | { type: 'assistant_text'; text: string }
  | { type: 'error'; message: string };
```

---

### Error Handling

1. **Session Start Failure**: Toast error, remain disconnected
2. **SSE Disconnect**: Warn in console, allow reconnect
3. **Audio Chunk Send Failure**: Silent fail (avoid log spam)
4. **Microphone Denied**: Toast error, set error state
5. **AudioWorklet Failure**: Fallback error message

---

### State Mapping

| OrbVoiceClient Event | Hook State Change |
|----------------------|-------------------|
| Session created | `connectionState: 'connecting'` |
| SSE connected | `connectionState: 'ready'`, `sessionReady: true` |
| Recording started | `isListening: true` |
| Recording stopped | `isListening: false`, `isProcessing: true` |
| Receiving audio | `isSpeaking: true` |
| Audio complete | `isSpeaking: false`, `isProcessing: false` |
| Transcript received | Update `transcript` |
| Error | Set `error`, optionally disconnect |

---

### Multimodal Preservation

The following features remain in the UI but won't send visual data in Phase 1:

| Feature | UI State | Future Integration Point |
|---------|----------|-------------------------|
| Camera | `cameraActive` toggle button | Will send frames to gateway |
| Screen Share | `screenShareActive` toggle button | Will send screenshots to gateway |
| Text Input | `textInputVisible` panel | Works now via `sendMessage()` |
| Diary | `diaryActive` modal | Works now via tool calls |
| Autopilot | `autopilotActive` modal | Works now via tool calls |

---

### Dependencies

No new npm packages required. Uses:
- Native `AudioWorklet` API
- Native `EventSource` API
- Native `AudioContext` API
- Native `fetch` API

---

### Migration Path

1. Create new files (`OrbVoiceClient.ts`, `useOrbVoiceClient.ts`, `audio-processor.js`)
2. Update `VitanaAudioOverlay.tsx` to use new hook
3. Test voice-only flow
4. Old files (`useVitanalandLive.ts`, `useVitanaPCMAudio.ts`) remain for reference but are no longer used by the orb
5. Future: Add multimodal support by extending `OrbVoiceClient.sendVisualContext()`

