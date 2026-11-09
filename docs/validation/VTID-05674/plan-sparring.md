# VTID-05674 — plan sparring record

Verdict: CONVERGED (2 rounds; round 1: two majors, fixed; round 2: no blocker or major).
Plan hash: sha256:da0c43ff0fd7439054c1b404abdde19df09ad56104bcdb92237c33c9fb6d0137 (SHA-256 of the text between the plan markers; computed locally).
Approval: owner approval (Gate 1 yes), 2026-11-09.

# Plan: "+ Neu" on the Gruppen tab opens group creation (native app)

Change class: standard (apps/mobile is outside the frontend-simple class: src/** and public/** only).

<!-- plan:begin -->
## Intent
On the Gruppen tab, the "+ Neu" button must open the group-creation sheet directly. Today it opens the one-to-one sheet, and group mode only appears after a second person is picked, which makes group creation hard to find.

## Changes (apps/mobile)
1. src/screens/inbox/InboxScreen.tsx: pass `startAsGroup={filter === 'groups' && context === 'global'}` to NewConversationSheet (F1: tenant group creation is blocked, so group mode is only offered where it works). The existing "+ Neu" (testID inbox-new) and the empty-state "new message" keep their current behaviour on the other tabs.
2. src/screens/inbox/NewConversationSheet.tsx: new optional prop `startAsGroup` (default false).
   - When `startAsGroup` is true, the sheet opens in group mode: title "group", a group-name field, members picker.
   - The auto-toggle effect (selected.length > 1 -> group, <= 1 -> direct) is skipped while `startAsGroup` is true.
   - `reset()` returns to `startAsGroup` instead of always false.
   - Mechanism (F2): a `useEffect` on `[open, startAsGroup]` sets `groupMode = !!startAsGroup` whenever the sheet opens. The auto-toggle effect is skipped when `startAsGroup` is true. This keeps stale state from a previous open out of the next one.
   - Submit stays disabled until a name is entered and at least one member is selected (existing rule in `start()`).
3. tests/inbox-chat/inbox-list/new-conversation.test.tsx: add cases: (a) startAsGroup opens in group mode with no members; (b) one member plus a name creates a group (no second member needed); (c) without startAsGroup the existing one-to-one behaviour is unchanged.

## Verified premises (to check)
- createGlobalGroup(... memberIds) in apps/mobile/src/screens/inbox/data/directory.ts:79 accepts a single other member (creator plus one). No minimum (verified in round 1).
- Group creation with exactly one other member is intentional (F3): a 2-person group is valid.
- The group-name field starts empty in group mode; no prefill (F5).
- No other caller depends on groupMode starting false.

## Test plan
- apps/mobile jest tests for the sheet (new-conversation.test.tsx).
- Device check on the Android test phone: Gruppen tab -> + Neu -> name + one member -> group appears in Gruppen.

## Round 1 responses
- F1 (major, tenant context): ACCEPTED. startAsGroup gated on context === 'global'.
- F2 (major, stale groupMode across opens): ACCEPTED. useEffect on [open, startAsGroup] sets groupMode; the auto-toggle effect is skipped in startAsGroup mode.
- F3 (minor, single member): ACCEPTED as intentional; the server side is checked in the test plan.
- F4 (minor, wrong file reference): ACCEPTED; the correct file is apps/mobile/src/screens/inbox/data/directory.ts.
- F5 (minor, group name prefill): ACCEPTED; the name starts empty.

## Risks
- Creating a group with one other member may be rejected server-side (check the createGroup data path).
- Direct-chat behaviour on the other tabs must not change.
<!-- plan:end -->

