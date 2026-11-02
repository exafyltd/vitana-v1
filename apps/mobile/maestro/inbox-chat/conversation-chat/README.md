# Maestro — inbox-chat / conversation-chat (VTID-05458)

Deferred to G1 (`next_actor: owner`, requirements R5.3, tasks.md conversation-chat task 7).
No flow is committed yet: every flow needs the isolated G1 environment (test accounts,
iOS simulator + Android emulator, two devices for a call). They are listed with their
targets and limits in `docs/validation/VTID-05458/staging-tests.json` → `deferred_g1`:

1. `01-dm-read.yaml` — open an existing DM and read it (never type or send).
2. `02-group-read.yaml` — open an existing group and read it (never send).
3. `03-deeplinks.yaml` — cold-start the `/msg/` and `/t/` deep links; the target is centred and highlighted.
4. `04-live-realtime-call.yaml` — two G1 test sessions: presence, typing, the live stream and a real
   1:1 WebRTC call through the react-native-webrtc engine (`src/ports/webrtc.ts`, a G1 dev-client build).

Never run against production or staging; the native app has no production profile.
