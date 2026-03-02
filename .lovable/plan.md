
Goal
- Identify why ORB sessions connect but repeatedly produce “No user speech detected” across web, Android, and iOS, then define the implementation plan to stabilize audio forwarding.

What I verified in code
1) ORB session language is hardcoded to German:
- `src/hooks/useOrbVoiceClient.ts` sets `lang: 'de'` with a TODO instead of using user language preferences/context.
- Your DB has mixed languages (`de-DE: 11`, `en-US: 9`, `zh-CN: 1`), so many users are forced into the wrong ASR language.

2) Session lifecycle can create duplicate/competing ORB clients:
- `useOrbVoiceClient.connect()` has no guard like `if (clientRef.current) return`.
- `VitanaAudioOverlay` effect depends on `connect`, so callback identity changes can retrigger connect while overlay is still open.
- New clients overwrite `clientRef` without stopping previous clients first.

3) Mute/unmute flow breaks VAD loop:
- `stopListening()` cancels volume monitoring RAF.
- `startListening()` unmute path does not restart volume monitoring.
- Result: silence detection/end-turn logic can stop working after mic toggles, so user speech may never be committed.

4) Audio upload pipeline is fire-and-forget (no backpressure, no flush before end-turn):
- `sendAudio()` launches many concurrent `fetch` calls.
- `endTurn()` can be sent before prior audio chunks finish uploading on slower/mobile networks.
- This can produce turns that look empty server-side (“no user speech”).

5) Muted state still pushes silence chunks:
- Recorder remains active in soft-mute and keeps generating callbacks.
- Client continues POSTing silent chunks, adding unnecessary network load and increasing race conditions.

Do I know what the issue is?
- Yes. This is primarily a client-side reliability/regression cluster (language selection + session duplication + end-turn/audio queue timing + mute/unmute VAD break), not a single backend outage.

Implementation plan (concise)
Phase 1: Fix highest-impact regressions
- In `useOrbVoiceClient`, derive ORB `lang` from existing language sources (priority: `user_preferences.stt_language` / `LanguageContext`, fallback safely).
- Add strict single-session guard in `connect` and prevent reconnect if a client already exists.
- Before assigning a new client, stop any previous client instance deterministically.

Phase 2: Stabilize mic lifecycle + VAD
- In `OrbVoiceClient.startListening()` unmute path, restart volume monitoring loop.
- Track explicit internal listening state and gate audio sending when muted/not listening.
- Ensure mic UI state is sourced from actual recorder/listening state to avoid false “active” visuals.

Phase 3: Make audio forwarding deterministic
- Add an internal outbound audio queue (sequential sender with bounded buffer and drop policy for overload).
- Implement “flush before end-turn”: `endTurn()` waits until queued chunks are acknowledged (or timeout + explicit warning).
- Stop sending silent chunks while muted.

Phase 4: Add diagnostics needed for cross-user root-cause proof
- Client metrics per session: chunks captured, queued, sent, failed, muted-duration, last successful send timestamp, end-turn wait time.
- Structured logs keyed by `session_id` to correlate “no speech detected” with transport state.
- Surface a user-visible warning when mic appears active but no non-silent frames are detected for N seconds.

Technical details
```text
Current risky flow:
capture -> many parallel POST /stream/send
                    \-> endTurn may fire before uploads complete

Target flow:
capture -> bounded queue -> sequential POST /stream/send -> flush -> POST /end-turn
```

Validation checklist (must pass on desktop + Android + iOS)
1) Start ORB session, speak immediately: transcript appears and assistant responds.
2) Toggle mute/unmute 3+ times: orb returns to listening and speech is transcribed every cycle.
3) On slow network simulation: no empty turns after speech; end-turn waits for upload flush.
4) Language test:
   - `de-DE` user speaking German works.
   - `en-US` user speaking English works.
5) Session stability:
   - No duplicate active ORB sessions per overlay open.
   - No recurring “connected but no speech detected” diagnostics for normal speaking sessions.
