-- Add action_buttons column to global_messages for interactive messages (e.g., calendar invites)
ALTER TABLE public.global_messages
ADD COLUMN IF NOT EXISTS action_buttons jsonb;

-- Optional: keep it flexible and nullable, no check constraints (use triggers for validation if ever needed)

-- Backfill step (noop here): ensure existing rows have explicit null (no-op)
UPDATE public.global_messages SET action_buttons = NULL WHERE action_buttons IS NULL;
