# VTID-05320 ui-send-status — reload-seed date was a time bomb (fix-forward)

The two `reload` / `review fixes` cases in
`src/hooks/useGlobalMessages.send-status.vtid-05320.test.tsx` seeded the outbox
with `created_at: '2026-10-21T10:00:00.000Z'`. `loadOutbox` prunes items older
than `OUTBOX_MAX_AGE_MS` (7 days), so from 2026-10-28 on the seeded item is
dropped on load, the reload re-post has nothing to send, and both cases fail
(`expected [] to deeply equal [...]`, sendChatMessage called 0×). It passed in
CI until 7 days after 2026-10-21, then `Vitest (jsdom)` went red on `main`
(first seen on commit 5bc8d10cd); it is also the VTID-05320 STAGING-VERIFY
change suite, so staging could not be verified.

Fix: seed with recent relative timestamps (RECENT_1 / RECENT_2, now − 120 s /
119 s, order preserved). No product code changed.

- base (origin/main 1349f6991): the two cases fail (3/3 runs).
- head: `npx vitest run src/hooks/useGlobalMessages.send-status.vtid-05320.test.tsx` → 17 passed (3/3 runs).
- `npx vitest run src/hooks src/components/messages src/pages/messages` → 114 files / 661 tests passed.
