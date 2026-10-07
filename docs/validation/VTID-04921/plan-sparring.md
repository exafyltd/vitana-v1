# Plan sparring record — VTID-04921

- Change class: light
- Plan hash (sha256 of text between plan markers): f3c754ca28a67939b27b995bf4c495a5b61720288a92fa813c5afa0ca00b3cd2
- Partner: plan-sparring-partner, 2 passes
- Round 1: 4 minor findings (F1 test location, F2 lazy images, F3 layout effect rationale, F4 stale deep-link ref), 0 blocker/major. Verdict CONVERGED.
- Round 2: F1-F4 and Q1 closed; no new findings. Verdict **CONVERGED**.
- Owner approval: given in chat ("YES, GO AHEAD") after the final plan and both rounds were shown.

# Plan: Group chat opens at the latest message (WhatsApp style)

Change class: light
Scope: vitana-v1 `src/pages/messages/GroupChat.tsx` (+ one Vitest spec under `src/pages/messages/__tests__/`)

<!-- plan:begin -->
## Problem
Opening a group chat (e.g. "Alle Beisammen") shows the oldest message, not the newest.

## Verified cause (src/pages/messages/GroupChat.tsx)
- Scroll-to-bottom effect (L192-195) depends only on `[messages.length, initialScrollMessageId]`.
- On open, messages load while `isLoading` is true; the component renders the loading screen (L305-316), so `streamEndRef` (L408) is null and the effect no-ops.
- When loading ends, the real list mounts but `messages.length` is unchanged, so the effect never re-runs. The scroll container `<main>` stays at scrollTop 0 = oldest message.
- Poll/realtime reloads keep the same length, so nothing ever corrects it.

## Change
1. Add `mainRef` on `<main>` and `didInitialScrollRef`, reset when `groupId` changes.
2. Replace the effect with a layout effect keyed on `[isLoading, group, messages.length, initialScrollMessageId]`:
   - Skip when loading, no group, or no messages, or a reaction deep-link `initialScrollMessageId` is present (deep-link effect keeps winning).
   - First time the list is rendered for this group: jump instantly (`mainRef.scrollTop = scrollHeight`, no animation), plus one `requestAnimationFrame` re-jump to absorb late layout (avatars/images).
   - Later length changes (new messages): keep existing smooth scroll to bottom.
3. No other behaviour change; no i18n strings, routes, API or DB changes.

## Tests
Vitest + Testing Library: render GroupChat with mocked `useChatApi`/supabase and N messages; assert `<main>.scrollTop` is set to its `scrollHeight` after loading finishes (jsdom: stub scrollHeight), and that a deep-link `messageId` does not trigger the bottom jump. Staging suite: read-only navigation spec not needed beyond existing smoke; runtime write-verification forbidden (production Supabase) so unit test is the proof.

## Out of scope
DM `ConversationView` (already has scrollToBottom logic), pagination of older history, unread-divider positioning.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED: test goes in `src/pages/messages/GroupChat.<vtid>.test.tsx` next to the existing `GroupChat.vtid-04901.test.tsx`; no new `__tests__/` dir.
- F2 DEFERRED (acknowledged, known limitation shared with ConversationView): single rAF re-jump only; a ResizeObserver follow-up is tracked only if drift is reported. Noted in PR description.
- F3 ACCEPTED: layout effect is used so the first paint is already at the bottom (no flash of the oldest message). The new-message branch uses `behavior: "smooth"`, which is async and non-blocking, so it is safe in the same effect.
- F4 ACCEPTED (tiny, same file): `hasScrolledToTargetRef` is reset together with `didInitialScrollRef` on `groupId` change.
- Q1: Agreed; the fix does not depend on batching. Keyed on `isLoading`/`group`, it is correct either way.
