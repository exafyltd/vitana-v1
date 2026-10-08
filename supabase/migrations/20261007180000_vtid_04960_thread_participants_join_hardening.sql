-- VTID-04960: members can no longer add themselves to any conversation.
--
-- Before: on global_thread_participants AND thread_participants the INSERT
-- policy "Users can join threads as themselves" checked only
-- user_id = auth.uid(), so a signed-in member could insert a participant row
-- for ANY thread id (ids travel in links and notifications), then read the
-- whole history and post. The own-row UPDATE policies had no WITH CHECK, so a
-- member could move their row to another thread_id or make themselves admin.
--
-- After:
--   * a member may insert their OWN row only into a thread they created
--     (the creator's admin row right after creating a group). The creator
--     adding others stays "Thread creators can add participants" (global).
--     SECURITY DEFINER functions that insert participants (create_or_get_global_dm,
--     create_global_direct_thread, auto_create_group_chat_thread,
--     sync_group_chat_participant, create_tenant_direct_thread) bypass RLS.
--   * own-row UPDATE keeps working (last_read_at, leaving), with WITH CHECK.
--   * a trigger keeps thread_id and user_id immutable and lets only the
--     thread's creator change a role.
-- Idempotent; schema only; writes no rows. Existing rows are left as they are.
--
-- Rollback (not executed): recreate "Users can join threads as themselves"
-- (WITH CHECK user_id = auth.uid()) on both tables, recreate the old own-row
-- UPDATE policies without WITH CHECK, drop the two guard triggers.

create or replace function public.is_global_thread_creator(p_thread uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.global_message_threads t
                 where t.id = p_thread and t.created_by = auth.uid())
$$;

create or replace function public.is_tenant_thread_creator(p_thread uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.message_threads t
                 where t.id = p_thread and t.created_by = auth.uid())
$$;

grant execute on function public.is_global_thread_creator(uuid) to authenticated;
grant execute on function public.is_tenant_thread_creator(uuid) to authenticated;

-- INSERT: no more self-join into someone else's thread.
drop policy if exists "Users can join threads as themselves" on public.global_thread_participants;
drop policy if exists "Thread creators can join their own threads" on public.global_thread_participants;
create policy "Thread creators can join their own threads"
  on public.global_thread_participants for insert
  with check (user_id = auth.uid() and public.is_global_thread_creator(thread_id));

drop policy if exists "Users can join threads as themselves" on public.thread_participants;
drop policy if exists "Thread creators can join their own threads" on public.thread_participants;
create policy "Thread creators can join their own threads"
  on public.thread_participants for insert
  with check (user_id = auth.uid() and public.is_tenant_thread_creator(thread_id));

-- Own-row UPDATE: the live names differ per table and from the migration
-- history, so both names are dropped on both tables.
drop policy if exists "Users can update their own thread participation" on public.global_thread_participants;
drop policy if exists "Users can update their own participation" on public.global_thread_participants;
drop policy if exists "Members can update their own participation" on public.global_thread_participants;
create policy "Members can update their own participation"
  on public.global_thread_participants for update
  using (user_id = auth.uid() and public.is_community_user())
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own thread participation" on public.thread_participants;
drop policy if exists "Users can update their own participation" on public.thread_participants;
drop policy if exists "Members can update their own participation" on public.thread_participants;
create policy "Members can update their own participation"
  on public.thread_participants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Column guard. Only no-JWT contexts pass (service role, cron, migrations:
-- auth.uid() is null). A SECURITY DEFINER function called from a signed-in
-- request still has auth.uid() set and IS checked; none UPDATEs these tables
-- today (they only insert/delete). A future definer that must change these
-- columns needs its own explicit, documented bypass here.
create or replace function public.guard_thread_participant_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_creator boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.thread_id is distinct from old.thread_id or new.user_id is distinct from old.user_id then
    raise exception 'thread_id and user_id of a participant cannot be changed'
      using errcode = 'insufficient_privilege';
  end if;
  if new.role is distinct from old.role then
    is_creator := case tg_table_name
      when 'global_thread_participants' then public.is_global_thread_creator(old.thread_id)
      else public.is_tenant_thread_creator(old.thread_id)
    end;
    if not is_creator then
      raise exception 'only the conversation creator can change a role'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_global_thread_participant_update on public.global_thread_participants;
create trigger trg_guard_global_thread_participant_update
  before update on public.global_thread_participants
  for each row execute function public.guard_thread_participant_update();

drop trigger if exists trg_guard_thread_participant_update on public.thread_participants;
create trigger trg_guard_thread_participant_update
  before update on public.thread_participants
  for each row execute function public.guard_thread_participant_update();
