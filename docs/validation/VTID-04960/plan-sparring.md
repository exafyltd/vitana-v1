# Plan sparring record — VTID-04960

- Change class: standard (RLS migration on 2 tables + trigger; no app code change)
- Plan hash (sha256 of text between plan markers): a5ffb0cd1eb987ec62093daac8533af43d7f6f55b69313be733aabd47d26f0d6
- Partner: plan-sparring-partner, 2 passes
- Round 1: 2 major (F1 own-row UPDATE policy names differ per table — a wrong DROP name would leave the loose policy; F2 the trigger bypass comment conflated service role with SECURITY DEFINER), 3 minor (F3 create_or_get_global_dm has no migration file; F4 tenant addMember for others never worked; F5 why no staging step for a DB change). Verdict NOT CONVERGED.
- Round 2: F1–F5 and both questions closed. No new findings. Verdict **CONVERGED**.
- Owner approval: "Yes both" in chat (2026-10-07), recorded as the Gate 1 yes (VTID-04947), together with VTID-04959.

## Evidence before merge
- `scripts/sql-tests/run-thread-join-hardening-test.sh` on a local throwaway Postgres 16: 8/8 checks pass with the migration (applied twice).
- Negative control (same test, `-v skip_migration=1`): fails at CHECK 1 "stranger joined someone else's global group" — the hole is real and the test catches it.

# Plan: members can no longer add themselves to any conversation

Change class: standard (RLS migration on 2 tables + trigger; no app code change)
Scope:
- vitana-v1 `supabase/migrations/<ts>_vtid_xxxxx_thread_participants_join_hardening.sql` (new)
- vitana-v1 `.github/workflows/apply-vtid-xxxxx-...yml` (new, VTID-04955 pattern), `.github/workflows/SQL-THREAD-JOIN-HARDENING.yml` + `scripts/sql-tests/*` (new)
- `docs/validation/<VTID>/{plan-sparring.md,staging-tests.json}`

<!-- plan:begin -->
## Problem (found while building VTID-04955; verified live via pg_policies 2026-10-07)
Messenger conversations (legacy global and tenant threads) let any signed-in member read and write a conversation once they hold an active participant row. Two policies let a member create such a row for ANY conversation:
1. INSERT `"Users can join threads as themselves"` on `global_thread_participants` AND on `thread_participants`: `WITH CHECK (user_id = auth.uid())` — no check that the member was invited. Insert `{thread_id: <any id>, user_id: me}` → `is_participant_of_global_thread` becomes true → the member reads the whole history (SELECT policies) and can post (`global_messages` INSERT requires only participant + sender = me).
2. Own-row UPDATE policies — live names differ per table (pg_policies 2026-10-07): global `"Users can update their own thread participation"` (`user_id = auth.uid() AND is_community_user()`); tenant `"Users can update their own participation"` (`user_id = auth.uid()`); no WITH CHECK → a member can move their own row to another `thread_id`, or set their own `role` to 'admin' (the members panel then offers add/remove UI to them).
Thread ids are UUIDs (not guessable) but they travel in URLs, deep links, notifications and screenshots, so a leaked id is enough.

## Who legitimately inserts/updates rows today (verified)
- App: creator inserts their own admin row right after creating a group (`createGlobalGroupThread`); creator adds members (`GroupMembersModal.addMember`, policy "Thread creators can add participants"); members update their own `last_read_at` (`useGlobalMessages` ×3) and `is_active=false` (leave); creator deactivates others (VTID-04955 policy).
- DB functions that insert participants are all SECURITY DEFINER (verified live via `pg_proc.prosecdef`; `create_or_get_global_dm` has no migration file in the repo, so live only) (`create_or_get_global_dm`, `create_global_direct_thread`, `auto_create_group_chat_thread`, `sync_group_chat_participant`, `create_tenant_direct_thread`) → unaffected by RLS.
- Gateway (vitana-platform services): no direct writes to either table. `request-account-deletion` edge function uses the service role.
- No triggers on either participants table today.
- Tenant `GroupMembersModal.addMember` for OTHER users never worked (tenant has no creator-adds-members policy; VTID-04936 blocks tenant group creation anyway) — the tightening creates no new breakage.

