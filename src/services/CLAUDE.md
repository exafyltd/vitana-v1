# src/services/ — Business Logic Services (5 files)

## Service Index

| File | Size | Purpose |
|------|------|---------|
| `aiVoiceService.ts` | 22KB | AI voice integration — manages Orb Widget lifecycle, voice transcription, playback control. Interfaces with the gateway's voice endpoints. |
| `vertexLiveService.ts` | 25KB | Google Vertex AI live session management — WebSocket connection to Vertex, audio streaming, response handling. Used by `useVertexLive` hook. |
| `liveRoomService.ts` | 12KB | Live room WebRTC management via Daily.co SDK — room creation, participant management, audio/video tracks. Used by `useLiveRoom` and `useDailyRoom` hooks. |
| `greetingMessages.ts` | 13KB | Dynamic greeting message generation — time-aware, personality-driven greetings for the home page. Used by `IntelligentGreetingProvider` context. |
| `autopilotContext.ts` | — | Autopilot context assembly — builds context for autopilot decisions. Used by `use-autopilot` hook. |

## Patterns

- Services contain business logic that's too complex for hooks
- Services are consumed by hooks, not by components directly
- Voice and live room services manage WebSocket/WebRTC connections
- These are singleton-like modules, not React components
