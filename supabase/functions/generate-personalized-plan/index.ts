import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getUserLocale, buildLocalizedSystemPrompt } from '../_shared/llm-locale.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planType, userContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }
    
    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Resolve user's preferred language so the plan is generated in their
    // language (German by default — the community is German-first).
    const userLocale = await getUserLocale(supabase, user.id);

    // Build AI prompt based on plan type
    const systemPrompt = buildLocalizedSystemPrompt(
      `You are an expert health coach specializing in ${planType} planning. Generate a personalized, evidence-based plan that is safe, effective, and tailored to the user's specific needs and conditions.`,
      userLocale,
    );
    
    const userPrompt = `Generate a ${planType} plan for a user with the following profile:
- Age Range: ${profile?.age_range || 'adult'}
- Gender: ${profile?.gender || 'not specified'}
- Activity Level: ${profile?.activity_level || 'moderate'}
- Medical Conditions: ${profile?.medical_conditions?.join(', ') || 'none'}
- Current Medications: ${profile?.medications?.join(', ') || 'none'}
- Health Goals: ${profile?.health_goals?.join(', ') || 'general wellness'}
- Vitana Index Score: ${userContext?.vitanaScore || 'not available'}
- Weakest Health Pillar: ${userContext?.weakestPillar || 'not specified'}

Provide a structured, personalized plan that is safe and appropriate for this user's profile. Include specific recommendations, daily/weekly targets, and actionable guidance.`;
    
    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_health_plan",
              description: "Generate structured health plan",
              parameters: {
                type: "object",
                properties: {
                  planName: { type: "string", description: "Name of the plan" },
                  duration: { type: "string", description: "Duration like '30 days' or '4 weeks'" },
                  goals: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of primary goals"
                  },
                  dailyPlan: { 
                    type: "object",
                    description: "Daily plan structure with targets and recommendations"
                  },
                  weeklyPlan: { 
                    type: "object",
                    description: "Weekly plan structure and schedule"
                  },
                  recommendations: { 
                    type: "array",
                    items: { type: "string" },
                    description: "List of key recommendations and tips"
                  }
                },
                required: ["planName", "goals", "dailyPlan", "recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_health_plan" } }
      }),
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI generation failed");
    }
    
    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }
    
    const planData = JSON.parse(toolCall.function.arguments);
    
    // Save to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('user_health_plans')
      .upsert({
        user_id: user.id,
        plan_type: planType,
        plan_data: planData,
        ai_generated: true,
        generated_at: new Date().toISOString(),
        active: true,
        adherence_score: 0
      }, {
        onConflict: 'user_id,plan_type'
      })
      .select()
      .single();
    
    if (saveError) {
      console.error("Database save error:", saveError);
      throw saveError;
    }
    
    return new Response(JSON.stringify({ plan: savedPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
