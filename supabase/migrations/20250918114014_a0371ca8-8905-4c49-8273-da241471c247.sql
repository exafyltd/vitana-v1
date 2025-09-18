-- Create typing indicators tables for real-time typing functionality

-- Global typing indicators for community messages
CREATE TABLE public.global_typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.global_message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate typing entries
ALTER TABLE public.global_typing_indicators 
ADD CONSTRAINT global_typing_indicators_thread_user_unique 
UNIQUE (thread_id, user_id);

-- Enable RLS
ALTER TABLE public.global_typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for global typing indicators
CREATE POLICY "Users can manage their own typing indicators" 
ON public.global_typing_indicators 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view typing indicators in their threads" 
ON public.global_typing_indicators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.global_thread_participants 
    WHERE thread_id = global_typing_indicators.thread_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

-- Tenant-specific typing indicators for professional messages
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate typing entries
ALTER TABLE public.typing_indicators 
ADD CONSTRAINT typing_indicators_thread_user_unique 
UNIQUE (thread_id, user_id);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant typing indicators
CREATE POLICY "Users can manage their own typing indicators" 
ON public.typing_indicators 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view typing indicators in their tenant threads" 
ON public.typing_indicators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants 
    WHERE thread_id = typing_indicators.thread_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

-- Enable realtime for typing indicators
ALTER TABLE public.global_typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create function to auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.global_typing_indicators 
  WHERE updated_at < now() - interval '10 seconds';
  
  DELETE FROM public.typing_indicators 
  WHERE updated_at < now() - interval '10 seconds';
END;
$$;

-- Create index for efficient queries
CREATE INDEX idx_global_typing_indicators_thread_id ON public.global_typing_indicators(thread_id);
CREATE INDEX idx_global_typing_indicators_updated_at ON public.global_typing_indicators(updated_at);
CREATE INDEX idx_typing_indicators_thread_id ON public.typing_indicators(thread_id);
CREATE INDEX idx_typing_indicators_updated_at ON public.typing_indicators(updated_at);