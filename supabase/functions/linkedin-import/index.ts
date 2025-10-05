import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, linkedinUrl, bioText } = await req.json();

    if (!userId || !linkedinUrl) {
      return new Response(
        JSON.stringify({ error: 'userId and linkedinUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If bioText is provided, use AI to parse it
    let parsedData = null;
    if (bioText) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

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
              content: `You are a LinkedIn profile parser. Extract structured information from LinkedIn bio text.
Return ONLY valid JSON with this structure:
{
  "headline": "Professional headline/title",
  "summary": "Professional summary (2-3 sentences max)",
  "skills": ["skill1", "skill2", "skill3"],
  "experience_count": number of years/roles mentioned,
  "key_achievements": ["achievement1", "achievement2"]
}
Be concise. If information is not present, use null or empty array.`
            },
            {
              role: 'user',
              content: `Parse this LinkedIn bio:\n\n${bioText}`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_linkedin_bio",
                description: "Extract structured data from LinkedIn bio",
                parameters: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    summary: { type: "string" },
                    skills: { type: "array", items: { type: "string" } },
                    experience_count: { type: "number" },
                    key_achievements: { type: "array", items: { type: "string" } }
                  },
                  required: ["headline", "summary"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "parse_linkedin_bio" } }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI parsing failed:', errorText);
        throw new Error('Failed to parse LinkedIn bio with AI');
      }

      const aiResult = await aiResponse.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        parsedData = JSON.parse(toolCall.function.arguments);
      }
    }

    // Update profile with LinkedIn data
    const updateData: any = {
      linkedin_url: linkedinUrl,
      linkedin_synced_at: new Date().toISOString(),
    };

    if (parsedData) {
      if (parsedData.headline) updateData.linkedin_headline = parsedData.headline;
      if (parsedData.summary) updateData.linkedin_summary = parsedData.summary;
      if (parsedData.skills?.length > 0) updateData.professional_skills = parsedData.skills;
      
      // Also update bio if it's empty or shorter than the new summary
      if (parsedData.summary) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('bio')
          .eq('user_id', userId)
          .single();
        
        if (!currentProfile?.bio || currentProfile.bio.length < parsedData.summary.length) {
          updateData.bio = parsedData.summary;
        }
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: parsedData ? Object.keys(parsedData).length : 0,
        data: parsedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('LinkedIn import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
