import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { captures } = await req.json();

    if (!captures || captures.length === 0) {
      throw new Error('No captures provided');
    }

    console.log(`Analyzing ${captures.length} visual captures for user ${user.id}`);

    // Process each capture with multimodal AI
    const insights: any[] = [];

    for (const capture of captures) {
      const { type, data } = capture;
      
      // Extract base64 data (remove data URL prefix)
      const base64Data = data.split(',')[1];

      // Call Lovable AI with vision capabilities
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a health and wellness assistant analyzing visual context. Extract insights about:
- Health-related activities or content visible
- Food items or meals visible
- Exercise or physical activity
- Stress indicators or work patterns
- Environmental factors affecting wellbeing
- Opportunities for health improvement

Provide structured insights that can guide proactive health recommendations.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this ${type} capture and extract health and wellness insights.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      if (!aiResponse.ok) {
        console.error(`AI analysis failed: ${aiResponse.status}`);
        continue;
      }

      const aiData = await aiResponse.json();
      const analysis = aiData.choices[0]?.message?.content;

      if (analysis) {
        insights.push({
          type,
          analysis,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Store insights in ai_memory
    if (insights.length > 0) {
      const memoryContent = insights.map(i => `${i.type}: ${i.analysis}`).join('\n\n');
      
      const { error: memoryError } = await supabase
        .from('ai_memory')
        .insert({
          user_id: user.id,
          memory_type: 'visual_context',
          content: memoryContent,
          confidence_score: 0.8,
          metadata: {
            capture_count: captures.length,
            insights,
            source: 'visual_context_analysis'
          }
        });

      if (memoryError) {
        console.error('Error storing memory:', memoryError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights_count: insights.length,
        insights 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in analyze-visual-context:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
