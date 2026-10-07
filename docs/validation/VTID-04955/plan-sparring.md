# Plan sparring record — VTID-04955

- Change class: standard (frontend + one additive RLS policy migration)
- Plan hash (sha256 of text between plan markers): a91cae59927aee00c706adaf9207306957de7d11e8eabdc9b14de5355ec902f1
- Partner: plan-sparring-partner, 2 passes
- Round 1: 3 major (F1 leave notice falls back to email; F2 members list shows member emails; F3 0-row detection needs `.select('id')`), 5 minor (F4 rename 0-row wording, F5 "no new strings" scope, F6 list all four notice writers, F7 RTL, F8 verify apply-workflow pattern), Q3 (how old notices hide the email). Verdict NOT CONVERGED.
- Round 2: F1–F8 and Q3 closed (Q3: MessageBubble has `message.sender` — fetchLegacyMessages enriches it — so old notices render the actor's name; known types never render `body`). No new findings. Verdict **CONVERGED**.
- Owner approval: "Yes, go ahead and deploy to production" in chat (2026-10-07), recorded as the Gate 1 yes (VTID-04947 autonomy contract).

## Decisions taken during implementation
- `global_community_profiles` has no `full_name`/`email` columns; the members panel's profile query asked for them and failed, so every member showed "Unknown". The global query now selects `display_name, avatar_url` (in scope: "members editable").
- Plan item 5 ("No email anywhere in group surfaces"): the search results of both group dialogs also printed other members' emails; removed.
- SQL test check 5 uses another member's row: a member's OWN participant row can already be moved to any thread by the pre-existing own-row UPDATE policy (and any user can INSERT themselves into any thread). Pre-existing, unchanged, reported to the owner as a follow-up.

# Plan: Messenger groups — name visible on create, title + members editable, no email in system notices

Change class: standard (frontend + one additive RLS policy migration)
Scope:
- vitana-v1 `src/components/NewConversationPopup.tsx`, `src/components/messages/CreateGroupPopup.tsx` (dialog scroll)
- vitana-v1 `src/pages/Messages.tsx` (`handleGroupCreated`)
- vitana-v1 `src/components/messages/GroupMembersModal.tsx` (rename, system notice bodies), `src/components/messages/MessageBubble.tsx` (system notice rendering, L886-893)
- vitana-v1 `src/lib/messaging/createGlobalGroupThread.ts` (system notice body)
- vitana-v1 `src/i18n/<locale>/*.json` (new strings, DE first), `docs/SCREEN_INVENTORY.md`
- vitana-v1 `supabase/migrations/<ts>_vtid_xxxxx_group_admin_manage_participants.sql` + `.github/workflows/apply-vtid-xxxxx-...yml`
- tests: Vitest + read-only staging spec + `docs/validation/<VTID>/`

<!-- plan:begin -->
## Owner report (2026-10-07 15:51 local, Android, after VTID-04936 shipped)
Group created (thread 713466fa…, 5 participants) but: (a) "I could not give the group a title"; (b) the chat header says "Conversation"; (c) no way to edit title or members; (d) the notice reads "dstevanovic@hotmail.com created the group" — the owner's email shown to every member.

## Verified facts
- (a) `NewConversationPopup` auto-switches to group mode at 2 recipients and prefills `groupName` with the first names (L88-99) — stored name "Husam Katiela, Stefan Ehlke". The name `<Input id="groupName">` is the FIRST field; `DialogContent className="sm:max-w-md"` has no max-height/overflow, so on a phone the tall dialog (5 chips + search results) overflows the viewport top and bottom (owner's first screenshot: title and buttons cut off) and cannot scroll: the name field is unreachable. `CreateGroupPopup` uses the same DialogContent pattern (to verify, same fix).
- (b)(c) `ConversationView.getConversationTitle()` and `isGroupChat()` find the thread in the `threads` prop. `Messages.handleGroupCreated` (L501) only sets `selectedThreadId`; the thread list query is not refetched, so the new legacy group is not in `threads` → title falls back to 'Conversation', `isGroupChat()` false → the header tap that opens `GroupMembersModal` (L971-972) is off. After a list refresh the group is there (`fetchLegacyThreads` lists type 'group' by UUID).
- (c) `GroupMembersModal` adds/removes/leaves members, has no rename. RLS: `global_message_threads` UPDATE `created_by = auth.uid() AND is_community_user()` → the creator can rename today, no migration.
- (c) Remove member is silently broken: it does `update({is_active:false}).eq('id', participantId)` on another user's row; `global_thread_participants` UPDATE policy is only `user_id = auth.uid() AND is_community_user()` → 0 rows, no error, UI says removed, member stays.
- (d) System notices store `body` = `${user.email} …` (createGlobalGroupThread, GroupMembersModal add/remove) and `MessageBubble` renders `message.body` raw (L886-893). `content_data` carries `system_type` + actor/target ids (and `added_user_name`/`removed_user_name`/`left_user_name`).

## Change
1. Dialog fits the phone: `DialogContent` of both group dialogs gets `max-h-[90dvh] overflow-y-auto`; in NewConversationPopup the group-name input is also focused+selected when group mode turns on, so the prefilled name is visibly editable. No new strings.
2. `handleGroupCreated` refetches the inbox thread list (the hybrid hook's refetch / invalidate its query key) before/while selecting the thread, so the header shows the name and the members modal opens.
3. Rename: `GroupMembersModal` header shows the group name; for the creator (thread.created_by === me) a pencil → inline input → save does `update({ name })` on `global_message_threads` (`.eq('id', threadId)`, no select-back), chaining `.select('id')`; success only when `error === null && data?.length === 1` — RLS blocking yields `error: null, data: []`, so 0 rows is detected by `data.length === 0`, not by `error` → error toast (no silent success); posts a `group_renamed` system notice; refetches the thread list. Name trimmed, 1–80 chars. Global context only (tenant groups can't exist, VTID-04936).
4. Remove member works: migration adds policy `"Thread creators can update participants"` ON `global_thread_participants` FOR UPDATE USING/WITH CHECK `EXISTS (SELECT 1 FROM global_message_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())`. Additive, idempotent (DROP POLICY IF EXISTS + CREATE), schema only. Applied on merge by its own apply workflow (same pattern as VTID-04916). Client: remove chains `.select('id')` on the update and treats `data.length === 0` (with `error === null`) as failure → error toast, no system notice (no silent success). `canManageMembers` stays admin/moderator; only the creator is admin (helper inserts creator as admin).
5. No email anywhere in group surfaces. All four notice writers — create (`createGlobalGroupThread`), add, remove, leave (`GroupMembersModal` L188, ~L246, L299-305) — and the new rename notice store a display-name body (profile display_name/full_name; final fallback the i18n neutral "Jemand/Someone", never `user.email`) and `content_data.actor_name`. The `GroupMembersModal` participant list stops rendering `profile.email` under each member (L466-469) and its profile select drops `email`. Rendering: `MessageBubble` renders known `system_type`s (group_created, member_added, member_removed, member_left, group_renamed) from i18n keys with names from `content_data` (`actor_name` → else `message.sender.display_name/full_name`, which MessageBubble already has (L1020, L1043) and which for every notice is the acting user → else neutral "Jemand/Someone"); target names from `added_user_name`/`removed_user_name`/`left_user_name`; unknown types fall back to `body`. Known types NEVER render `body`, so the owner's existing "…@hotmail.com created the group" notice (content_data `{system_type:'group_created', created_by}`, sender = owner) renders as "<owner name> hat die Gruppe erstellt" without touching data.
6. RTL: rename input and pencil use logical properties (`ms-/me-`, `text-start`), verified in `dir=rtl` in the Vitest render.
6b. i18n: new keys DE first, then EN; other shipped locales get the strings via the repo's translate script (or EN fallback marked `_pending_review`) — whatever the i18n CI requires. Run `npm run i18n:inventory`.
7. No What's New entry needed? — rename is member-visible: add a What's New entry (EN+DE) "Gruppen umbenennen & Mitglieder verwalten".

## Tests
8. Vitest: helper body has no email; system-notice renderer maps each type to its key with names and never shows `@`-shaped text from `body` for known types; rename handler rejects empty/>80, reports 0-row as error; remove reports 0-row as error; Messages `handleGroupCreated` triggers a refetch (unit on the handler or hook).
9. Migration test: PGlite/throwaway-Postgres check like SQL-EVENT-SHARE-POSTS if the repo has the harness — creator can deactivate another member's row; a non-creator member cannot; a member can still deactivate their own row.
10. Read-only staging spec: phone viewport, open the group dialog with 2 fake members (search fulfilled in browser), assert the dialog is scrollable within the viewport and the name input is in view and editable; set a custom name; create (writes fulfilled in browser) and assert the thread POST carries the typed name. Rename/remove are covered by Vitest + migration test (writes).

## Release
Merge → migration apply workflow (prod DB, additive policy) → staging deploy → STAGING-VERIFY → ready message with commit range → owner yes → prod pinned. After release the owner renames the existing group "Husam Katiela, Stefan Ehlke" himself via the new pencil.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED: leave path included; fallback is the neutral i18n string, never email (item 5).
- F2 ACCEPTED: participant list no longer shows or selects member emails (item 5).
- F3 ACCEPTED: remove chains `.select('id')`; 0 rows detected via `data.length === 0` (item 4).
- F4 ACCEPTED: rename success = `error === null && data.length === 1` (item 3).
- F5 ACKNOWLEDGED: "no new strings" refers to item 1 only.
- F6 ACCEPTED: all four writers (create/add/remove/leave) plus rename listed explicitly (item 5).
- F7 ACCEPTED: RTL item 6.
- F8 VERIFIED: `.github/workflows/apply-vtid-04916-event-share-posts-migration.yml` exists (Management API query endpoint, push-to-main path filter, idempotent SQL); same pattern used.
- Q3: old notices resolve the actor from `message.sender` (MessageBubble L1020/L1043), the acting user for every notice; known types never render `body` (item 5).
