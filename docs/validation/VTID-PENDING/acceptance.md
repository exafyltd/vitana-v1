# VTID-PENDING — acceptance (news-feed-post-action-row / card-actions)

Owner request 2026-11-19: the heart, comment and send controls on News Feed posts look crowded and sit too close to
the author. Plan: vitana-platform `.kiro/specs/news-feed-post-action-row/` (plan PR exafyltd/vitana-platform#5120).
Base: vitana-v1 origin/main `bbe90b71373e76b18e3a93e22db17b6953c0a183`. `VTID-PENDING` is renamed to the issued VTID
before the branch is pushed.

## AC-1 Author and actions on separate rows
The author row holds avatar, name and the ⋮ menu and no action control; the action row below holds like, comment, send
and the "{count} Likes" link; the author row comes first.
TEST: `npx vitest run src/components/home/CommunityPostCard.test.tsx` — "puts the author on its own row and like, comment, send and the likes count on a separate row below it" (red on base, green here)
UI: `tests/e2e/staging/vtid-pending-news-feed-post-action-row.staging.spec.ts` at 390x844 and 1400x900

## AC-2 Behaviour unchanged
Heart toggles the like optimistically and rolls back on error; comment opens the inline comments; send opens the
send-in-message sheet; the Likes link opens the likers dialog; ⋮ opens the same moderation menu.
TEST: `npx vitest run src/components/home` — 5 files, 42 tests (counts, optimistic like, rollback, comments, replies, likers dialog, auto-open)
UI: local harness `outputs/harness-interactions.txt` (heart 7→8, comment box, send sheet, likers dialog, menu; phone, desktop, RTL)

## AC-3 States
0 likes: no Likes link; a 50-character author name truncates on the author row; 128 / 42 counts fit; a
media_uploads-backed card shows no send button.
TEST: `npx vitest run src/components/home/CommunityPostCard.test.tsx` — "renders no likes row … when nobody has liked yet"
UI: `screenshots/after-mobile-390.png`, `screenshots/after-desktop-1400.png` (three cards: image post 7/3, long name 128/42, 0/0)

## AC-4 Tap targets, RTL, no overflow
Each control at least 44 px high (like and comment 58x44, send 44x44, Likes 39x44 measured at 390x844); logical
properties only, so Arabic mirrors; no horizontal scroll.
UI: `tests/e2e/staging/vtid-pending-news-feed-post-action-row.staging.spec.ts` (min height 44, overflow 0), `screenshots/after-mobile-rtl-2-comments-open.png`

## AC-5 Read-only staging proof
The staging spec signs in through the token call only, never likes, comments, sends or chooses a menu item; the guard
aborts every other write. Skipped, not failed, when the feed has no post card.
UI: `tests/e2e/staging/vtid-pending-news-feed-post-action-row.staging.spec.ts`

## Not changed
Strings, hooks, handlers, aria labels, data, `FocusStageCard` (desktop Spotlight stage), the native app.
