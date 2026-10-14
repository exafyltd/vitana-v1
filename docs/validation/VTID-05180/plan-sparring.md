# VTID-05180 — Plan Sparring record (Native app Wave 1b, ORB native "N6", iOS voice module "N6b")

- **VTID:** VTID-05180 (vitana-v1, "N6b", the ORB iOS voice module in Swift as an Expo local module). Shared plan
  with VTID-05179 ("N6a", the TypeScript protocol client, duplex gate and cross-repo parity) and the N6c (Android
  module) and N6d (ORB overlay, FAB, navigation, i18n keys) VTIDs, all allocated from this same sparring record. This
  file is the same record as `docs/validation/VTID-05179/plan-sparring.md`.
- **Program:** Native app, **VTID-05021**, Wave 1b "ORB native" (`docs/programs/native-app/NATIVE-APP-PLAN.md`).
- **Sparring session:** `c81ea88a-d88e-4dd5-87f7-0bfc1849190b` (`plan_sparring_sessions`).
- **Partner:** the independent `plan-sparring-partner` agent (read-only).
- **Change class:** standard. **Rounds:** 2. **Verdict: CONVERGED.**
- **Plan hash (round 1):** `be64e029553851958bb21ad7c3ba2c4a60c527ec405f374102d58477c3de582c`
- **Plan hash (final):** `34046656e4754a1e4a7e04b92de1e5e103d770198e0331f39a736f1310da7e87` — sha256 of the text strictly
  between the plan begin and end markers below.
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session — Gate 1 2026-10-13: owner delegated decisions ("Continue and make the decisions yourself"; "build in parallel … quickest possible"); planner defaults taken (Open questions 1–6: G1 scope requested in STATUS row 5 and N6 verified offline until then; `orb-parity` uses `PLATFORM_DISPATCH_TOKEN` and fails closed; no platform test change; OS interruption and background end the session; i18n keys in their own PR with Gate 2; an unported screen answers `not_found`).

`<VTID>` / `<VTID-N6d>` in the plan text are placeholders (the plan was hashed before allocation, so they are kept
verbatim below). This PR implements N6b: Changes 9–10, the part of Change 11 that does not depend on N6a / N6d, the
iOS half of Change 13, and the N6b items of Tests.

## Rounds

| Round | Finding | Severity | Answer |
|---|---|---|---|
| R1 | F1 — `orbNative.thinking` / `orbNative.ended` have no existing keys; the widget's `_CAPTIONS` must not be ported | minor | **Accepted** — new keys written DE-first in du-form, `_CAPTIONS` never copied (Change 20) |
| R1 | F2 | minor | Verified compliant; no plan change |
| R1 | F3 — `setVoiceProcessingEnabled` is iOS 17+, the app minimum is iOS 16.4 | major | **Accepted** — AEC path chosen at run time (`vpio-engine` on 17+, `session-voicechat` on 16.4–16.x with no iOS-17 call); `getCapabilities()` reports `aecPath` and `fullDuplexSafe`; 16.x half duplex until its echo bench passes (`IOS16_FULL_DUPLEX_VERIFIED`); XCTest for the selector (Changes 5, 9, 10) |
| R1 | F4 | minor | Verified compliant; no plan change |
| R1 | F5 — the barge-in local stop budget was asserted, not measured | major | **Accepted** — Change 1 reworded; confirming-frame → playback-stopped latency recorded on device, p50/p95/max, target p95 ≤ 64 ms (device checklist 1–2) |
| R1 | F6 | minor | Verified compliant; no plan change |
| R1 | F7 — fork PRs get no secrets | minor | **Accepted** — `orb-parity` fails closed on them with a clear message (Change 6) |
| R1 | F8–F11 | minor | Verified compliant; no plan change |
| R1 | F12 — varispeed in the render path may degrade AEC | major | **Accepted** — two rate modes: (A) `AVAudioUnitVarispeed` default, (B) resample before scheduling, switched by `PLAYBACK_RATE_MODE`; echo bench at 1.0× / 1.05× / 1.1×; duration-parity unit tests (Changes 9, 10, 12, 14) |
| R1 | F13 | minor | Verified compliant; no plan change |
| R1 | Q3 — Android without `AcousticEchoCanceler` | question | **Accepted** — `aec: false, fullDuplexSafe: false`, half duplex; Robolectric + jest + device checklist (Changes 5, 12, 14) |
| R1 | Q4 — is `react-native-url-polyfill` still needed on RN 0.86.3? | question | **Answered: it stays** — RN's own `URL` is not WHATWG (`searchParams` changes never reach `.search`); jest test runs the web `orb-navigation` cases under the polyfill (Change 17) |
| R2 | F14 — `orb_duplex` value type undefined | minor | **Accepted** — a string: `full_duplex` / `half_duplex:no_aec` / `half_duplex:ios16_path_unverified`, constants in `protocol.ts` (Change 5) |
| R2 | F15 — when `orb_duplex` is sent | minor | **Accepted** — in the first `context_update` after `session_started`, once the effective mode is computed; never before (Change 5) |
| R2 | — | — | **CONVERGED** |

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, **four VTIDs** (allocated after sparring and Gate 1, each citing this
  sparring record): N6a protocol client + gate + parity, N6b iOS module, N6c Android module, N6d overlay + FAB +
  navigation + i18n keys. N6b and N6c can run in parallel once N6a is merged. N6d needs N6a plus at least one of N6b/N6c.
- **Program:** VTID-05021, Wave 1b "ORB native" (program §3 `:154-158`, §5 `:197`), exit criterion: "a full multi-turn
  ORB conversation with barge-in and a navigation directive on both platforms against G1; echo test zero gate openings
  on real devices".
- **Dependencies on other workstreams:**
  - N3 (shell) owns the bottom bar and its centre slot. N6d delivers `<OrbFab/>`, and N3 renders it in the slot.
  - Wave 1 auth delivers the Supabase session in the app. N6 takes a `getAccessToken()` function and never reads
    storage itself.
  - Wave 1 extraction step (2), the `@vitana/core` re-export layer, is the import path for `orb-navigation.ts` and
    `orb-view-profile.ts`. If it has not merged, N6d imports them through a metro `watchFolders` alias; Change 19
    describes this.
- **Repos and areas:**
  - vitana-v1:
    - `apps/mobile/src/orb/**` (new)
    - `apps/mobile/modules/vitana-voice/**` (new Expo local module: `ios/`, `android/`, `src/`, `plugin/`)
    - `apps/mobile/tools/orb-fake-gateway/**` (new)
    - `apps/mobile/app/_layout.tsx` and `apps/mobile/app/dev/orb-bench.tsx` (N6d / N6b)
    - `apps/mobile/app.config.ts`, `apps/mobile/package.json` and its lockfile
    - `scripts/native/orb-parity.mjs` and `scripts/native/gen-native-locales.mjs` with their tests
    - `.github/workflows/NATIVE-CI.yml`
    - `docs/programs/native-app/NATIVE-APP-PLAN.md` (one sentence corrected in the Wave 0 row)
    - N6d only: `src/i18n/<locale>/orbNative.json` (new namespace, 11 locales). This is a web deploy path.
  - vitana-platform: docs only. One paragraph in `.claude/rules/backend.md` §2e-duplex naming the native mirror, plus
    STATUS rows. **No file under `services/gateway/**`** changes, because that path would trigger a gateway staging
    deploy (F21).
- **Production safety:**
  - Every ORB endpoint comes from `requireUrl(config, 'gatewayUrl')`. Wave 0's `env.ts` already refuses production
    and staging hosts and has no default URL (F17).
  - No CI job, test, script or device run opens an ORB session on staging or production, signed in or anonymous.
  - The fake gateway binds to localhost or the LAN only and never proxies to any other host.
