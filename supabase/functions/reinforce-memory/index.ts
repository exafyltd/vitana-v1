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
    const { memoryIds, action = 'confirm' } = await req.json();
    
    if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
      throw new Error('memoryIds array is required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`[reinforce-memory] ${action} memories: ${memoryIds.join(', ')}`);

    // Update confidence based on action
    let confidenceChange = 0;
    if (action === 'confirm') {
      confidenceChange = 0.05; // Boost confidence by 5%
    } else if (action === 'reference') {
      confidenceChange = 0.03; // Smaller boost for just being referenced
    } else if (action === 'contradict') {
      confidenceChange = -0.15; // Reduce confidence significantly
    }

    const updates: Promise<any>[] = [];

    for (const memoryId of memoryIds) {
      // Fetch current memory
      const { data: memory } = await supabase
        .from('ai_memory')
        .select('confidence_score, metadata')
        .eq('id', memoryId)
        .eq('user_id', user.id)
        .single();

      if (!memory) continue;

      // Calculate new confidence (clamp between 0.1 and 1.0)
      const currentConfidence = memory.confidence_score || 0.5;
      const newConfidence = Math.max(0.1, Math.min(1.0, currentConfidence + confidenceChange));

      // Track reinforcement history
      const metadata = memory.metadata || {};
      const reinforcements = metadata.reinforcements || [];
      reinforcements.push({
        action,
        timestamp: new Date().toISOString(),
        confidence_before: currentConfidence,
        confidence_after: newConfidence
      });

      // Update memory
      updates.push(
        supabase
          .from('ai_memory')
          .update({
            confidence_score: newConfidence,
            metadata: { ...metadata, reinforcements, last_reinforced: new Date().toISOString() }
          })
          .eq('id', memoryId)
          .eq('user_id', user.id)
      );
    }

    const results = await Promise.all(updates);
    const successCount = results.filter(r => !r.error).length;

    console.log(`[reinforce-memory] Updated ${successCount}/${memoryIds.length} memories`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: successCount,
        action 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reinforce-memory] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
