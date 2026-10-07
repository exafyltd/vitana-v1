# Plan sparring record — VTID-04936

- Change class: standard (frontend only: shared helper + 2 dialogs + tests)
- Plan hash (sha256 of text between plan markers): 27cfe852d3b14b65c315983181b1460349001a8b54cb76b83fde46bf58de6aaa
- Partner: plan-sparring-partner, 2 passes
- Round 1: 1 major (F1 tenant thread_participants has no creator-adds-members policy), 4 minor (F2 orphan cleanup, F3 tests can't exercise real RLS, F4 English system-message body, F5 community-groups dialog out of scope). Verdict NOT CONVERGED.
- Round 2: F1–F5 closed (F1 accepted: helper global-only, tenant fails fast before any write, policy deferred; F2 rejected: no DELETE policy on either thread table, verified; F3 accepted; F4 deferred; F5 acknowledged). No new findings. Verdict **CONVERGED**.
- Owner approval: "Yes" in chat after the final plan, both rounds and the verdict were shown (2026-10-07).

# Plan: Messenger — creating a group from "Neue Unterhaltung" fails with 403

Change class: standard (frontend only, 3 source files + tests + validation record; no migration, no route, no auth, no workflow)
Scope:
- vitana-v1 `src/lib/messaging/createGlobalGroupThread.ts` (new), its Vitest spec (new)
- vitana-v1 `src/components/NewConversationPopup.tsx` (`createGroup`, L335-425)
- vitana-v1 `src/components/messages/CreateGroupPopup.tsx` (`createGroup`, L133-280) — switched to the shared helper
- vitana-v1 `tests/e2e/staging/<vtid>-group-create.staging.spec.ts` (new), `docs/validation/<VTID>/{plan-sparring.md,staging-tests.json}`

<!-- plan:begin -->
## Owner report (2026-10-07, 11:07 CEST, Android)
Messenger → "Neue Unterhaltung" → group mode, 5 members selected, "Gruppe erstellen" → toast "Fehler — Gruppe konnte nicht erstellt werden" (`inbox.toast.error` + `inbox.toast.groupFailed`, i.e. `NewConversationPopup.tsx` L416-421).

## Verified facts (read-only: production edge logs + pg_policies/pg_proc/information_schema; nothing written)
- Edge log 2026-10-07T09:07:43Z: `POST /rest/v1/global_message_threads → 403`. No participant/message POSTs follow.
- `NewConversationPopup.createGroup` (L352-356) does `.insert(threadData).select().single()` → PostgREST `Prefer: return=representation`, so the new row must pass the SELECT policy.
- `global_message_threads` policies: INSERT `with_check auth.uid() = created_by` (passes); SELECT `is_participant_of_global_thread(id)` — SECURITY DEFINER, true only if a `global_thread_participants` row (user, is_active) exists. At insert time none exists → RLS violation 42501 → 403; the transaction rolls back, nothing persists.
- Tenant path (reachable via the inbox mode pill) has the same SELECT shape, AND tenant `thread_participants` has no creator-adds-members INSERT policy (only `user_id = auth.uid()`), and neither thread table has a DELETE policy. So tenant group creation cannot work from the client without a migration; today CreateGroupPopup in tenant mode leaves an orphan thread with only the creator before failing.
- `CreateGroupPopup.createGroup` already avoids it (L167 comment "Pre-generate thread ID to avoid SELECT after INSERT (RLS issue)"): client uuid, insert without `.select()`, inserts the creator as `admin` FIRST (passes "Users can join threads as themselves" `user_id = auth.uid()`), THEN the other members (passes "Thread creators can add participants": its EXISTS subquery on global_message_threads is RLS-filtered and only sees the thread once the creator is a participant). NewConversationPopup inserts creator + members in ONE multi-row INSERT (L362-374). Even past the 403, the member rows would be rejected: their only passing policy's subquery sees the thread only via `is_participant_of_global_thread`, which runs on the statement's snapshot, where the creator's row from the same statement is not yet visible. Hence two statements, creator first.
- System message insert into `global_messages`: policy `auth.uid() = sender_id AND is_participant_of_global_thread(thread_id)` — passes after the creator row exists.
- Legacy groups are still listed in the inbox (`useGlobalMessages.fetchLegacyThreads`, type 'group' keeps the thread UUID as id), so a created group is visible; `onGroupCreated(threadId)` selects it. The gateway chat-groups API (VTID-03089) has no create endpoint — moving group creation there is out of scope.
- Only 3 legacy groups exist in production (latest 2026-03-03): group creation from this dialog has been broken for months.

## Change
1. New `src/lib/messaging/createGlobalGroupThread.ts`: `createGlobalGroupThread(client, { userId, userEmail, name, memberIds })` → `threadId`. Global context only. Steps: `uuidv4()` id; insert `{id, created_by, type:'group', name}` into `global_message_threads` WITHOUT `.select()`; insert creator `{role:'admin'}`; insert members (deduped, creator removed) `{role:'member'}`; insert the existing system message (same body/content_data as today, best-effort: logged, not thrown, as today). Throws the PostgREST error on any of the first three steps.
2. `NewConversationPopup.createGroup` calls the helper in global context; toasts/onGroupCreated/resetForm unchanged.
3. `CreateGroupPopup.createGroup` calls the same helper in global context (keeps its duplicate check). One implementation, so the two dialogs can't drift again.
3b. Tenant context: both dialogs show the existing "group could not be created" toast BEFORE any write (logged with reason `tenant_group_create_unsupported`), instead of writing an orphan thread. Making tenant groups work needs RLS policies (creator-adds-members on `thread_participants`) — a migration, deferred to its own sparred plan/VTID.
4. No i18n changes (no new strings), no What's New entry (bug fix).

## Tests
5. Vitest (`createGlobalGroupThread.test.ts`, fake client recording calls): thread insert carries a client id and `.select` is never called on it; creator-admin insert happens before members, as separate calls; creator not duplicated among members; a thread-insert error is thrown and no participant insert follows; system-message failure doesn't throw. The spec header states what it cannot prove: real RLS is not exercised (no isolated Supabase exists; staging writes to production); correctness against RLS rests on the policy analysis above and on the owner's own group creation after release.
6. Vitest for NewConversationPopup is not added (heavy component); the helper test plus the staging spec prove the wiring.
7. Staging spec (read-only, phone viewport): sign in as the test user, open /inbox → "Neue Unterhaltung", switch to group mode, enter a name, pick one search result, press "Gruppe erstellen". Every write it triggers is answered INSIDE the browser with `page.route → fulfill` (201, empty body) and never leaves the page; the guard is not widened. Assert on the intercepted requests: thread POST body has `id`, its `Prefer` header does not contain `return=representation`; the first participant POST is the test user with role admin; members follow in a later POST. Assert the error toast does not appear.

## Release
Merge → staging deploy → STAGING-VERIFY (smoke + this spec + vitest ref). Ready message only after it passes on the deployed chunk; production only on the owner's yes, pinned to the verified commit, with the full commit range listed.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED (option a): helper is global-only; tenant mode fails fast with the existing toast before any write. Verified live: tenant `thread_participants` INSERT has only `user_id = auth.uid()`. Missing tenant policy DEFERRED to a follow-up VTID (needs a migration + its own sparring), listed in the PR.
- F2 REJECTED: verified live `pg_policies` — neither `global_message_threads` nor `message_threads` has a DELETE policy, so a client-side cleanup DELETE is a silent no-op. In global context the only orphan window is a failed creator self-insert, which passes `user_id = auth.uid()` by construction. The tenant orphan case is removed by F1.
- F3 ACCEPTED: limitation stated in plan item 5 and in the spec header.
- F4 DEFERRED: pre-existing English system-message body, carried unchanged; follow-up noted in the PR (renderer would need a key-based system message).
- F5 ACKNOWLEDGED: `src/components/CreateGroupPopup.tsx` (community groups) out of scope.
