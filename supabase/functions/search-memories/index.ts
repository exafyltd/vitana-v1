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

    console.log(`[memory-search] Semantic search for query: "${query}"`);

    // Generate embedding for the query using Gemini
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const queryEmbedding = await generateEmbedding(GEMINI_API_KEY, query);
    
    console.log(`[memory-search] Generated query embedding, length: ${queryEmbedding.length}`);

    // Vector similarity search using pgvector
    const { data: vectorMemories, error } = await supabase.rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 10,
      p_user_id: userId
    });

    if (error) {
      console.error('[memory-search] Vector search error:', error);
      throw error;
    }

    // Unified keyword fallback: search BOTH ai_memory AND diary_entries
    let memories = vectorMemories || [];
    const keywordRegex = /(birthday|born|age|preference|goal|habit|favorite|like|dislike|memory|remember|told|said)/i;
    
    if (!vectorMemories || vectorMemories.length === 0 || keywordRegex.test(query)) {
      console.log('[memory-search] Unified keyword fallback triggered');
      
      // Search ai_memory
      const { data: keywordMemories, error: kwMemError } = await supabase
        .from('ai_memory')
        .select('id, memory_type, content, confidence_score, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      // Search diary_entries
      const { data: keywordDiaries, error: kwDiaryError } = await supabase
        .from('diary_entries')
        .select('id, text, created_at, tags, source')
        .eq('user_id', userId)
        .ilike('text', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (kwMemError) {
        console.error('[memory-search] Keyword ai_memory error:', kwMemError);
      }
      if (kwDiaryError) {
        console.error('[memory-search] Keyword diary error:', kwDiaryError);
      }

      const existingIds = new Set(memories.map((m: any) => m.id));

      // Merge ai_memory results
      if (keywordMemories && keywordMemories.length > 0) {
        console.log(`[memory-search] Keyword fallback: ${keywordMemories.length} ai_memory items`);
        const fallback = keywordMemories
          .filter((m: any) => !existingIds.has(m.id))
          .map((m: any) => ({ ...m, similarity: 0.55, source: 'ai_memory' }));
        memories = [...memories, ...fallback];
      }

      // Merge diary_entries (transform to memory-like structure)
      if (keywordDiaries && keywordDiaries.length > 0) {
        console.log(`[memory-search] Keyword fallback: ${keywordDiaries.length} diary items`);
        const diaryMemories = keywordDiaries
          .filter((d: any) => !existingIds.has(d.id))
          .map((d: any) => ({
            id: d.id,
            memory_type: 'diary',
            content: d.text,
            confidence_score: 0.7,
            created_at: d.created_at,
            similarity: 0.60, // Boost diary slightly
            source: 'diary'
          }));
        memories = [...memories, ...diaryMemories];
      }
    }

    if (!memories || memories.length === 0) {
      console.log('[memory-search] No memories found');
      return new Response(
        JSON.stringify({ relevant_memories: [], has_contradictions: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[memory-search] Found ${memories.length} memories after retrieval`);

    // Boost recent memories and high-confidence memories
    const scoredMemories = memories.map((memory: any) => {
      let score = memory.similarity;

      // Boost recent memories
      const daysSinceCreated = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 0.1;

      // Boost high-confidence memories
      score += (memory.confidence_score || 0.5) * 0.1;

      return { ...memory, relevance_score: score };
    });

    // Sort by final relevance score and take top 5
    const relevantMemories = scoredMemories
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, 5);

    console.log(`[memory-search] Returning top ${relevantMemories.length} memories`);

    // Detect contradictions using semantic similarity between memories
    let hasContradictions = false;
    const contradictions: any[] = [];

    for (let i = 0; i < relevantMemories.length; i++) {
      for (let j = i + 1; j < relevantMemories.length; j++) {
        const mem1 = relevantMemories[i];
        const mem2 = relevantMemories[j];

        // Check if same topic but semantically different
        if (mem1.memory_type === mem2.memory_type) {
          const similarity = calculateSimilarity(mem1.content, mem2.content);
          if (similarity < 0.3) {
            hasContradictions = true;
            contradictions.push({
              memory1: { id: mem1.id, content: mem1.content },
              memory2: { id: mem2.id, content: mem2.content }
            });
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

// Calculate basic text similarity (Jaccard index on words)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
