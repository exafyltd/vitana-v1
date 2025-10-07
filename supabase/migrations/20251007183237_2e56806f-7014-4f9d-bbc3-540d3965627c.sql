-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to ai_memory table
ALTER TABLE public.ai_memory 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast similarity search (using ivfflat for good performance)
CREATE INDEX IF NOT EXISTS ai_memory_embedding_idx 
ON public.ai_memory 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment to explain the column
COMMENT ON COLUMN public.ai_memory.embedding IS 'Vector embedding for semantic similarity search (768 dimensions from text-embedding-3-small)';

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  memory_type text,
  content text,
  confidence_score numeric,
  created_at timestamptz,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_memory.id,
    ai_memory.user_id,
    ai_memory.memory_type,
    ai_memory.content,
    ai_memory.confidence_score,
    ai_memory.created_at,
    ai_memory.metadata,
    1 - (ai_memory.embedding <=> query_embedding) as similarity
  FROM public.ai_memory
  WHERE ai_memory.embedding IS NOT NULL
    AND ai_memory.is_active = true
    AND (p_user_id IS NULL OR ai_memory.user_id = p_user_id)
    AND 1 - (ai_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY ai_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;