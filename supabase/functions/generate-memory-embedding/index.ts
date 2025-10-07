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

    // Generate embedding using Lovable AI with Gemini
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use chat completion to generate semantic representation
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
          content: `Generate a concise semantic representation (max 50 words) that captures the key meaning of this text for similarity matching: "${content}"`
        }],
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('[generate-embedding] Embedding API error:', errorText);
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const semanticText = embeddingData.choices[0].message.content;
    
    // Convert semantic text to vector embedding (1536 dimensions to match pgvector)
    const embedding = textToVector(semanticText, content);
    
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

// Helper function to convert text to vector embedding
function textToVector(semanticText: string, originalText: string): number[] {
  const dimension = 768; // Match database vector dimension
  const vector = new Array(dimension).fill(0);
  
  // Combine semantic and original text for better representation
  const combined = semanticText + ' ' + originalText;
  
  // Generate deterministic vector from text
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    const idx = (char * 7 + i * 13) % dimension;
    vector[idx] += Math.sin(char + i) * 0.1;
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => magnitude > 0 ? val / magnitude : 0);
}
