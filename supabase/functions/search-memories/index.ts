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
    const { query, userId } = await req.json();
    
    if (!query || !userId) {
      throw new Error('Query and userId are required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`[memory-search] Searching memories for query: "${query}"`);

    // Fetch all active memories for the user
    const { data: memories, error } = await supabase
      .from('ai_memory')
      .select('id, memory_type, content, confidence_score, created_at, metadata')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false });

    if (error) throw error;

    if (!memories || memories.length === 0) {
      console.log('[memory-search] No memories found');
      return new Response(
        JSON.stringify({ relevant_memories: [], has_contradictions: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple keyword-based relevance scoring
    const queryLower = query.toLowerCase();
    const queryKeywords = queryLower
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['what', 'when', 'where', 'this', 'that', 'with', 'from', 'have'].includes(w));

    console.log(`[memory-search] Query keywords: ${queryKeywords.join(', ')}`);

    // Score each memory
    const scoredMemories = memories.map((memory: any) => {
      const contentLower = memory.content.toLowerCase();
      let score = 0;

      // Keyword matching
      queryKeywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          score += 2;
        }
      });

      // Boost recent memories slightly
      const daysSinceCreated = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 0.5;

      // Boost high-confidence memories
      score += (memory.confidence_score || 0.5);

      return { ...memory, relevance_score: score };
    });

    // Filter and sort by relevance
    const relevantMemories = scoredMemories
      .filter((m: any) => m.relevance_score > 0.7)
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    console.log(`[memory-search] Found ${relevantMemories.length} relevant memories`);

    // Check for contradictions (simple content comparison)
    let hasContradictions = false;
    const contradictions: any[] = [];

    for (let i = 0; i < relevantMemories.length; i++) {
      for (let j = i + 1; j < relevantMemories.length; j++) {
        const mem1 = relevantMemories[i];
        const mem2 = relevantMemories[j];

        // Check if they're about the same topic but have different info
        if (mem1.memory_type === mem2.memory_type) {
          const sharedKeywords = queryKeywords.filter(kw =>
            mem1.content.toLowerCase().includes(kw) &&
            mem2.content.toLowerCase().includes(kw)
          );

          if (sharedKeywords.length > 0) {
            // Simple heuristic: if content differs significantly, might be contradiction
            const similarity = calculateSimilarity(mem1.content, mem2.content);
            if (similarity < 0.3) {
              hasContradictions = true;
              contradictions.push({
                memory1: { id: mem1.id, content: mem1.content },
                memory2: { id: mem2.id, content: mem2.content },
                shared_keywords: sharedKeywords
              });
            }
          }
        }
      }
    }

    if (hasContradictions) {
      console.log(`[memory-search] ⚠️ Found ${contradictions.length} potential contradictions`);
    }

    return new Response(
      JSON.stringify({
        relevant_memories: relevantMemories.map((m: any) => ({
          id: m.id,
          type: m.memory_type,
          content: m.content,
          confidence: m.confidence_score,
          relevance: m.relevance_score,
          timestamp: m.created_at
        })),
        has_contradictions: hasContradictions,
        contradictions: contradictions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[memory-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Calculate basic text similarity (Jaccard index on words)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
