-- Reactivate all participants in group threads.
-- RLS policies require is_active = true to see group threads/messages.
-- Some participants were deactivated, making group chats invisible.
UPDATE public.global_thread_participants gtp
SET is_active = true
WHERE is_active = false
  AND EXISTS (
    SELECT 1 FROM public.global_message_threads gmt
    WHERE gmt.id = gtp.thread_id
    AND gmt.type = 'group'
  );
