-- Drop the problematic triggers that are causing message sending failures
DROP TRIGGER IF EXISTS auto_add_sender_calendar_event_messages ON public.messages;
DROP TRIGGER IF EXISTS auto_add_sender_calendar_event_global_messages ON public.global_messages;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.auto_add_sender_calendar_event();