- **Gates:**
  - G1 is needed only for the Wave 1b exit run, signed-in sessions and the "full conversation" device items.
  - The macOS row (STATUS 8b) blocks N6b's XCTest job and every iOS build.
  - G2 and G3 are not needed.

## Facts (file:line, origin/main)
**Wire protocol (platform `services/gateway/src/frontend/command-hub/orb-widget.js`, 6,505 lines; `routes/orb-live.ts`)**
- F1 **Capture format.**
  - The widget requests the mic with `{echoCancellation, noiseSuppression, autoGainControl: true, sampleRate: 16000}`
    (`orb-widget.js:4056`). It processes audio in a 16 kHz `AudioContext` (`:4060`) through
    `createScriptProcessor(1024, 1, 1)` (`:4065`). One frame is **1024 samples = 64 ms**.
  - `_encodeFrame` (`:4345-4352`) clamps to [-1, 1], converts with `s<0 ? s*0x8000 : s*0x7FFF` into an `Int16Array`
    (little-endian, mono) and base64-encodes it: **2048 bytes, 2732 base64 characters per frame**.
  - `_silentFrame` (`:4336-4343`) is the same length, all zero bytes.
  - On WS a frame is sent as `{type:'audio', data_b64, mime:'audio/pcm;rate=16000'}` (`:4430`). On SSE the same body is
    POSTed to `/api/v1/orb/live/stream/send?session_id=` (`:4441-4443`).
  - Gateway contract: `AUDIO_IN_RATE_HZ = 16000` and `AUDIO_OUT_RATE_HZ = 24000`. The gateway never resamples
    (`orb/live/protocol.ts:26-41`).
- F2 **Playback format.**
  - Server `audio` / `audio_out` frames carry `data_b64` (Int16 LE mono) plus a `mime` whose `rate=` is the real rate:
    24000 for Nova, 16000 for Polly. When `rate=` is missing the client falls back to 24000
    (`_pcmRateFromMime`, `:49-61`; decode at `:2180-2190`).
  - The playback rate is 1.05×, or 1.1× for `de` (`:32`, `:41`, `:43-47`). It is applied through `playbackRate`, so the
    pitch rises with it (`:2196-2200`). The scheduling advance is `buf.duration / chunkRate` (`:2254`).
  - Mobile first-chunk lead is 0.3 s. When the server sets `playback_lead_first_only`, later bursts use 0.05 s
    (`:87-88`, `:2207-2217`).
  - `audioPlaying` turns true on the first scheduled chunk. `audioPlayStartedAt` is stamped only on the false→true edge
    (`:2256-2263`). It turns false 400 ms after the last source ends (`:2239-2245`).
  - The widget never speaks through the OS voice (`:1553`).
- F3 **Transport selection.**
  - `GET /api/v1/orb/live/transport` answers `ws` or `sse` from the `ORB_WS_TRANSPORT` feature flag
    (`orb-live.ts:16055-16061`).
  - The widget's compiled default is `sse` (VTID-05001, `orb-widget.js:217-232`). A WS failure for a transport reason
    sets a per-tab latch and falls back to SSE. A server rejection (`__vtOrbServerRejected`) is never retried on SSE
    (`:2632-2657`, `:2927-2938`).
- F4 **WebSocket path:** `/api/v1/orb/live/ws` (`websocket-handler.ts:33`).
  - The server reads the token from `?token=`, then `Authorization: Bearer`, then `Sec-WebSocket-Protocol`
    (`orb-live.ts:17706-17715`). The widget uses `?token=` (`orb-widget.js:2880`).
  - The server sends `connected` (`orb-live.ts:17767-17775`). The client sends `start`. The server answers
    `session_started` with `session_id`, `live_api_connected`, `full_duplex: isFullDuplexEnabled()`,
    `playback_lead_first_only`, and `conversation_id` (`:18724-18736`; failure variants `:18556`, `:18835`).
  - The start budget is 8 s (`orb-widget.js:2895-2903`). After `session_started` the client sends `audio_ready`
    (`:2000-2013`), which releases the deferred greeting (`orb-live.ts:17938-17999`).
  - **Client→server types the server accepts** (`orb-live.ts:17877-18024`): `ping`, `start`, `prewarm`, `audio`, `video`,
    `text`, `interrupt`, `end_turn`, `audio_ready`, `stop`, `context_update`, `nav_result`. Any other type gets
    `error: Unknown message type`.
  - The connection origin is not checked when the `Origin` header is absent (`validateOrigin`, `:12576-12581`).
- F5 **SSE path:**
  - `POST /live/session/start` (`orb-live.ts:16010`) returns `{ok, session_id, conversation_id, playback_lead_first_only}`
    (`orb-widget.js:2694-2745`).
  - `GET /live/stream?session_id&token` (`orb-live.ts:16404`; the widget sends the token in the query, `:2761-2762`).
  - `POST /live/stream/send` (`:16867`) carries `audio` / `interrupt` / `context_update` / `nav_result`.
  - `POST /live/session/stop` (`:16169`).
  - `POST /orb/session/:id/audio-ready` (`:16248`).
  - On SSE, `full_duplex` arrives in `live_api_ready` (`orb-widget.js:3196-3209`).
- F6 **Start payload** (`orb-widget.js:2475-2520`):
  - always: `lang`, `voice_style`, `response_modalities:['audio','text']`, `vad_silence_ms:600`
  - when available: `client_timezone`, `current_route`, `surface`, `view_role`, `is_mobile`, `recent_routes` (≤5),
    `app_version`
  - one-shot fields: `journey_focus_step`, the support report, and the guided-topic and reconnect fields
    (`transcript_history`, `reconnect_stage`, `conversation_id`)

  The payload carries **no voice id**. The server picks the voice.
- F7 **Server→client messages** the widget handles in `_handleMessage` (`:3174-4045`):
  - session state: `ready`, `live_api_ready`, `thinking`, `audio` / `audio_out`, `turn_complete` (`:3303`),
    `interrupted` (`:3550-3561`: clear the queue, stop sources, `audioPlaying = false`), `error`
  - connection: `connection_alert`, `reconnecting` (`:3584`), `persona_swap_reconnecting` / `persona_swap_reconnected`
    (`:3616`), `reconnected`, `connection_issue` (`:3661`), `live_api_disconnected`, `session_ended` (`:3672`)
  - other: `session_limit_reached` (`:3707`), `support_ticket_filed`, `orb_directive` (`:3756-4010`), `link` (`:4012`),
    `heartbeat` (`:4023`), `transcript` / `output_transcript` / `input_transcript` (`:4028-4043`)
  - The handshake also uses `connected`, `session_started` and `prewarm_ready` (`:1519`, `:1537`, `:2918-2939`).
- F8 **`orb_directive`:**
  - `open_url`: opens the URL externally (`:3762-3790`).
  - `navigate`:
    - with `after_speech`: wait for the turn, or use `after_turn` (`:3791-3818`), with a 15 s safety timer
    - plain: drain the audio, then `_hide('navigate')`, unless `keep_orb_open` (`:3819-3884`)
  - `end_teaching_session`, `end_guided_topic_teaching` and `end_conversation`: drain, then close (`:3886-3960`).
  - `commerce_setup_*`: host DOM events (`:3961-4006`).
  - **Registry navigation** (`_runNavDirective`, `:5643-5700`):
    - It waits for the audio to drain, polling every 300 ms up to 100 times, then waits a further 200 ms.
    - It calls the host's `onNavigationRequest(route, {screen_id, reason, title, entry_kind, params})`.
    - A Promise result gets 1.5 s. The result is sent as `nav_result {screen_id, route, status, reason≤200, entry_kind}`
      (`:5703-5725`).
    - The ORB closes unless `keep_orb_open` is set or `entry_kind === 'overlay'`.
