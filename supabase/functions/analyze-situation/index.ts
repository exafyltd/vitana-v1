import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { generateContent, extractFunctionCall, type GeminiToolDeclaration } from "../_shared/gemini-client.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log authorization header presence for diagnostics
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    if (authHeader) {
      console.log('Auth header preview:', authHeader.substring(0, 20) + '...');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
    if (!token) {
      console.error('Authentication failed: missing bearer token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const { situation, contextFilters, constraints } = await req.json();
    console.log('Analyzing situation:', situation);

    // Use Gemini API
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const systemPrompt = `You are an automation expert analyzing healthcare scenarios to suggest automation rules.

Your task is to analyze the given situation and provide structured automation recommendations.

Available triggers: user_signup, message_received, appointment_scheduled, health_metric_updated, user_inactive, notification_sent
Available condition fields: user_role, user_status, time_of_day, day_of_week, inactive_days
Available operators: equals, not_equals, greater_than, less_than, contains
Available actions: send_email, send_sms, send_notification, create_task`;

    const userPrompt = `Analyze this situation and suggest automation:

Situation: ${situation}

${contextFilters ? `Context: ${JSON.stringify(contextFilters)}` : ''}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ''}

Provide automation recommendations.`;

    const tool: GeminiToolDeclaration = {
      name: "propose_automation",
      description: "Return structured automation recommendations.",
      parameters: {
        type: "object",
        properties: {
          analysis: { type: "string" },
          suggestedTriggers: {
            type: "array",
            items: {
              type: "string",
              enum: ["user_signup", "message_received", "appointment_scheduled", "health_metric_updated", "user_inactive", "notification_sent"]
            }
          },
          suggestedConditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", enum: ["user_role","user_status","time_of_day","day_of_week","inactive_days"] },
                operator: { type: "string", enum: ["equals","not_equals","greater_than","less_than","contains"] },
                value: { anyOf: [{ type: "string" },{ type: "number" },{ type: "boolean" }] },
                reasoning: { type: "string" }
              },
              required: ["field","operator","value"],
            }
          },
          suggestedActions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["send_email","send_sms","send_notification","create_task"] },
                config: { type: "object" },
                reasoning: { type: "string" }
              },
              required: ["type","config"],
            }
          },
          priority: { type: "string", enum: ["high","medium","low"] },
          estimatedImpact: { type: "string" }
        },
        required: ["analysis","suggestedTriggers","suggestedConditions","suggestedActions","priority","estimatedImpact"],
      }
    };

    const startTime = Date.now();
    const aiResp = await generateContent(
      GEMINI_API_KEY,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.7 },
      [tool]
    );

    const analysisTime = Date.now() - startTime;

    const functionCall = extractFunctionCall(aiResp);
    if (!functionCall) {
      throw new Error('AI did not return structured data');
    }

    let analysisResult = functionCall.args;

    // Normalize data to prevent DB insert failures
    analysisResult = {
      analysis: String(analysisResult.analysis || ""),
      suggestedTriggers: Array.isArray(analysisResult.suggestedTriggers) ? analysisResult.suggestedTriggers : [],
      suggestedConditions: Array.isArray(analysisResult.suggestedConditions) ? analysisResult.suggestedConditions : [],
      suggestedActions: Array.isArray(analysisResult.suggestedActions) ? analysisResult.suggestedActions : [],
      priority: ["high","medium","low"].includes(analysisResult.priority) ? analysisResult.priority : "medium",
      estimatedImpact: String(analysisResult.estimatedImpact || "")
    };

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
