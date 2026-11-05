# Maestro — inbox-list lane (VTID-05459) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native inbox list port (`/inbox`, `/inbox/archived`,
`/inbox/inspiration`). These flows are **not run in CI** and are **not a merge
blocker** (requirements R5.3, tasks.md inbox-list task 7). They need the isolated
G1 test environment (and macOS minutes / G3 for iOS on a device). Recorded here
and in `docs/validation/VTID-05459/staging-tests.json`.

Parity reference: the mobile-web branch of `src/pages/Messages.tsx`
(`useIsMobile()`), and the phone layouts of `src/pages/messages/Archived.tsx` and
`Inspiration.tsx`, against the 390×844 **read-only** staging web pages.

Flows (to author on G1; sign in, navigate, read — never send, never mark read):

- `01-inbox-list.yaml` — `/inbox`: header, Search, Community / Network pill, New,
  All / Direct / Groups pills, the overflow menu (opened and dismissed), cards
  with unread badges; screenshot parity.
- `02-inbox-new-sheet.yaml` — open the New sheet, search a member; the G1
  directory holds a service bot and a test actor and neither appears (NEVER
  rule 45); the sheet is dismissed (no conversation or group is created).
- `03-archived-inspiration.yaml` — `/inbox/archived` and `/inbox/inspiration`:
  sub-navigation, tabs, the static content; screenshot parity.
- `04-unread-realtime.yaml` — **G1 environment only, never a live system**: a DM
  from a second G1 test member bumps its row and the bottom-bar badge.
- `05-find-friends.yaml` — **G1 simulator / emulator with a seeded test address
  book only**: Contacts → Find Friends, the OS contacts prompt shows the catalog
  usage string, the import reaches the G1 gateway and the results list the G1
  test members; never a real address book, never a live system.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/inbox-chat/inbox-list/` (fake gateway, Supabase double, mocked
realtime) and the typecheck / bundle / deps / parity gates.
