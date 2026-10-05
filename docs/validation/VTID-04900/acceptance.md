# VTID-04900 — no What's New card promises an inactive VTNA reward

AC-1 The unpublished VTID-04878 "More ways to earn VTNA" entry is removed; it promised Autopilot, live-room and Vitana Index earnings, none of which pays in production.
TEST: src/whats-new/inactive-rewards.vtid-04900.test.ts — "the VTID-04878 "More ways to earn VTNA" card is gone"

AC-2 No entry pairs VTNA earning with a paused reward; re-announcing needs a new entry and a deliberate guard update.
TEST: src/whats-new/inactive-rewards.vtid-04900.test.ts — "no entry pairs VTNA earning…", "the guard itself catches the removed wording"

AC-3 The manifest still builds and validates.
TEST: src/whats-new/whats-new.test.ts; `npm run whats-new` → 4 entries
