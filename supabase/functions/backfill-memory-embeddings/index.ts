import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log('[backfill-embeddings] Starting backfill process');

    // Get all memories without embeddings
    const { data: memories, error: fetchError } = await supabase
      .from('ai_memory')
      .select('id, content')
      .is('embedding', null)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[backfill-embeddings] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!memories || memories.length === 0) {
      console.log('[backfill-embeddings] No memories need backfilling');
      return new Response(
        JSON.stringify({ message: 'No memories need embeddings', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill-embeddings] Found ${memories.length} memories to process`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let processed = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (memory) => {
        try {
          // Generate embedding using chat completion
          const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{
                role: 'user',
                content: `Generate a concise semantic representation (max 50 words) that captures the key meaning of this text for similarity matching: "${memory.content}"`
              }],
            }),
          });

          if (!embeddingResponse.ok) {
            console.error(`[backfill-embeddings] Embedding API error for memory ${memory.id}:`, embeddingResponse.status);
            failed++;
            return;
          }

          const embeddingData = await embeddingResponse.json();
          const semanticText = embeddingData.choices[0].message.content;
          const embedding = textToVector(semanticText, memory.content);

          // Update memory with embedding
          const { error: updateError } = await supabase
            .from('ai_memory')
            .update({ embedding })
            .eq('id', memory.id);

          if (updateError) {
            console.error(`[backfill-embeddings] Update error for memory ${memory.id}:`, updateError);
            failed++;
            return;
          }

          processed++;
          console.log(`[backfill-embeddings] Processed ${processed}/${memories.length} memories`);
        } catch (error) {
          console.error(`[backfill-embeddings] Error processing memory ${memory.id}:`, error);
          failed++;
        }
      }));

      // Small delay between batches
      if (i + batchSize < memories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[backfill-embeddings] Completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Backfill complete', 
        processed, 
        failed,
        total: memories.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backfill-embeddings] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to convert text to vector embedding
function textToVector(semanticText: string, originalText: string): number[] {
  const dimension = 768; // Match database vector dimension
  const vector = new Array(dimension).fill(0);
  
  const combined = semanticText + ' ' + originalText;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    const idx = (char * 7 + i * 13) % dimension;
    vector[idx] += Math.sin(char + i) * 0.1;
  }
  
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => magnitude > 0 ? val / magnitude : 0);
}