## Change (one migration, idempotent, schema only, writes no rows)
1. Helpers (SECURITY DEFINER, STABLE, `search_path = public`, EXECUTE to authenticated): `is_global_thread_creator(p_thread uuid)` and `is_tenant_thread_creator(p_thread uuid)` → `exists(thread where id = p_thread and created_by = auth.uid())`. Definer so the check sees the thread even before the creator is a participant (the thread SELECT policy needs participation).
2. INSERT: drop `"Users can join threads as themselves"` on both tables; create `"Thread creators can join their own threads"` `WITH CHECK (user_id = auth.uid() AND is_<x>_thread_creator(thread_id))`. Keep `"Thread creators can add participants"` (global) unchanged.
3. Own-row UPDATE: on BOTH tables `DROP POLICY IF EXISTS` BOTH names ("Users can update their own thread participation" and "Users can update their own participation" — the migration history and the live DB disagree), then create one `"Members can update their own participation"` per table with the table's existing USING plus `WITH CHECK (user_id = auth.uid())`. The apply workflow's verify step fails unless each table has exactly the expected UPDATE policies (creator policy on global + the new own-row policy) and no UPDATE policy without WITH CHECK.
4. Column guard trigger (BEFORE UPDATE, both tables, SECURITY DEFINER function): when `auth.uid()` is not null. Only no-JWT contexts pass (service role, cron, migrations). A SECURITY DEFINER function called from a signed-in request still has `auth.uid()` set and IS checked — today no definer function UPDATEs these tables (they only insert/delete); the trigger's comment says so and tells a future definer updater to add an explicit, documented bypass: `thread_id` and `user_id` may never change; `role` may change only if `is_<x>_thread_creator(OLD.thread_id)`. Raise `insufficient_privilege` otherwise.
5. No data change. Existing rows stay (no evidence of abuse to clean up; cannot distinguish a self-join from an invite after the fact). The migration's header records this.

## Tests
6. SQL test on throwaway Postgres (pattern SQL-GROUP-PARTICIPANTS), mirroring the live policies + the VTID-04955 policy, both tables: stranger cannot self-insert into someone else's thread (the hole, fails before the migration — negative control); creator can insert own admin row into own new thread; creator adds a member; member can update own last_read_at and leave (is_active=false); member cannot change own thread_id, user_id, or role; creator can change a member's role and deactivate a member; a SECURITY DEFINER insert path (stub of create_or_get_global_dm) still works; service context (no sub) unaffected; migration applied twice.
7. Existing Vitest + VTID-04936/04955 staging specs keep passing (app code unchanged). STAGING-VERIFY change suite: `existing` = the SQL test runner (no browser spec: nothing visible changes; staging is read-only and cannot exercise writes).

## Release
Database-only change: staging and production share one Supabase project, so there is no staging database step; the throwaway-Postgres SQL suite (item 6) is the pre-merge gate, the apply workflow's verify step the post-apply check.
Merge → apply workflow runs the migration on the production database (additive helpers + replaced policies + trigger) and verifies: old INSERT policy gone, new policy present, WITH CHECK present, triggers present. No frontend change ships, so no Gate 2 for code; the database change is covered by this plan's approval.
Rollback (documented in the migration header, not executed): recreate the two old INSERT policies and drop the trigger.
<!-- plan:end -->

## Planner responses (round 1)
- F1 ACCEPTED: live names differ per table (global: "…their own thread participation", tenant: "…their own participation", both from today's pg_policies). The migration drops BOTH names on BOTH tables and creates one new own-row policy per table; the apply verify step fails on any UPDATE policy without WITH CHECK (item 3).
- F2 ACCEPTED: bypass is no-JWT only; definer-from-client is checked; documented in the trigger comment (item 4).
- F3 ACKNOWLEDGED: verified live via prosecdef; noted (facts).
- F4 ACKNOWLEDGED: tenant addMember for others was already non-functional; noted (facts).
- F5 ACCEPTED: stated under Release.
