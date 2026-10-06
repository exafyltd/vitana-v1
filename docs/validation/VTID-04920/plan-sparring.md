# Plan: Events Live Room card polish — info pills on one row, CTA clear of the Orb (vitana-v1)

Change class: **light** (one source file, one test; no migrations, routes, auth, .github, deploy, governance or LLM-routing files).
Owner request (2026-10-06, chat, with a phone screenshot of production): "place these tags in one row. Also this Notifying CTA button is being cut off by the Orb, so it doesn't look clean."

<!-- plan:begin -->
## Context (verified by the planner)
- `src/components/liverooms/LiveRoomEventCard.tsx` (shipped in VTID-04913) renders four separate info pills in a `flex flex-wrap gap-2` row: date, time, duration, "X going". On a 390px phone they wrap to two rows (date+time, then duration+going).
- The content block is `relative z-10 mt-auto flex flex-col gap-3 p-5 pt-20`, so the CTA row sits 20px above the card bottom. In the Events carousel (`MobileEventCarousel.tsx`, item height `calc(100dvh - 190px)`) the card bottom is flush with the bottom nav, and the floating Orb protrudes about 30px above the nav in the horizontal centre, covering the lower half of the full-width CTA ("Notifying" / "Notify me" / "Join").

## Change
1. Merge date and time into ONE pill using ONE NEW i18n key `screens.liverooms.dateTimeChip` — DE first (`"{date} · {time} Uhr"`), then EN (`"{date} · {time}"`), the i18n bot / `translate-keys` fans the other locales out — so translators control order, separator and any "Uhr"/prefix, RTL included. The existing `timeChip` stays for the Live Rooms page card. The row becomes date·time, duration, going — three pills.
2. The pills row is `flex-nowrap` with `whitespace-nowrap`, tighter padding (`px-2.5 py-1`) and `text-xs`, and `overflow-x-auto` with hidden scrollbar as a safety net so a long locale can never wrap or push the layout; the interested-people button stays a button.
3. Lift the CTA clear of the Orb on phones: bottom padding of the content block `pb-16` below `md` (`pb-16`, 64px > Orb overhang ~30px + margin; the carousel item is flush with the bottom nav, which owns the safe-area inset itself), `md:pb-5` as today for desktop where the grid has no bottom nav overlap.
4. Keep every test id, handler, i18n key and behaviour; no change to Live Rooms page card, share, subscriptions.
5. Tests: extend the existing `InterestedPeopleSheet.vtid-04912.test.tsx`/`EventLiveRoomCard.vtid-04913.test.tsx` style with a Vitest on `LiveRoomEventCard` asserting date+time are in one element, the pills container is `flex-nowrap`, and the content block has the mobile bottom padding class (class presence only — the layout itself is checked visually on the PR preview and by the existing staging overflow check); the staging spec VTID-04906-04907 needs no change.

## Out of scope
Orb behaviour or position, other event cards, desktop layout beyond the unchanged `md:` padding. Tracked follow-up debt: the Live Rooms page card (`LiveRoomCard`/`MobileLiveRoomCarousel`) keeps separate date and time pills, so the two cards differ slightly.
<!-- plan:end -->

## Planner responses — round 1
- F1 ACCEPTED. One new key `screens.liverooms.dateTimeChip` (translator-controlled order/separator); no hardcoded `·` in code.
- F2 ACCEPTED. The "no new strings" claim is withdrawn; DE-first, then EN, then fan-out by the repo's i18n pipeline (the Calendar-vcal marker issue is already handled).
- F3 ACCEPTED in part. The carousel item sits flush with the bottom nav, which handles the safe-area inset itself, so the Orb overhang (~30px) is the only thing to clear; padding raised to `pb-16` (64px) for margin. Verified visually on the PR preview at 390x844 before merge.
- F4 ACKNOWLEDGED. Class-presence tests are a guard, not proof; visual proof is the PR-preview screenshot at 390x844, in English and German.
- F5 ACCEPTED as tracked follow-up debt (added to Out of scope).
- Q1: the combined pill is now translator-controlled, so RTL order is a catalog matter; checked visually in `ar` on the preview.
- Q2: see F3. Q3: four pills do not fit in German at 390px (approx. 395px of content vs ~350px available), so the merge stands, now with its own key.
