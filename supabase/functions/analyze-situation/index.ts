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

    const GOOGLE_VERTEX_API_KEY = Deno.env.get('GOOGLE_VERTEX_API_KEY');
    if (!GOOGLE_VERTEX_API_KEY) {
      throw new Error('GOOGLE_VERTEX_API_KEY not configured');
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

    const aiResponse = await fetch('https://europe-west1-aiplatform.googleapis.com/v1/projects/lovable-vitana-vers1/locations/europe-west1/publishers/google/models/gemini-2.5-flash-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_VERTEX_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Google Vertex AI error:', aiResponse.status, errorText);
      throw new Error(`Google Vertex AI error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisTime = Date.now() - startTime;
    
    // Extract content from Google Vertex AI response format
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('Unexpected AI response structure:', JSON.stringify(aiData));
      throw new Error('Invalid response from Google Vertex AI');
    }
    
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