- F9 **Lifecycle constants:**
  - inactivity watchdog: 30 s (`:4743-4750`)
  - background watchdog: drift-based, `BG_CHECK_MS 5000`, `BG_KILL_DRIFT_MS 30000`; the session stops when the app is
    backgrounded (`:4774-4800`)
  - speaking watchdog: 2000 ms quiet / 500 ms tick (`:4851-4852`)
  - `context_update`: debounced 250 ms and deduplicated, sent only while a session is active (`:4540-4580`)
- F10 **Captions** are hard-coded in the widget for 11 locales (`_CAPTIONS`, `:1105-1206`). In vitana-v1 the i18n rule
  forbids that. Some keys already exist: `audio.listening`, `screens.…vitanaSpeaking`, `screens.…microphoneAccessDenied`,
  `orbHint.tapToTalk`.

**Full-duplex gate**
- F11 `full-duplex-gate.ts`:
  - It has **no imports**. It reads only `process.env` in `isFullDuplexEnabled`.
  - `DUPLEX_GATE = {openRms 0.05, closeRms 0.025, hangoverMs 400, aecWarmupMs 250, bargeConfirmFrames 2}` (`:101-160`).
  - `evaluateDuplexGateFrame` is pure and counts voiced frames, not open frames (`:229-305`).
  - `isFullDuplexEnabled()` is `ORB_FULL_DUPLEX_ENABLED === 'true'`. The server decides per session, and the value
    reaches the client in `session_started.full_duplex`.
- F12 The widget mirrors the gate:
  - The literals sit at `orb-widget.js:4122-4126`. The full-duplex block is `:4148-4227`: a silent frame below the gate
    or in warm-up (`:4167`, `:4187`), the verbatim frame (`:4203`), then the interrupt after the send.
  - The **legacy half-duplex path**, which production runs because the flag is off there (backend.md §2e-duplex):
    `vadThreshold 0.06` (`:4071`), `vadConfirm 6` (`:4075`), `PRE_ROLL_MAX_FRAMES 8` (`:4115`), and 200 ms client
    cooldowns after `turn_complete` and after the audio ends (`:4295`, `:4302`).
- F13 The parity test is `services/gateway/test/orb/full-duplex-session-gate.widget-parity.test.ts`. It regex-reads the
  widget and `orb-voice-bench.js` and compares them with `DUPLEX_GATE`. It also pins the constraints, the
  silent-frame-instead-of-return rule and the send-before-interrupt order. **It can only see the platform repo.**
  - Bench tab 2 (`orb-voice-bench.js`):
    - It plays a speech-band test tone (180/340/700/1250 Hz with a 3.1 Hz wobble, gain 0.28, `:139-178`). It measures
      the room's noise floor for 1.2 s first, routes the mic to a muted sink, and counts gate openings during playback.
    - Echo mode passes only with **zero** openings (`:230-345`).
    - It starts **no ORB session** (backend.md §2e-bench).

**Does an ORB session write to the shared production database? (G1 re-verification)**
- F14 **Yes, every session.** `emitLiveSessionEvent` writes OASIS events (`vtid.live.session.start` / `stop`, a
  10 s-sampled `vtid.live.audio.in.chunk`, diagnostics) for **any** session, including anonymous ones
  (`orb-live.ts:15801-15822`, `:18930-18935`). `recordAudioReadyAck` writes session state for signed-in users
  (`:17988-18000`, `:16257`).
- F15 **Signed-in sessions write member memory.** `finalizeLiveSession` runs on every end path (`orb-live.ts:1513`,
  `:1629`, `:10230`, `:16818`, `:19164`). It does four things (`finalize-live-session.ts:11-22`):
  - it commits facts plus a `memory_items` `session_summary` episode
  - it upserts a voice session summary
  - it writes `user_open_threads` and `assistant_promises`
  - it emits `conversation.session.finalized`

  The live tool catalog also writes member-visible content when the model calls it: `save_diary_entry` (`:5496`),
  `send_chat_message` (`:5765`), `create_community_post` (`:5923`), `set_reminder` (`:5528`), `create_calendar_event`
  (`:4704`). The widget itself POSTs continuity rows (`orb-widget.js:5361`, `:5390`).
