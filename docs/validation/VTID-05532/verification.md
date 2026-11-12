# VTID-05532 — native live rooms port (native-wave2-events-calendar-r3/live-rooms)

Lane spec: `.kiro/specs/native-wave2-events-calendar-r3/lanes/live-rooms.md` on `origin/kiro/native-wave2-events-calendar-r3/plan`
(vitana-platform). The lane spec's `vtid: VTID-05532`, and `handoff.md` lists VTID-05530 to 05532 for the three lanes. The
per-lane binding is taken from the lane file (calendar-reminders is 05530, events-meetups 05531).

## What the lane ports
| Web destination | Native route file | Screen |
|---|---|---|
| `/comm/live-rooms` (+ `?tab=all\|live\|scheduled\|past`) | `apps/mobile/app/(app)/comm/live-rooms/index.tsx` | `src/screens/liverooms/LiveRoomsScreen.tsx` |
| `/comm/live-rooms/:roomId/view` | `apps/mobile/app/(app)/comm/live-rooms/[roomId]/view.tsx` | `src/screens/liverooms/LiveRoomViewerScreen.tsx` |

- List: the four tabs with counts, search, room cards (LIVE pillar, host, when and length, count, the state's action), the
  per-tab loaded / empty / error states, the Past rows with a replay link when a recording is ready.
- Drawer (`RoomDrawer.tsx`, the mobile `LiveRoomDrawer`): host (opens the profile), people count with the first faces of the
  people who tapped Notify me, when with the local / UTC toggle and a countdown under two hours, description, rules, and the
  action bar for the room's state and the viewer's role.
- Viewer: host detection from `live_rooms.host_user_id`, room state polled every 5 s while live or in the lobby, the enter
  (token fetch) error copy, the ended panel, host end-for-everyone behind a confirmation, host presence and exit signals.
- Data: the web's own PostgREST tables, columns, filters and RPC names (`community_live_streams`, `live_stream_subscribers`,
  `get_live_stream_subscriber_counts`, `get_live_stream_subscribers`, `profiles`, `stream_recordings`, `live_rooms`), and the
  gateway calls of `liveRoomService` (`state`, `enter`, `exit`, `host-present`, `host-absent`, `end`).

## Decisions
1. No `@vitana/core` change. Both candidate helpers (`liveRoomFormat.ts`, `adapters/liveRoom.ts`) are class C because they
   reach `src/lib/i18n-toast.ts` (sonner, `import.meta.env`) and `src/lib/locale-format.ts`. The spec's rule is to re-implement
   such helpers natively, which `data/rules.ts` and `format.ts` do. `closure.generated.json` and
   `mobile-ci-paths.generated.json` are unchanged.
2. No new i18n shard. All 170 catalog keys the lane renders exist in all 11 locales (checked by `tests/liverooms/lane-guards`).
   Per R2.4 the lane reuses them and adds none.
3. Video join behind a port (`src/ports/live-room-video.ts`). The Daily.co SDK is not a dependency of `apps/mobile`, and
   `apps/mobile/package.json` is outside this lane's paths. This build registers no engine, so the viewer shows "video
   unavailable", disables Enter, and never calls the gateway's `enter` (which records attendance). Tests register a fake
   surface. The real join is a G1 owner step.
4. Dates and times use `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` with the member's locale, the same approach the home
   lane takes for relative time. The `@/lib/locale-format` helpers are not reachable from the native app (decision 1).

## Not ported in this lane (named so the reviewer can check them)
- Go Live creation, the edit-session dialog, the host's delete action, and the autopilot popup. They are not in the lane spec's
  source list.
- Calendar export menu, save bookmark, share buttons, and the interested-people list sheet. The drawer shows the people count and
  faces only.
- `src/components/events/EventsLiveRooms.tsx`. It renders live rooms inside the events hub, which the events-meetups lane ports.
  The lane spec lists it under live-rooms, so an owner decision is needed on which lane owns the room-in-events card.
- Desktop Spotlight branch (desktop only; the lane is the phone branch).
- Replay: a ready recording opens its `recording_url` through `Linking`; there is no native player.
- Maestro flows and simulator screenshots (`apps/mobile/maestro/liverooms/**`): G1.

## Tests (apps/mobile/tests/liverooms, fixture and fake-gateway; no network)
- `rules.test.ts` (17): staleness and due rules, room mapping, time order, search filter, duration and when labels, gateway error codes.
- `rooms-list.test.tsx` (9): loaded / tab filter / deep-linked tab / empty per tab / error / search; notify me writes the row;
  drawer open and dismiss; the drawer's interested-people count.
- `viewer.test.tsx` (6): host detection, room-state mapping (live, ended), the enter error copy, the video-engine gate, host presence
  and exit signals (with the fake surface).
- `lane-guards.test.ts` (7): the two route files exist; both routes resolve as native; no physical left/right; no raw
  `toLocale*` or `date-fns` import; no `@daily-co/` import; every `t()` key the lane uses exists in all 11 locales.
- Red first: `red-on-base.txt` (4 suites failed on base). Green after the implementation: 39 / 39, run twice at default workers.

## Verification
See `commands.log`. Summary: typecheck green; lane tests 39/39 (twice); full `npm test` 4039/4039 on the final tree;
bundle green; `deps:check` green; `parity:check` green (435 rows, 72 native routes); `core-closure --check` green (unchanged);
ESLint clean on the lane files.

**Not verified on staging: device runtime and the Daily.co join are deferred to G1 (owner).** No staging, production or live call
was made.

## Lane scope note
`lane file not found` on the PR's Lane scope check is expected until the plan merges to `main`: the lane spec exists only on
`kiro/native-wave2-events-calendar-r3/plan`.
