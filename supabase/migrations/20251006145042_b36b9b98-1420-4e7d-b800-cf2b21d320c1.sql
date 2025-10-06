-- Add input_method column to ai_messages to track voice vs text input
ALTER TABLE ai_messages 
ADD COLUMN input_method text DEFAULT 'text' CHECK (input_method IN ('text', 'voice'));

-- Add index for faster filtering
CREATE INDEX idx_ai_messages_input_method ON ai_messages(input_method);

-- Update existing records to mark them as text (default)
UPDATE ai_messages SET input_method = 'text' WHERE input_method IS NULL;