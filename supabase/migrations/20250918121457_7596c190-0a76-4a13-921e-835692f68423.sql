-- Add status timestamp fields to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add status timestamp fields to global_messages table  
ALTER TABLE public.global_messages
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Update existing messages to have sent_at = created_at
UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;
UPDATE public.global_messages SET sent_at = created_at WHERE sent_at IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS messages_status_timestamps_idx ON public.messages (sender_id, sent_at, delivered_at, read_at);
CREATE INDEX IF NOT EXISTS global_messages_status_timestamps_idx ON public.global_messages (sender_id, sent_at, delivered_at, read_at);