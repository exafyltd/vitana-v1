-- VTID-04955: the creator of a global group can remove members.
--
-- GroupMembersModal removes a member by setting their participant row
-- is_active = false. The only UPDATE policy on global_thread_participants was
-- "Users can update their own thread participation" (user_id = auth.uid()),
-- so removing SOMEONE ELSE matched 0 rows with no error and the app reported
-- success while the member stayed in the group.
--
-- This adds one permissive UPDATE policy: the thread's creator may update
-- participant rows of that thread. The subquery on global_message_threads is
-- itself under RLS (SELECT = is_participant_of_global_thread), which the
-- creator passes because they are inserted as the group's admin participant.
-- Additive and idempotent; schema only, writes no rows.

drop policy if exists "Thread creators can update participants" on public.global_thread_participants;

create policy "Thread creators can update participants"
  on public.global_thread_participants
  for update
  using (
    exists (
      select 1 from public.global_message_threads t
      where t.id = global_thread_participants.thread_id
        and t.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.global_message_threads t
      where t.id = global_thread_participants.thread_id
        and t.created_by = auth.uid()
    )
  );