- F16 The staging gateway and staging frontends use the **production** Supabase project (vitana-v1 CLAUDE.md "Why no
  host is exempt"; platform rule 48). **So the Wave 0 premise "a voice session writes no member data" is false. No
  host other than G1 is a valid target for a live ORB session.**

**Native app state (vitana-v1)**
- F17 `apps/mobile`:
  - Expo SDK 57, RN 0.86.3, React 19.2.3, exact pins, its own lockfile (`apps/mobile/package.json`).
  - `env.ts` refuses `vitanaland.com`, `gateway.vitanaland.com`, the production Supabase reference and
    `preview-aws*.vitanaland.com`. It has no default URL, and `requireUrl` throws when a value is unset
    (`apps/mobile/src/config/env.ts:18-85`).
  - Profiles are `development` and `test-g1`. `production` throws, and the identifiers end in `.dev`
    (`app.config.ts:16-54`).
  - The minimum OS is iOS 16.4 and Android API 24 (README).
- F18 NATIVE-CI has the jobs `mobile`, `parity-ledger`, `lint-rules` and `extraction-analysis`, all on `ubuntu-latest`,
  with no secrets. Native builds are STATUS row 8b (`NATIVE-CI.yml:5-7, 55-147`).
  - vitana-v1 already fetches platform files with `secrets.PLATFORM_DISPATCH_TOKEN` and
    `gh api …/contents/<path>?ref=main` (`PR-GATE.yml:244-251`, `STAGING-TESTS-REQUIRED.yml:38-51`).
- F19 Web host behaviour to mirror:
  - `useOrbVoiceWidget.ts:72-85` probes `GET {gateway}/auth/me` before handing over a token.
  - `:212-251` maps a directive through `planOrbNavigation` (`src/navigation/orb-navigation.ts`, pure apart from
    `new URL`, importing only `./registry`) and returns `NavResult`.
  - `orbViewProfile` (`src/lib/orb-view-profile.ts`) is pure. The gateway's `resolveOrbSurface` treats mobile as
    `vitanaland` unless the route is commerce (`orb/live/surface.ts:38-55`).
  - Overlays use the window-CustomEvent `overlay-bus.ts`, which is DOM-only.
- F20 Web bottom bar: the `MobileBottomNav.tsx` grid has 5 columns with a "Spacer for central Orb FAB" (`:155-164`). The
  widget draws its own 56 px FAB over it (`orb-widget.js:742`, `:4930`).
- F21 Platform deploy paths: `services/gateway/**` (`scripts/ci/staging-verify/lib.cjs:35-43`), which covers its
  `test/` folder too. vitana-v1 deploy paths include `src/**`, so new keys under `src/i18n/` are a web deploy path
  (`:44-58`).
- F22 STATUS (platform `docs/programs/health-hub/STATUS.md`): row 5 G1 is "queued" (blocked on AWS admin); row 8 Wave 0
  (merged per this session); row 8b covers native builds.

## Changes (numbered)

### N6a — ORB protocol client (TypeScript), duplex gate, cross-repo parity (vitana-v1; no deploy path)
1. **Layering decision: the gate runs in TypeScript, not in Swift or Kotlin.**
   - The native modules only capture audio, frame it, compute RMS and play audio. Every decision lives in one TS
     module that is checked against the platform function:
     - silent frame or verbatim frame
     - barge-in
     - legacy pre-roll
     - cooldowns
   - Reasons:
     - (a) Frames already pass through JS to reach the socket, so a native gate saves no hop.
     - (b) A gate in two more languages would make five copies of the algorithm: widget, bench, TS, Swift, Kotlin.
     - (c) The parity check becomes a direct differential test against the platform's own function (Change 6).
   - The barge-in local stop works like this: the TS gate returns `triggerBarge` after its 2-frame (~128 ms)
     confirmation (F11) and calls the native `stopPlayback()`. That bridge call is expected to take 3–10 ms, with spikes
     around 30 ms, which is well within one 64 ms frame period. The budget is **measured on device**, not assumed: the
     echo bench and the fake-gateway run record the time from the confirming frame's timestamp to native playback
     stopping, p50/p95/max (device checklist items 1 and 2). A p95 above 64 ms on a device class is a finding that has
     to be fixed before the Wave 1b exit.
2. `apps/mobile/src/orb/protocol.ts`:
   - typed unions for the client→server types this client sends: `start`, `audio`, `interrupt`, `audio_ready`, `stop`,
     `context_update`, `nav_result`, `ping`
   - the server→client types it handles (F7)
   - `HANDLED_BY_NATIVE`, plus `IGNORED_BY_NATIVE` with a reason per type. Change 6 enforces both lists.
   - `buildStartPayload(ctx)`, mirroring F6:
     - `lang`, `voice_style`, `response_modalities`, `vad_silence_ms: 600`, `client_timezone`
       (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `current_route`, `surface`, `view_role`, `is_mobile: true`,
       `recent_routes` (≤5), `app_version` (from `expo-constants`)
     - **no voice id field**. The persona and voice are server-side, under rule 42a.
     - The one-shot fields (journey focus, support report, guided topic, reconnect history) are out of scope; see N6e.
   - Constants with widget provenance, as `ORB_AUDIO`: `IN_RATE 16000`, `OUT_RATE_DEFAULT 24000`, `FRAME_SAMPLES 1024`,
     `PLAYBACK_RATE 1.05`, `PLAYBACK_RATE_DE 1.1`, `LEAD_FIRST_SEC 0.3`, `LEAD_LATER_SEC 0.05`, `AUDIO_END_GRACE_MS 400`,
     `START_TIMEOUT_MS 8000`, `WATCHDOG_MS 30000`, `CONTEXT_DEBOUNCE_MS 250`, `NAV_DRAIN_POLL_MS 300`,
     `NAV_DRAIN_MAX 100`, `NAV_GRACE_MS 200`, `NAV_RESULT_WAIT_MS 1500`, `AFTER_SPEECH_SAFETY_MS 15000`.
3. Transports (`transport-ws.ts`, `transport-sse.ts`, `select-transport.ts`):
   - **Selection** follows F3:
     - `GET /api/v1/orb/live/transport` decides.
     - When the answer is missing, the default is `sse`.
     - A WS start that fails for a transport reason latches SSE for the rest of the app process.
     - A server `error` during start is a rejection and is never retried on SSE.
     - There is no localStorage developer override. The dev profile reads `EXPO_PUBLIC_ORB_TRANSPORT` instead.
   - **WS:** the RN `WebSocket(url, undefined, {headers: {Authorization: 'Bearer …'}})`.
     - The token goes in the header, never the query, so it stays out of access logs. F4 shows the server accepts it
       there.
     - Flow: `connected` → `start` → `session_started` within 8 s → `audio_ready` → frames.
     - On close it sends `stop` before closing the socket.
   - **SSE** (RN has no `EventSource`): a ~100-line `text/event-stream` parser over `XMLHttpRequest` progress events.
     It adds no new dependency and is tested with chunk-split fixtures.
     - The stream URL carries `session_id` plus the token in the query, as the widget does (F5). That is the only place
       the token appears in a URL. The parser also sends an `Authorization` header (`optionalAuth`).
     - Each frame is POSTed to `/live/stream/send`. Sends go through an **ordered send queue** (one request in flight,
       FIFO), which keeps the widget's "interrupt after the frame" order (`orb-widget.js:4355+`).
     - Audio-ready goes to `POST /orb/session/:id/audio-ready`.
4. `session.ts`, a state machine with no React:
   - **States:** `idle → connecting → started → greeting → listening | thinking | speaking → ending → idle`. A
     `generation` counter makes stale timers no-ops, as `_sessionGeneration` does in the widget.
   - **Watchdog:** the inactivity watchdog is 30 s. Any server message resets it, including `heartbeat`.
   - **Session end:** `session_ended`, `session_limit_reached`, `connection_issue` and `live_api_disconnected` end the
     session with a status.
   - **Status only:** `reconnecting`, `reconnected` and `persona_swap_*` change the status shown but change no audio
     logic.
   - **Transcripts:** buffered only, for the accessibility live region in N6d.
   - **Stop and route changes:**
     - `stop()` cancels pending navigation (VTID-04558 semantics), tears audio down synchronously, then cleans up the
       network side without waiting on it.
     - `updateContext()` debounces for 250 ms, deduplicates, and sends only while a session is active.
   - **Token check:** before start, `GET {gateway}/auth/me`. A 401 or 403 means a stale token: the session refuses to
     start signed in and reports `auth_rejected`. A network error stays optimistic, as on the web (F19).
   - **Anonymous sessions:** with no token, a session is not started at all in N6. Pre-login voice (the sign-up intro)
     is N6e.
5. `duplex-gate.ts`:
   - **`DUPLEX_GATE` and `evaluateDuplexGateFrame`** are a copy of the platform module with **identical semantics**,
     with a header comment naming the source and the parity job.
   - **`evaluateLegacyFrame`:**
     - It is the half-duplex path: threshold 0.06, 6 confirm frames, an 8-frame pre-roll ring that is flushed in order
       before the interrupt.
     - It applies the 200 ms post-`turn_complete` and post-audio-end cooldowns only when `fullDuplex` is false (F12).
   - **`AudioPipeline`:**
     - It takes native frame events `{b64, rms, ts}` and the playback state `{playing, playbackStartedAt}`.
     - Outside playback every frame passes.
     - In playback with `fullDuplex` it emits the frame or the cached silent frame for **every** callback, never
       `return`.
     - On `triggerBarge` it sends the frame first, then calls `native.stopPlayback()`, then sends `interrupt`.
     - On a server `interrupted` it clears the native queue.
   - **Mode switch:** the server enables full duplex through `session_started.full_duplex` or
     `live_api_ready.full_duplex`. The client can never turn it on by itself (backend.md §2e-duplex: Nova's
     `INTERRUPTED` is the authority). The client can only turn it **off** for a device that cannot cancel echo:
     - The mode used is `effectiveFullDuplex = server.full_duplex && device.fullDuplexSafe`.
     - `fullDuplexSafe` comes from `VitanaVoice.getCapabilities()`. It is false when Android reports `aec: false`
       (Change 12), and false on the iOS 16.x path while the echo bench has not passed on it (Change 9).
     - When it is false, the client runs the legacy half-duplex path (F12): the mic is gated during playback, there is
       an 8-frame pre-roll, and a 6-frame confirmation at 0.06.
     - This stays compatible with a full-duplex server. Under full duplex the server simply forwards whatever frames
       it receives (`shouldDropMicWhileModelSpeaking` returns false, F11), so a client that sends fewer frames is
       handled correctly.
     - The overridden mode and its reason (`no_aec`, `ios16_path_unverified`) are sent once per session in
       `context_update.app_state.orb_duplex`. `app_state` is an existing field that the server already parses into
       session state (`orb/live/session/context-update.ts:105-107`), so this adds no protocol change. The value is a string, one of `full_duplex`, `half_duplex:no_aec`, `half_duplex:ios16_path_unverified` (constants in `protocol.ts`), and it rides in the first `context_update` sent after `session_started` has arrived and the effective mode is computed — never before (sparring R2-F14/F15).
6. `scripts/native/orb-parity.mjs` (Node with the TS compiler API; tests under `scripts/native/__tests__/`). It runs as
   a **new NATIVE-CI job `orb-parity`**:
   - **Fetch:** using `secrets.PLATFORM_DISPATCH_TOKEN`, the same pattern as F18, it fetches `full-duplex-gate.ts`,
     `orb-widget.js`, `routes/orb-live.ts` and `orb/live/protocol.ts` from vitana-platform `main`. If the token or the
     fetch fails, the job **fails**; it never skips. Pull requests from forks get no secrets, so the job fails closed
     on them. Its error message says: "orb-parity needs PLATFORM_DISPATCH_TOKEN (not available to fork PRs); push the
     branch to exafyltd/vitana-v1 to run it." The repo is private, so fork PRs are not the normal path.
   - (a) **Gate constants:** `DUPLEX_GATE` (platform, extracted with the TS AST) deep-equals the mobile copy.
   - (b) **Gate behaviour (differential):** it transpiles the platform file with `ts.transpileModule`; the file has no
     imports, F11. It runs the platform `evaluateDuplexGateFrame` and the mobile one over:
     - the scripted scenarios from the platform's own tests: warm-up, hangover, cough, mid-word dip, double barge
     - 20,000 seeded random frames

     Every decision and every next state must be identical. It also writes the platform outputs for a fixed vector set
     to `apps/mobile/modules/vitana-voice/fixtures/duplex-gate-vectors.json`, and `--check` fails when the committed
     file differs. The Swift and Kotlin tests read this file for their framing and RMS checks (Changes 10 and 14).
   - (c) **Widget literals:** `orb-widget.js` must still contain the literals the mobile constants mirror:
     - `vadThreshold = 0.06`, `vadConfirm = 6`, `PRE_ROLL_MAX_FRAMES = 8`, the two `< 200` cooldowns
     - `createScriptProcessor(1024`, `sampleRate: 16000`
     - `_AUDIO_PLAYBACK_RATE = 1.05` / `_DE = 1.1`, `_PLAYBACK_LEAD_FIRST_SEC = 0.3` / `_LATER_SEC = 0.05`
     - the 400 ms grace, `vad_silence_ms: 600`
     - `protocol.ts` `AUDIO_IN_RATE_HZ` / `AUDIO_OUT_RATE_HZ`

     Each literal is compared with `ORB_AUDIO`.
   - (d) **Protocol contract:**
     - Every client→server type in `protocol.ts` must be a `case` in `handleWsClientMessage` (F4).
     - Every server→client type the widget handles (F7) must be in `HANDLED_BY_NATIVE` or `IGNORED_BY_NATIVE`. A new
       server message the widget learns fails the job until it is classified.
   - (e) **Rules 41 and 42a:** `apps/mobile/src/orb/**` and `modules/vitana-voice/**` contain no `AVSpeechSynthesizer`,
     `android.speech.tts`, `expo-speech`, `voice_id`, `voiceId` or `.mp3` / `.wav` asset, and no user-language string
     literal in a `speak` / `say` / `text` position. The native ORB never speaks a sentence of its own and never picks a
     voice.
   - **Triggers:** pull requests that touch the NATIVE-CI paths, `push: main`, and a **daily `schedule`**, so a
     platform-side change to the gate or protocol turns the job red within 24 h. The job needs only
     `permissions: contents: read`. It is the only NATIVE-CI job that uses a secret; the others stay secret-free.
7. `apps/mobile/tools/orb-fake-gateway/` (Node + `ws`, apps/mobile devDependency, never shipped in the app):
   - **What it does:** it speaks the F4/F5 protocol from scripted scenarios:
     - full-duplex on / off
     - greeting, then an `audio` burst built from the **bench test tone, not speech**, at 24 kHz and at 16 kHz mime
     - `turn_complete`
     - `interrupted` on `interrupt`
     - `orb_directive navigate` with and without `after_speech` / `keep_orb_open` / `entry_kind:'overlay'`
     - `session_ended`, a transport-failure case, and a `start` rejection
   - **Recording:** it writes every received client frame to `out/frames.jsonl` with the arrival time, so the device
     checklist can verify byte length, cadence and order on the gateway side.
   - **Network limits:** it binds to `127.0.0.1` by default; `--lan` binds to a private-range interface. It refuses
     public bind addresses and opens no outbound connection.
   - **Device access:** dev-profile builds reach it over `ws://`, so the config plugin adds `NSAllowsLocalNetworking`
     (iOS) and a cleartext network-security config scoped to private ranges (Android) **in the `development` profile
     only**. `test-g1` uses `wss://` only.
8. `docs/programs/native-app/NATIVE-APP-PLAN.md:195` (docs path, not a deploy path):
   - Replace "if G1 slips it may run against the staging gateway because a voice session writes no member data" with
     "a live ORB session writes to the shared production database (OASIS events for every session, memory and continuity
     for signed-in sessions); before G1 the spike and Wave 1b verify offline (fake gateway, on-device echo bench), and
     live sessions run only on G1".
   - The edit cites F14–F16 and this sparring record.
   - Platform docs PR: one paragraph in `.claude/rules/backend.md` §2e-duplex saying that the native app mirrors
     `DUPLEX_GATE` in `apps/mobile/src/orb/duplex-gate.ts`, checked daily and per PR by vitana-v1 NATIVE-CI `orb-parity`,
     so "change it here and the native job tells you". Plus STATUS rows for N6a–N6d.

### N6b — iOS voice module (Swift, Expo local module)
9. `apps/mobile/modules/vitana-voice/` (Expo Modules API; `expo-module.config.json`, `src/VitanaVoice.ts` with typed
   JS API — Interfaces). iOS `VoiceEngine.swift`:
   - `AVAudioSession` category `.playAndRecord`, mode `.voiceChat`, options `.defaultToSpeaker`, `.allowBluetooth`
     (HFP); `setPreferredIOBufferDuration(0.02)`; activated only on `start()`, deactivated with
     `.notifyOthersOnDeactivation` on `stop()`.
   - **AEC path, chosen at run time** (`if #available(iOS 17, *)`). The app minimum stays iOS 16.4: N6 does not raise
     it, because that is a program decision.
     - **iOS 17+ (`aecPath: 'vpio-engine'`):** one `AVAudioEngine` with `inputNode.setVoiceProcessingEnabled(true)`.
       This turns on the voice-processing unit that performs AEC, noise suppression and gain control.
     - **iOS 16.4–16.x (`aecPath: 'session-voicechat'`):** the voice processing is requested through the audio session
       instead, using `.playAndRecord` with mode `.voiceChat` on the same engine graph. No iOS-17-only API is called.
     - `getCapabilities()` reports `aecPath` and `voiceProcessing`, and the bench shows both.
     - The echo bench must pass on **both** paths: a 16.x device or simulator, and a 17+ device.
     - Until the 16.x path has passed the device bench, `fullDuplexSafe` is false on 16.x. The client then runs half
       duplex there (Change 5): the server's `full_duplex` is ignored on the client and the mic is gated during
       playback, exactly like today's half-duplex widget.
     - Whether the 16.x path is promoted is recorded in `docs/validation/<VTID>/device-checklist.md`. The promotion
       is a one-line capability flag in the module (`IOS16_FULL_DUPLEX_VERIFIED`).
   - **Playback chain:** `AVAudioPlayerNode` → `mainMixerNode` on the **same** engine as capture, so the voice
     processing has the render reference for echo cancellation. There are two documented ways to apply the playback
     rate (1.05×, 1.1× for `de`, pitch rising with it as in Web Audio `playbackRate`, F2):
     - **(A) default:** an `AVAudioUnitVarispeed` node between the player and the mixer.
     - **(B) fallback:** resample each PCM chunk by the rate factor before scheduling it (`AVAudioConverter`, output
       rate = source rate ÷ rate factor, played at the engine rate). The rate change then happens before the buffer
       enters the graph, so the render path that echo cancellation references is a plain player into the mixer. The
       duration and pitch result equals (A).

     The device checklist runs the echo bench at 1.0×, 1.05× and 1.1×. If AEC gets worse with varispeed on a path —
     gate openings at 1.05× or 1.1× while 1.0× is clean — that path switches to (B) through the constant
     `PLAYBACK_RATE_MODE`, and the checklist records the change. Both modes are implemented and unit-tested, so the
     switch needs no new code.
   - Capture: input tap at hardware format → `AVAudioConverter` to 16 kHz mono Int16 LE → accumulator emitting exactly
     1024-sample frames; RMS computed on the float signal before conversion (same definition as the widget:
     `sqrt(mean(x²))` over the frame); event `onFrame {b64, rms, ts}` (base64 done natively).
   - Playback: `enqueue(b64, sampleRate)` converts Int16 → float at the chunk's own rate (16k or 24k, F2), schedules
     back-to-back; first-chunk lead per F2 (`leadFirstOnly` from config); `playing` true on first schedule with
     `playbackStartedAt` stamped on the false→true edge only, false 400 ms after the queue drains; events
     `onPlaybackState {playing, startedAt}`; `stopPlayback()` stops the node and clears the queue synchronously.
   - **Interruption** (`AVAudioSession.interruptionNotification`): `.began` → stop playback + capture, emit
     `onInterruption {kind:'began'}`; TS ends the session (conservative: same as the widget's background stop, F9);
     `.ended` does not auto-resume a session.
   - **Route change** (`routeChangeNotification` + `AVAudioEngineConfigurationChange`): rebuild the graph, restart the
     engine, re-stamp `playbackStartedAt = now` while playing (AEC re-converges on the new route → warm-up window
     applies again); emit `onRouteChange {reason, output}`. `mediaServicesWereReset` → full rebuild, session ends.
   - App background (`UIApplication.didEnterBackgroundNotification`) → emit; TS ends the session (no
     `UIBackgroundModes: audio` in N6, mirrors F9).
10. iOS tests (XCTest in the module, runs on a macOS runner — STATUS 8b): frame assembler emits exactly 1024-sample /
    2048-byte frames from odd hardware buffer sizes (441, 480, 512, 4096) and sample rates (48k, 44.1k, 24k); Int16
    clamping and silence encodes to all-zero bytes; RMS of known signals within 1e-6; playback state edge stamping and
    400 ms grace; enqueue at 16k vs 24k yields the right durations at rate 1.05/1.1; `stopPlayback` empties the queue;
    route-change re-stamps `playbackStartedAt`. Reads `duplex-gate-vectors.json` only for RMS inputs (the decision
    logic is TS). Further cases:
    - the AEC-path selector returns `vpio-engine` on 17+ and `session-voicechat` below 17, behind an injectable OS
      version, and never calls `setVoiceProcessingEnabled` below 17;
    - `getCapabilities().fullDuplexSafe` is false on 16.x until `IOS16_FULL_DUPLEX_VERIFIED` is set;
    - the varispeed mode (A) and the resample mode (B) give the same output duration within 1 ms per chunk at 1.0×,
      1.05× and 1.1×.
11. `apps/mobile/app/dev/orb-bench.tsx` (registered **only** when `APP_PROFILE=development|test-g1`; parity ledger
    `native_only` row with reason "dev echo bench"): the native equivalent of ORB Voice Bench tab 2 — same test tone
    (F13) synthesised in TS as 24 kHz PCM and played through `VitanaVoice.enqueue`, 1.2 s noise floor, same
    `DUPLEX_GATE` via `duplex-gate.ts`, echo mode PASS only with zero openings, speech mode PASS when barge confirms;
    shows device model, OS, route, VPIO on/off; "copy result" exports JSON for the device log. **No network, no session.**

### N6c — Android voice module (Kotlin)
12. `android/…/VoiceEngine.kt` (same JS API as iOS):
    - `AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, 16000, CHANNEL_IN_MONO, ENCODING_PCM_16BIT)`, buffer
      ≥ 2× `getMinBufferSize`, read loop on a dedicated thread assembling exact 1024-sample frames; on its session id
      attach `AcousticEchoCanceler`, `NoiseSuppressor`, `AutomaticGainControl` when `isAvailable()` (report each in
      `getCapabilities()` — the bench shows them).
    - **No AcousticEchoCanceler** (`AcousticEchoCanceler.isAvailable()` false, or `create()` returns null or fails to
      enable): `getCapabilities()` returns `aec: false, fullDuplexSafe: false`. The client then runs **half duplex** on
      that device (mic gated during playback, Change 5) and never full duplex, whatever the server says.
      `aecPath: 'android-aec'` or `'none'` is reported. The `VOICE_COMMUNICATION` source alone does not count as AEC,
      because some devices apply processing there without exposing it. Such a device can be promoted only by a passing
      echo bench recorded in the checklist (a per-model allowlist, empty in N6).
    - The playback rate uses `PlaybackParams` speed and pitch (mode A) by default, with the same PCM-resample fallback
      (mode B) as iOS, switched by the same constant when the echo bench at 1.05× or 1.1× degrades.
    - `AudioManager.MODE_IN_COMMUNICATION` during a session (restored after); speaker by default
      (`setCommunicationDevice` on API 31+, `isSpeakerphoneOn` below), Bluetooth SCO when an HFP device is connected.
    - Playback: `AudioTrack` (`USAGE_VOICE_COMMUNICATION`, `CONTENT_TYPE_SPEECH`, mono PCM16, created per output rate
      16k/24k, `MODE_STREAM`), `PlaybackParams.setSpeed(rate).setPitch(rate)` (pitch follows, F2); writer thread with a
      queue; same `playing` / `startedAt` / 400 ms grace semantics and `stopPlayback()` = `pause()+flush()` + queue clear.
    - Audio focus `AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE`; loss (call, assistant, other app) → `onInterruption` → TS ends
      the session; `AudioDeviceCallback` + `ACTION_HEADSET_PLUG` → `onRouteChange`, restart record/track, re-stamp
      `playbackStartedAt`; `ProcessLifecycleOwner` `ON_STOP` → background event → session ends.
    - Runtime `RECORD_AUDIO` permission requested only after the in-app rationale (N6d).
13. Config plugin `plugin/withVitanaVoice.js` (both platforms, used by `app.config.ts` `plugins`):
    - iOS `NSMicrophoneUsageDescription`: base value and per-locale `InfoPlist.strings` via Expo `locales`, generated at
      prebuild by `scripts/native/gen-native-locales.mjs` from `src/i18n/<locale>/orbNative.json`
      (`micUsageDescription`) for all 11 locales — no hardcoded permission text (gitignored output, same pattern as
      Wave 0's `gen-i18n-map`). Dev profile only: `NSAllowsLocalNetworking`.
    - Android `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH_CONNECT` (API 31+); dev profile only: network security
      config allowing cleartext to private ranges (Change 7).
14. Android tests: JVM unit tests (frame assembler, PCM/RMS, playback-state machine, vectors file as in Change 10,
    mode A vs mode B duration parity) and Robolectric tests for audio-focus loss → interruption event and for
    `AcousticEchoCanceler` unavailable / `create()` null → `getCapabilities()` `{aec:false, fullDuplexSafe:false}`; run by a **new Linux NATIVE-CI job `android-module`**
    (`expo prebuild --platform android --no-install` with `APP_PROFILE=development`, Gradle
    `:vitana-voice:testDebugUnitTest`, no signing, no secrets). If STATUS 8b has already added an Android build job, N6c
    adds the unit-test step to it instead.

### N6d — ORB overlay, FAB, navigation directives, i18n keys
15. `apps/mobile/src/orb/ui/`: `<OrbFab/>` (exported for N3's centre slot; 56 pt circle, same gradient/pulse as the
    widget FAB F20, `accessibilityRole="button"`, label `t('orbHint.tapToTalk')`) and `<OrbOverlay/>` (full-screen
    modal mirroring the widget overlay: sphere with the state colours of `orb-widget.js:5029+`, status caption, mic and
    close buttons; captions from i18n keys, F10; transcripts in an accessibility live region only — the widget shows
    none; RTL via `start`/`end`). `useOrbSession()` hook binds `session.ts` + `AudioPipeline` + `VitanaVoice`.
16. Permission flow: tap FAB → if mic permission undetermined, in-app rationale sheet (i18n) → OS prompt; denied →
    `microphoneAccessDenied` state with a "open settings" action (`Linking.openSettings()`); never starts a session
    without mic.
17. Navigation directives (`nav-directive.ts`, pure, unit-tested): F8 semantics — `after_speech` held until
    `turn_complete` + drain or 15 s; `after_turn` runs after drain; drain = native queue empty and `playing` false,
    polled 300 ms × ≤100, then 200 ms; close unless `keep_orb_open` / `entry_kind:'overlay'`; result sent as `nav_result`
    (≤1.5 s for an async host answer).
    - Mapping: `planOrbNavigation(route, ctx, {isMobile: true})` (the web's registry-aware planner, F19) →
      `route` → `router.push(url)` **only if** the Expo Router tree has that route (computed from the same file-route
      mapping as the parity ledger), else `nav_result {status:'not_found', reason:'native_screen_not_ported'}`;
      `overlay` → a native overlay bus (same event names as `overlay-bus.ts`, `register(event, handler)` acknowledges);
      no registered native handler → `{status:'not_found', reason:'native_overlay_not_ported'}`; `refuse` →
      `{status:'refused'}`. The gateway learns the truth instead of assuming an open screen.
    - `open_url` → `Linking.openURL` (https only; others ignored with a log). `end_conversation` /
      `end_teaching_session` / `end_guided_topic_teaching` → drain, close. `commerce_setup_*` → in `IGNORED_BY_NATIVE`
      with reason (N6e).
    - **URL support: keep `react-native-url-polyfill`** (exact pin), imported once in `_layout.tsx`.
      - Hermes provides no `URL`. React Native 0.86.3 ships its own JavaScript `URL` / `URLSearchParams` in
        `Libraries/Blob/URL.js` / `URLSearchParams.js`. This was checked in the 0.86.3 npm tarball.
      - That implementation is not WHATWG:
        - `get search()` reads only the internal string (`URL.js:172-175`).
        - `searchParams` is a cached copy built from it (`:195-200`).
        - Changes to the copy reach only `toString()`, never `.search`.
      - `planOrbNavigation` (`orb-navigation.ts`, `registryRoute`) calls `baseUrl.searchParams.set(...)` and then reads
        `baseUrl.pathname + baseUrl.search`. Under the built-in class the query parameters the gateway added would be
        silently lost.
      - A jest test runs the web's `orb-navigation.test.ts` cases under the polyfilled `URL` and pins the
        `?tab=` / `?open=` merge.
18. Context: on route change the app calls `session.updateContext({current_route, recent_routes, is_mobile:true,
    screen_title})`; `surface` / `view_role` from `orbViewProfile(route, currentRole)` (F19); a role change during an
    open session ends and restarts it (web VTID-04561 behaviour).
19. Imports of web code: `src/navigation/orb-navigation.ts`, `src/navigation/registry/**`, `src/lib/orb-view-profile.ts`
    via `@vitana/core` if the Wave 1 re-export layer has merged; otherwise a `@web/*` metro alias +
    `tsconfig` path limited to exactly those three paths (ESLint `no-restricted-imports` keeps banning everything else).
    No file under `src/` is edited for this.
20. i18n keys (**web deploy path**, F21): new namespace `orbNative` in `src/i18n/de/orbNative.json` first, then the
    other 10 locales (du-form; `translate-keys.mjs` for non-DE/EN, `_pending_review` until reviewed): status captions
    (connecting, listening, thinking, speaking, reconnecting, ended), mic rationale title/body/continue, mic denied +
    open settings, `micUsageDescription`, overlay close / mic toggle a11y labels, bench screen labels. Reuse existing
    keys where they exist (F10). `orbNative.thinking` and `orbNative.ended` (and any other caption with no existing key)
    are **new keys written DE-first in du-form** — the widget's `_CAPTIONS` literals (`orb-widget.js:1105-1206`) are
    never copied or ported. `npm run i18n:inventory` regenerated. These keys are unused by the web app; the PR's
    `docs/validation/<VTID-N6d>/staging-tests.json` is the community smoke suite plus one read-only spec asserting the
    staged build still loads `/` in `de` and `en` with no missing-key leak — so N6d has a Gate 2 (web build with
    unchanged behaviour). To keep the native part out of that gate, N6d is two PRs: (i) keys only, (ii) native UI
    (no deploy path).

## Interfaces
```ts
// apps/mobile/modules/vitana-voice/src/VitanaVoice.ts (same on iOS and Android)
type VoiceFrame = { b64: string; rms: number; ts: number };            // 1024 samples, 16 kHz, Int16 LE mono
type PlaybackState = { playing: boolean; startedAt: number };           // startedAt stamped on false→true only
type RouteChange = { reason: string; output: 'speaker'|'receiver'|'wired'|'bluetooth'|'other' };
interface VitanaVoice {
  start(opts: { leadFirstOnly: boolean; playbackRate: number }): Promise<void>;   // session + capture + engine
  stop(): Promise<void>;
  enqueue(b64: string, sampleRate: number): void;                       // rate from mime (16000 | 24000)
  stopPlayback(): void;                                                  // synchronous queue clear
  setPlaybackRate(rate: number): void;
  getCapabilities(): Promise<{ aec: boolean; ns: boolean; agc: boolean; voiceProcessing: boolean;
    aecPath: 'vpio-engine' | 'session-voicechat' | 'android-aec' | 'none';
    fullDuplexSafe: boolean;                                            // false ⇒ client runs half duplex (Change 5)
    playbackRateMode: 'varispeed' | 'resample' }>;
  addListener(e: 'onFrame', cb: (f: VoiceFrame) => void): Subscription;
  addListener(e: 'onPlaybackState', cb: (s: PlaybackState) => void): Subscription;
  addListener(e: 'onInterruption', cb: (i: { kind: 'began'|'ended' }) => void): Subscription;
  addListener(e: 'onRouteChange', cb: (r: RouteChange) => void): Subscription;
  addListener(e: 'onBackground', cb: () => void): Subscription;
}
// apps/mobile/src/orb/session.ts
createOrbSession(deps: { gatewayUrl: string /* requireUrl → assertNotProduction */; getAccessToken(): Promise<string|null>;
  voice: VitanaVoice; navigate: (route: string, ctx: NavCtx) => NavResult | Promise<NavResult>; lang(): string;
  appVersion: string; now?: () => number }): OrbSession  // start(ctx) / stop(reason) / updateContext(ctx) / subscribe(fn)
```

## Tests
- **Protocol client (jest-expo, N6a)** — recorded frames = JSON fixture transcripts under
  `apps/mobile/src/orb/__fixtures__/`, each message annotated with its widget/server `file:line` provenance (F1–F8);
  no fixture is captured from a live gateway (F14–F16):
  - WS handshake: header auth (no token in URL), `connected → start → session_started → audio_ready`; 8 s timeout;
    `stop` sent before close; server `error` at start ⇒ rejection, no SSE retry; transport failure ⇒ SSE latch.
  - SSE: parser over chunk splits at every byte offset of the fixture stream; ordered send queue keeps frame-then-
    interrupt order under delayed responses; audio-ready POST.
  - Start payload equals the F6 field set, has no voice field, `is_mobile:true`, `vad_silence_ms:600`.
  - Frames: every native frame yields exactly one outbound `audio` (never dropped) in full duplex; silent frame is the
    cached all-zero 2048-byte base64; legacy path: below 0.06 nothing sent during playback, 6 frames ⇒ pre-roll flush in
    order then `interrupt`; 200 ms cooldowns only when `fullDuplex` false.
  - `fullDuplex` only from `session_started` / `live_api_ready`; `interrupted` clears native queue; rate from mime with
    24000 fallback; `de` ⇒ 1.1.
  - Capability override: with server `full_duplex:true` and `fullDuplexSafe:false` (Android `aec:false`, iOS 16.x
    unverified) the pipeline runs the legacy gated path — no frame sent below 0.06 during playback, pre-roll flush then
    `interrupt` — and reports `app_state.orb_duplex` once; with `fullDuplexSafe:true` and server `false` it stays half
    duplex (the client never enables full duplex).
  - Lifecycle: 30 s watchdog, `heartbeat` resets it, generation guard drops stale timers, `stop()` cancels pending nav,
    `auth/me` 401 ⇒ no signed-in start, interruption/background/route events behave per Changes 9/12.
  - `createOrbSession` refuses every `BLOCKED_HOSTS` / staging host (defence in depth over `env.ts`).
- **Gate:** `duplex-gate.test.ts` ports the platform's `full-duplex-session-gate.test.ts` scenarios 1:1; plus the
  `orb-parity` differential (Change 6b) in CI.
- **Parity / contract (node --test, fixture trees, N6a):** constants mismatch fails; widget literal missing/changed
  fails; an unclassified server message fails; a client type the server does not accept fails; a forbidden TTS/voice
  token in module sources fails; vectors file drift fails; missing token fails (no silent skip).
- **Native unit tests:** iOS XCTest (Change 10, macOS row 8b), Android JVM + Robolectric (Change 14, Linux).
- **Navigation (N6d):** `nav-directive.test.ts` — after_speech waits for turn + drain, safety 15 s, after_turn, overlay
  keeps ORB open, unported screen ⇒ `not_found` with reason, unknown overlay ⇒ `not_found`, refuse ⇒ `refused`,
  async host answer >1.5 s ⇒ `unknown`; `open_url` https-only.
- **Locales:** `gen-native-locales` test — 11 locales present, DE du-form (no `Sie/Ihr/Ihnen`), output deterministic;
  RNTL test that overlay/FAB render only catalog strings (`ar` RTL snapshot).
- **Device checklist (real devices, recorded in `docs/validation/<VTID>/device-checklist.md`; matrix: iPhone on iOS
  16.4-class + current iPhone; Pixel, Samsung, one low-end Android):**
  1. Offline echo bench (Change 11), speakerphone, realistic volume, headphones off: **zero gate openings** (F13);
     speech mode: barge confirmed. Repeat on wired headset and Bluetooth HFP. A device class that fails is recorded as
     "full duplex unsafe" — thresholds are never lowered (backend.md §2e-bench). Each run is repeated at playback
     rate **1.0×, 1.05× and 1.1×** (German); openings at 1.05×/1.1× with a clean 1.0× switch that path to resample mode
     (B) and the bench is re-run. iOS: run on **both** AEC paths — a 16.x device/simulator (`session-voicechat`) and a
     17+ device (`vpio-engine`); 16.x stays half duplex until it passes. Android: a device without
     `AcousticEchoCanceler` is confirmed to run half duplex. Barge latency recorded: confirming-frame timestamp →
     native playback stopped, p50/p95/max (target p95 ≤ 64 ms, one frame period).
  2. Fake gateway (Change 7, LAN): `frames.jsonl` shows 2048-byte frames, 64 ms ± 10 ms cadence, no gaps during
     playback (silent frames present), frame-then-interrupt order; 24 kHz and 16 kHz bursts play at correct pitch
     (1.05/1.1 rate); interruption (incoming call, Siri/Assistant, alarm), route changes (plug/unplug, BT connect/
     disconnect, speaker↔receiver), background and lock, permission denied/revoked, airplane mode mid-session — each
     ends or recovers as specified and leaves no mic indicator on.
  3. **G1 only (after G1 passes):** signed-in multi-turn conversation in `de` and `en`, barge-in mid-reply, a
     navigation directive to a ported screen (`nav_result opened`) and to an unported one (`not_found`), on both
     platforms — the Wave 1b exit. Never staging, never production, never anonymous on a non-G1 host.

## Rollout / gates
1. Spar (same partner, ≥2 passes) → Gate 1 → allocate four VTIDs citing the record; `scope.json` per VTID.
2. N6a PR (vitana-v1, no deploy path) + platform docs PR (backend.md paragraph, STATUS rows). Done at merge with green
   checks; `orb-parity` green on PR and on the first scheduled run.
3. N6c PR (Linux CI) and N6b PR (needs macOS row 8b for XCTest; if unavailable, N6b waits — it is not merged without
   its unit tests). Done at merge with green checks; device checklist items 1–2 recorded in the PR.
4. N6d PR (i) i18n keys → staging deploy → STAGING-VERIFY (read-only smoke + key-load spec) → Gate 2. PR (ii) native UI,
   done at merge. N3 renders `<OrbFab/>` in its own PR.
5. Wave 1b exit run (device checklist 3) when G1 is passed; result recorded in STATUS. Full duplex in the native app
   follows the server flag exactly — no client-side enablement; production stays half-duplex until the platform flips
   `ORB_FULL_DUPLEX_ENABLED` on its own evidence.
6. Rollback: revert the PR(s); no data, no server config touched. Native builds are dev/test-g1 only (no store build).

## Out of scope (where it goes)
- N6e (own sparred plan): reconnect/continuity (`/orb/session/continuity` writes), guided-topic / journey-focus /
  support-report start fields, prewarm WS + `prewarm` message, anonymous pre-login sessions and sign-up nudge, alert
  MP3 clips, latency beacon, chat-tts text mode, `commerce_setup_*`, `link` UI, `video` / `text` messages, camera.
- Any gateway change (protocol, origin, auth, full-duplex flag); `ORB_FULL_DUPLEX_ENABLED` in production.
- Background audio / lock-screen sessions, CallKit, CarPlay/Android Auto.
- Store builds, signing (G3), push (G2), the bottom-bar shell itself (N3), native screens the directives open (lanes).
- What's New entry (not a finished member feature until the public native release).

<!-- plan:end -->
