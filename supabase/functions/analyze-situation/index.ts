import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { situation, contextFilters, constraints } = await req.json();
    console.log('Analyzing situation:', situation);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an automation expert analyzing healthcare scenarios to suggest automation rules.

Your task is to analyze the given situation and provide structured automation recommendations.

Return a JSON object with this exact structure:
{
  "analysis": "Brief analysis of the situation and automation opportunities",
  "suggestedTriggers": ["trigger1", "trigger2"],
  "suggestedConditions": [
    {"field": "field_name", "operator": "equals", "value": "value", "reasoning": "why this condition"}
  ],
  "suggestedActions": [
    {"type": "send_notification", "config": {"title": "...", "message": "..."}, "reasoning": "why this action"}
  ],
  "priority": "high|medium|low",
  "estimatedImpact": "Description of expected impact"
}

Available triggers: user_signup, message_received, appointment_scheduled, health_metric_updated, user_inactive, notification_sent
Available condition fields: user_role, user_status, time_of_day, day_of_week, inactive_days
Available operators: equals, not_equals, greater_than, less_than, contains
Available actions: send_email, send_sms, send_notification, create_task`;

    const userPrompt = `Analyze this situation and suggest automation:

Situation: ${situation}

${contextFilters ? `Context: ${JSON.stringify(contextFilters)}` : ''}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ''}

Provide automation recommendations.`;

    const startTime = Date.now();

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisTime = Date.now() - startTime;
    
    const content = aiData.choices[0].message.content;
    console.log('AI response:', content);
    
    const analysisResult = JSON.parse(content);

    // Store analysis in database
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('ai_situation_analyses')
      .insert({
        situation_description: situation,
        created_by: user.id,
        context_filters: contextFilters || null,
        constraints: constraints || null,
        analysis_result: analysisResult,
        suggested_triggers: analysisResult.suggestedTriggers || [],
        suggested_conditions: analysisResult.suggestedConditions || null,
        suggested_actions: analysisResult.suggestedActions || null,
        analysis_duration_ms: analysisTime,
        status: 'completed'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis,
        analysisTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-situation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
