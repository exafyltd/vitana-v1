import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentBio, currentArchetype, selectedOptions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const wantsBio = selectedOptions?.includes("polish-bio");
    const wantsArchetype = selectedOptions?.includes("refresh-archetype");

    if (!wantsBio && !wantsArchetype) {
      return new Response(JSON.stringify({ bio: null, archetype: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a profile writing assistant for a wellness and longevity community platform called VITANA. 
Your job is to improve user profiles to be more engaging, authentic, and inspiring.
Keep the tone warm, professional, and health/wellness oriented.
Write in the same language as the user's current content. If their bio is in German, write in German. If in English, write in English.
Keep bios concise (2-3 sentences max). Keep archetypes as short poetic phrases (2-4 words like "The Mindful Mover" or "Der Achtsame Beweger").`;

    let userPrompt = "Please improve the following profile elements:\n\n";
    if (wantsBio) {
      userPrompt += `Current Bio: "${currentBio || 'No bio set'}"\n`;
    }
    if (wantsArchetype) {
      userPrompt += `Current Personality Descriptor/Archetype: "${currentArchetype || 'Not set'}"\n`;
    }

    const tools = [{
      type: "function",
      function: {
        name: "profile_suggestions",
        description: "Return improved profile text suggestions",
        parameters: {
          type: "object",
          properties: {
            ...(wantsBio ? { bio: { type: "string", description: "Improved bio text" } } : {}),
            ...(wantsArchetype ? { archetype: { type: "string", description: "Improved personality descriptor / archetype phrase" } } : {}),
          },
          required: [
            ...(wantsBio ? ["bio"] : []),
            ...(wantsArchetype ? ["archetype"] : []),
          ],
          additionalProperties: false,
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "profile_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No suggestions returned from AI");
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      bio: suggestions.bio || null,
      archetype: suggestions.archetype || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("autopilot-profile error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
