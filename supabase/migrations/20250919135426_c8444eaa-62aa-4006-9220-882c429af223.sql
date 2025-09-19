-- Add database triggers to automatically update thread updated_at when messages are inserted/updated
-- This ensures thread ordering is always correct based on latest activity

-- Trigger function to update thread updated_at for global messages
CREATE OR REPLACE FUNCTION public.update_global_thread_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the thread's updated_at timestamp when a message is inserted or updated
  UPDATE public.global_message_threads 
  SET updated_at = COALESCE(NEW.created_at, NEW.updated_at, now())
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$;

-- Trigger function to update thread updated_at for tenant messages
CREATE OR REPLACE FUNCTION public.update_tenant_thread_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the thread's updated_at timestamp when a message is inserted or updated
  UPDATE public.message_threads 
  SET updated_at = COALESCE(NEW.created_at, NEW.updated_at, now())
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers for global messages
DROP TRIGGER IF EXISTS trigger_update_global_thread_timestamp ON public.global_messages;
CREATE TRIGGER trigger_update_global_thread_timestamp
  AFTER INSERT OR UPDATE ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_global_thread_updated_at();

-- Create triggers for tenant messages
DROP TRIGGER IF EXISTS trigger_update_tenant_thread_timestamp ON public.messages;
CREATE TRIGGER trigger_update_tenant_thread_timestamp
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_thread_updated_at();

-- Add indexes for better performance on last message queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_messages_thread_created_at 
ON public.global_messages(thread_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_created_at 
ON public.messages(thread_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_global_threads_updated_at 
ON public.global_message_threads(updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_threads_updated_at 
ON public.message_threads(updated_at DESC);