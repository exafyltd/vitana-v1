# VTID-05732 plan (draft for sparring)

Change class: sparred (touches apps/mobile, so not frontend-simple). scope.json omits change_class.

<!-- plan:begin -->
## Goal
The web chat (the component rendered in the Appilix app and the mobile web preview) reserved a 32px avatar
column for every bubble, including direct threads where avatars are hidden (VTID-05584). That empty column
pushed both sides off their edges. Direct threads should sit flush left (incoming) and right (own), as in
WhatsApp and Viber. Group threads keep avatars (owner decision VTID-05584).

## Steps
1. `src/components/messages/MessageBubble.tsx`: render the avatar column (`w-8` wrapper) only when
   `showAvatar` is true. Direct threads already pass `showAvatar=false`, so no column is reserved there.
2. Revert PR #1661's native change: `git revert f2f6241` (commit 04bddac). It restores
   `apps/mobile/src/screens/chat/MessageBubble.tsx` and `apps/mobile/tests/inbox-chat/conversation-chat/bubble.test.tsx`
   to their pre-#1661 state. #1661 had removed avatars in native group chats too, which contradicts VTID-05584.
   Verified: `git diff f2f6241^ HEAD -- apps/mobile` is empty.
3. Verification run before this plan: `npx vitest run src/components/messages` (32 files, 252 tests pass);
   `npx tsc --noEmit -p tsconfig.app.json` (no errors in MessageBubble.tsx); ESLint on MessageBubble.tsx shows
   the same 19 pre-existing problems as main. On the PR preview (CloudFront, pr-1665) the owner confirmed the
   direct-thread layout visually.

## Files in scope
- src/components/messages/MessageBubble.tsx (web, change)
- apps/mobile/src/screens/chat/MessageBubble.tsx (revert of #1661)
- apps/mobile/tests/inbox-chat/conversation-chat/bubble.test.tsx (revert of #1661)

## Test plan
- Web: vitest src/components/messages (must stay green); preview check on direct thread (done, owner confirmed).
- Native: `npx jest tests/inbox-chat/conversation-chat/bubble` and `npx tsc --noEmit` in apps/mobile after the revert.
- Render test (round 1 F3): add a Vitest case that renders MessageBubble with showAvatar=false and asserts no avatar column.
- Staging suite: docs/validation/VTID-05732/staging-tests.json asserting the direct-thread layout on the staging build.

## Scope note on native (round 1 F2)
The native MessageBubble keeps its 32px avatar column in direct threads after the revert, because the revert restores its
pre-#1661 state. That gap is out of scope here and tracked as a follow-up VTID for a native showAvatar prop.

## Risks / open questions
- Group-chat avatar behaviour must stay unchanged on web.
- The revert removes the avatar from native bubbles in group chats (the #1661 side effect); restoring pre-#1661
  is the intent, so group avatars return on native.
<!-- plan:end -->

## Planner responses (round 1)
- F1 (change_class 'light' does not exist) — ACCEPTED. Plan header now reads 'sparred'; scope.json omits change_class.
- F2 (native direct-thread indent) — ACCEPTED as a known limitation. Not fixed here; follow-up VTID to add a showAvatar prop to native MessageBubble.
- F3 (no render test for showAvatar=false) — ACCEPTED. Added to test plan.
- Q1 — Appilix uses the web component; native follow-up tracked as above.
- Q2 — Verified: `git show --stat f2f6241` lists only apps/mobile/src/screens/chat/MessageBubble.tsx and apps/mobile/tests/inbox-chat/conversation-chat/bubble.test.tsx. The revert touches nothing else.
- Q3 — Confirmed: scope.json omits change_class.

## Approval (Gate 1)
- Owner approval: "YES, GO AHEAD AND BRING IT TO STAGING", given in chat on 2026-11-11 after the converged verdict (round 2).
- Plan hash (sha256 of the text between the plan markers): a26627446a6a1875af3e2622900551667d9e7efc0833effd50a1f4e90424f857
- Verdict: converged after round 2. The partner's round-2 report confirms no open or disputed blocker or major.
- Process note: VTID-05732 was allocated (via allocate_global_vtid, 2026-11-11) before the plan was sparred. Recorded here as a deviation from CLAUDE.md rule 51.
