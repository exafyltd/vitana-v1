# Plan sparring record: web one-row group composer (PR #1618)

Plan hash (sha256 of the text between the plan markers): f4fb8a0f7755cf196a1615eaa7a500aa2b42db8fa7e788b4812c54d49360d817

Sparring partner: independent plan-sparring-partner agent, read-only, two passes.
Verdict: CONVERGED after round 2.
Owner approval (Gate 1): "Yes get it done." in the Claude Code session, after the final plan was sent.

## Final plan

# Plan: one-row group composer on the web Messenger (PR exafyltd/vitana-v1#1618)

Change class: light (2 files; no migrations, routes, auth, .github, deploy, governance or LLM-routing files)
Scope: src/components/messages/MessageInput.tsx (change) and src/components/messages/MessageInput.group-one-row.test.tsx (new test)

<!-- plan:begin -->
## Problem
On the web Messenger the message composer (src/components/messages/MessageInput.tsx) auto-resizes up to 6 rows
(maxHeight = 24 * 6). A long typed message in a GROUP chat grows the composer to six lines and pushes the message
list up. The owner wants group composers to stay on one row whatever the message length; direct chats keep 6 rows.

## Change
1. In the auto-resize useEffect, compute maxHeight from conversationType:
   - group ('group'): 24 + 16 = 40px (one line plus the textarea's py-2 padding, which scrollHeight includes)
   - otherwise: 24 * 6 = 144px (unchanged)
2. Add conversationType to the effect's dependency list (it is read inside the effect).
Nothing else changes. No new strings, no new classes, no tokens, no API or data change.

## Side effect (known, intended)
The effect also writes the global CSS variable --composer-h (used by ConversationView.tsx:1307 and :1510 for the
message list's bottom padding and the scroll-to-latest button on mobile). For group composers with long drafts the
value now stays at its one-row height, so the message list keeps more room. Typical one-line drafts are unchanged.

## Test plan
- NEW automated test (answers F1): src/components/messages/MessageInput.group-one-row.test.tsx. Stubs scrollHeight to a
  long wrapped message (7 x 24 + 16). Asserts a group composer's textarea is 40px with overflow auto and --composer-h
  72px; a direct composer is 144px and --composer-h 176px. Verified: passes on the change, fails with the cap reverted
  (expected '144px' to be '40px').
- Existing: src/components/messages/MessageInput.*.test.tsx (4 files) and src/utils/conversationHelpers.vtid-04959.test.ts.
- Full web suite (npx vitest run): 494 files / 3972 tests passed on the branch before the new test was added.
- Measured in a headless browser against a production build, network answered from fixtures: a long typed group
  message -> textarea box 40px, line-height 24px, padding 8px top and bottom, scrollHeight 160, scrollTop 110 (before: 144px).

## Visual observation (answers F2)
The box is one 24px line of content. The two lines seen in the screenshot are slivers: with overflow auto the text is
clipped at the padding box, so the 8px top and bottom padding can show the tops and bottoms of the neighbouring lines
when the scroll offset is not aligned to a line. This is visual only; the textarea is one row. Clean single-line look
(no slivers) would need a different padding model for group composers; that is a separate change, not in this plan.

## Pre-existing, documented (answers the --composer-h question)
--composer-h is written on every resize and is never reset on unmount. That is the existing behaviour and is not changed
here. Navigating away leaves the last value on :root; the CSS default (112px, src/index.css:47) is not restored.

- Not verified: inside the Appilix wrapper on a device; the mobile wrapper's scaling is unknown to this plan.

## Out of scope
- The placeholder group-name cut (30 chars, VTID-04959 test) is unchanged.
- The bottom safe-area gap in the group footer (GroupChat.tsx) is not changed; not reproduced in desktop Chrome.
<!-- plan:end -->

## Round 1 (partner findings)

- F1 [major] No automated test for the one-row group constraint. Closed: test added, MessageInput.group-one-row.test.tsx.
- F2 [minor] Two-line observation. Closed: explained as padding-box slivers; sliver-free look is out of scope.
- F3 [minor] Scope said 1 file. Closed: header now says 2 files.
- Q1 --composer-h not reset on unmount. Closed: pre-existing, documented.
- Q2 Appilix / device scaling. Closed: not verified on device, recorded.

## Round 2

All round-1 items closed. No new blocker or major. Verdict: CONVERGED.
