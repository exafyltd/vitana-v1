import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { generateEmbedding } from "../_shared/gemini-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memoryId, content } = await req.json();
    
    if (!memoryId || !content) {
      throw new Error('memoryId and content are required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`[generate-embedding] Processing memory: ${memoryId}`);

    // Generate embedding using direct Gemini API
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    // Generate embedding directly from content
    console.log(`[generate-embedding] Generating embedding for: ${content.substring(0, 100)}...`);
    const embedding = await generateEmbedding(GEMINI_API_KEY, content);
    
    console.log(`[generate-embedding] Generated embedding, length: ${embedding.length}`);

    // Update the memory with the embedding
    const { error: updateError } = await supabase
      .from('ai_memory')
      .update({ embedding })
      .eq('id', memoryId);

    if (updateError) {
      console.error('[generate-embedding] Update error:', updateError);
      throw updateError;
    }

    console.log(`[generate-embedding] Successfully updated memory ${memoryId}`);

    return new Response(
      JSON.stringify({ success: true, embeddingLength: embedding.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-embedding] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

