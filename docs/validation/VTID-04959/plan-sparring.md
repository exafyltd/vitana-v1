# Plan sparring record — VTID-04959

- Change class: light (3 source files + 11 i18n shards)
- Plan hash (sha256 of text between plan markers): 24f247ab5554ae9a8218e61ef34a8264d2f3519cfee143521de7f0b5990c4a63
- Partner: plan-sparring-partner, 2 passes
- Round 1: 2 major (F1 GroupAvatarStack `-space-x-1`/`ml-0` break RTL; F2 reuse ThreadParticipant + helpers from conversationHelpers.ts), 4 minor (F3 scope file count; F4 long auto-names in the placeholder; F5 clickable div not a button; F6 staging spec needs a group). Verdict NOT CONVERGED.
- Round 2: F1–F6 and Q3 closed. No new findings. Verdict **CONVERGED**.
- Owner approval: "Yes both" in chat (2026-10-07), recorded as the Gate 1 yes (VTID-04947), together with VTID-04960.

## Decisions taken during implementation
- **The members panel opened BEHIND the phone chat** (found in the screenshot step): the mobile chat is a fixed `z-[55]` layer and `GroupMembersModal` used the default `z-50`, so tapping the header opened the panel invisibly — the likely reason for "I can't edit anything". `GroupMembersModal` now uses `z-[60]` (same as `CreateGroupPopup`). Inside the plan's goal ("opens the same GroupMembersModal" must be usable); the staging spec checks the panel is on top (`elementFromPoint`).
- A long group name made the panel's content 94 px wider than the panel on a phone (title and "Leave Group" clipped). The two title rows got `min-w-0`/`truncate`; the spec checks `scrollWidth <= clientWidth`.
- The cut group name in the placeholder gets no own "…" (the catalog string ends with one; it showed "……").

# Plan: group chat header — visible edit button, real avatars, group composer text

Change class: light (≤3 source files + i18n strings; no migration, route, auth, workflow)
Scope: vitana-v1 `src/components/messages/ConversationView.tsx`, `src/components/messages/GroupAvatarStack.tsx`, `src/utils/conversationHelpers.ts` (placeholder helper), 11 shards `src/i18n/<locale>/screens.json`, Vitest specs, a staging spec + `docs/validation/<VTID>/`.

<!-- plan:begin -->
## Owner report (2026-10-07 17:39 local, Android, after VTID-04955 shipped)
Screenshot of the group "Husam Katiela, Stefa…": "I can't edit anything". Header shows "? ? ? +2" avatars, "5 members"; composer says "Message Stefan...".

## Verified facts
- The owner IS the creator: `global_message_threads.created_by` = owner's user id, their participant role = admin (DB read). The rename pencil exists (VTID-04955) but only inside `GroupMembersModal`, opened solely by tapping the header avatars/title (`ConversationView.tsx` ~L949-972). Nothing visible says the header is tappable → the owner never found it.
- `GroupAvatarStack` (L44-62) reads `participant.profile.display_name|full_name|avatar_url`; legacy group threads give participants `display_name`/`avatar_url` at the top level (`useGlobalMessages.fetchLegacyThreads` enrichedParticipants) → every avatar falls back to "?".
- Composer placeholder (`ConversationView.tsx` L1217) is a hardcoded English template `Message ${firstName of the other participant}...` — for a group it names one member ("Stefan"), and it violates the i18n rule.

## Change
1. Group chat header: the avatars+title area becomes a real `<button type="button">` with `aria-label` (keyboard + screen-reader reachable), and a visible button at the end of the header row (icon `Settings2` + text "Gruppe bearbeiten"/"Edit group" on ≥sm, icon-only with aria-label on phones) shown when `isGroupChat()`; opens the same `GroupMembersModal`. Title/avatars stay tappable. Logical properties only (RTL).
2. `GroupAvatarStack`: use the existing `ThreadParticipant` type and `getParticipantDisplayName` / avatar helper from `src/utils/conversationHelpers.ts` (L6-16, L50-61), which already fall back from `profile.*` to top-level `display_name`/`avatar_url`; drop the local `Participant` type. RTL: overlap via `-space-x-1 rtl:space-x-reverse`; `ml-0` removed.
3. Composer placeholder from i18n, built by a pure helper `composerPlaceholder(thread, me, t)` in `conversationHelpers.ts`: group → `screens.messages.messageGroupPlaceholder` "Nachricht an {name}…" with the group name truncated to 30 characters + "…" (auto-names can list many members); direct → `screens.messages.messagePersonPlaceholder` "Nachricht an {name}…" with the first name (same text shape as today, now translated). 11 locales, DE first, du-form.
4. No data, policy or route change. No What's New (fix).

## Tests
5. Vitest: GroupAvatarStack renders initials from top-level display_name (and still from profile); ConversationView-independent helper for the placeholder (group → group name, direct → first name) — extracted as a small pure function to test.
5b. Vitest render of `GroupAvatarStack` under `dir=rtl` (class check).
6. Read-only staging spec (phone viewport): the test user is in no legacy group (verified: 0 rows) and creating one would be a production write, so the spec answers the inbox's own GET reads for legacy threads/participants/messages INSIDE the browser (page.route → fulfill) with one made-up group (fake ids/names), opens it, and asserts on the deployed build: the "Gruppe bearbeiten" button is visible and opens the members panel; header avatars show initials, not "?"; the composer placeholder names the group, not one member. Writes are not expected; the guard is not widened.

## Release
PR → merge → staging → STAGING-VERIFY → Gate 2 with the commit range.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED: `-space-x-1 rtl:space-x-reverse`, `ml-0` removed; RTL class check in Vitest (5b).
- F2 ACCEPTED: reuse `ThreadParticipant` + helpers from conversationHelpers.ts (item 2).
- F3 ACCEPTED: scope lists conversationHelpers.ts and the 11 shards.
- F4 ACCEPTED: group name truncated to 30 chars + "…" in the placeholder (item 3).
- F5 ACCEPTED: avatars+title become a real button with aria-label (item 1).
- F6 ACCEPTED: verified the test user has 0 legacy groups; staging spec renders a made-up group by fulfilling the app's GET reads in the browser (item 6) — no production write.
- Q3: Tailwind `rtl:space-x-reverse` (supported in v3 via the rtl variant).
