import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    console.log('[extract-interests] Starting extraction for user:', user.id);

    // Fetch recent AI memories
    const { data: memories, error: memError } = await supabaseClient
      .from('ai_memory')
      .select('content, memory_type, confidence_score, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (memError) throw memError;

    // Fetch recent diary entries
    const { data: diaryEntries, error: diaryError } = await supabaseClient
      .from('diary_entries')
      .select('text, tags, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (diaryError) throw diaryError;

    if (!memories?.length && !diaryEntries?.length) {
      return new Response(
        JSON.stringify({ message: 'No data to extract interests from', extracted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context for AI
    const memoryContext = memories?.map(m => 
      `[${m.memory_type}] ${m.content} (confidence: ${m.confidence_score})`
    ).join('\n') || '';

    const diaryContext = diaryEntries?.map(d => 
      `${d.text} ${d.tags?.join(', ')}`
    ).join('\n') || '';

    // Call Lovable AI to extract interests
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are VITANA's interest extraction AI. Analyze user's memories and diary entries to identify their interests, hobbies, preferences, and goals. 

Return a JSON array of interests with confidence scores (0.0 to 1.0). Format:
[{"interest": "yoga", "confidence": 0.85, "source": "diary"}, ...]

Focus on: health activities, wellness practices, fitness, nutrition, mental health, social activities, learning interests, hobbies.`
          },
          {
            role: 'user',
            content: `Extract interests from this data:

MEMORIES:
${memoryContext}

DIARY ENTRIES:
${diaryContext}

Return only the JSON array, no other text.`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_interests',
            description: 'Extract user interests with confidence scores',
            parameters: {
              type: 'object',
              properties: {
                interests: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      interest: { type: 'string' },
                      confidence: { type: 'number' },
                      source: { type: 'string', enum: ['diary', 'ai', 'both'] }
                    },
                    required: ['interest', 'confidence', 'source']
                  }
                }
              },
              required: ['interests']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_interests' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[extract-interests] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const interests = extracted.interests || [];

    console.log('[extract-interests] Extracted', interests.length, 'interests');

    // Upsert interests into user_interests table
    const upsertPromises = interests.map((item: any) =>
      supabaseClient
        .from('user_interests')
        .upsert({
          user_id: user.id,
          interest: item.interest.toLowerCase(),
          confidence_score: item.confidence,
          source: item.source,
          metadata: { extracted_at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,interest' })
    );

    await Promise.all(upsertPromises);

    // Update metadata
    await supabaseClient
      .from('user_memory_metadata')
      .upsert({
        user_id: user.id,
        last_ai_sync_at: new Date().toISOString(),
        total_memories_count: memories?.length || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted: interests.length,
        interests: interests.map((i: any) => i.interest)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[extract-interests] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
