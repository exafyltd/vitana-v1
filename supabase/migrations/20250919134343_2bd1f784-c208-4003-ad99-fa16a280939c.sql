-- Fix message status updates for read receipts
-- Add UPDATE policies for message status columns

-- Global messages: Allow thread participants to update message status
CREATE POLICY "Thread participants can update message status" ON public.global_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp
    WHERE gtp.thread_id = global_messages.thread_id
    AND gtp.user_id = auth.uid()
    AND gtp.is_active = true
  )
);

-- Tenant messages: Allow thread participants to update message status  
CREATE POLICY "Thread participants can update message status" ON public.messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = messages.thread_id
    AND tp.user_id = auth.uid()
    AND tp.is_active = true
  )
);

-- Grant column-level UPDATE privileges for message status columns
GRANT UPDATE (delivered_at, read_at) ON public.global_messages TO authenticated;
GRANT UPDATE (delivered_at, read_at) ON public.messages TO authenticated;

-- Create trigger function to auto-fill delivered_at when read_at is set
CREATE OR REPLACE FUNCTION public.auto_fill_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If read_at is being set and delivered_at is null, set delivered_at to read_at
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.read_at IS DISTINCT FROM NEW.read_at) AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NEW.read_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for both message tables
CREATE TRIGGER auto_fill_delivered_at_global
  BEFORE UPDATE ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_delivered_at();

CREATE TRIGGER auto_fill_delivered_at_tenant
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_delivered_at();