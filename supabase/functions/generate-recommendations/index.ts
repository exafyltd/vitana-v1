import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { getUserLocale, buildLocalizedSystemPrompt } from '../_shared/llm-locale.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationRequest {
  type: 'people' | 'groups' | 'events' | 'coaches' | 'live-rooms';
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, limit = 10 } = await req.json() as RecommendationRequest;
    
    console.log('Generating recommendations:', { type, limit });

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch user context for personalization
    console.log('Fetching user context...');
    const contextResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-user-context`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    const { context: userContext } = contextResponse.ok 
      ? await contextResponse.json() 
      : { context: null };

    console.log('User context loaded:', {
      hasContext: !!userContext,
      userName: userContext?.identity?.displayName
    });

    // Fetch candidates based on type
    let candidates: any[] = [];
    
    switch (type) {
      case 'people': {
        // Fetch community profiles (excluding self)
        const { data } = await supabaseClient
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url, bio, interests, location')
          .eq('is_visible', true)
          .neq('user_id', user.id)
          .limit(50);
        candidates = data || [];
        break;
      }
      
      case 'groups': {
        // Fetch community groups
        const { data } = await supabaseClient
          .from('global_community_groups')
          .select('id, name, description, avatar_url, category, member_count, is_public')
          .eq('is_public', true)
          .order('member_count', { ascending: false })
          .limit(50);
        candidates = data || [];
        break;
      }
      
      case 'events': {
        // Fetch upcoming community events
        const { data } = await supabaseClient
          .from('global_community_events')
          .select('id, title, description, location, start_time, end_time, max_participants, image_url, category')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(50);
        candidates = data || [];
        break;
      }
      
      case 'coaches':
      case 'live-rooms': {
        // For coaches and live rooms, use people with professional roles
        const { data } = await supabaseClient
          .from('profiles')
          .select('user_id, display_name, avatar_url, bio')
          .neq('user_id', user.id)
          .limit(50);
        candidates = data || [];
        break;
      }
    }

    console.log(`Found ${candidates.length} candidates for ${type}`);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: `No ${type} available at this time`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build AI prompt for intelligent matching
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    let systemPrompt = `You are an intelligent matchmaking AI that recommends ${type} based on user preferences, interests, and wellness goals.

Analyze the user's profile and recommend the most compatible ${type} from the provided list.`;

    if (userContext) {
      const { identity, memory, health, temporal } = userContext;
      
      systemPrompt += `\n\n=== USER PROFILE ===`;
      systemPrompt += `\nUser: ${identity.displayName}`;
      systemPrompt += `\nWorkspace: ${identity.tenantName}`;
      
      if (health.vitanaIndex) {
        systemPrompt += `\nVitana Index: ${health.vitanaIndex}/999`;
      }
      
      if (memory.learnedPreferences && Object.keys(memory.learnedPreferences).length > 0) {
        systemPrompt += `\n\n=== USER PREFERENCES ===`;
        Object.entries(memory.learnedPreferences).slice(0, 10).forEach(([key, value]) => {
          systemPrompt += `\n- ${key}: ${value}`;
        });
      }
      
      if (memory.rememberedInsights.length > 0) {
        systemPrompt += `\n\n=== USER GOALS & INTERESTS ===`;
        memory.rememberedInsights.slice(0, 5).forEach(insight => {
          systemPrompt += `\n- ${insight.content}`;
        });
      }
      
      if (memory.patterns.length > 0) {
        systemPrompt += `\n\n=== USER PATTERNS ===`;
        memory.patterns.slice(0, 3).forEach(pattern => {
          systemPrompt += `\n- ${pattern.description} (${pattern.frequency})`;
        });
      }
    }

    systemPrompt += `\n\n=== TASK ===
Score each ${type.slice(0, -1)} on compatibility (0-100) based on:
1. Shared interests and values
2. Alignment with user's wellness goals
3. Compatibility with user's preferences and patterns
4. Potential for meaningful connection or growth

Return ONLY a JSON array of top ${limit} recommendations, each with:
{
  "id": "candidate_id",
  "compatibility_score": 85,
  "match_reason": "Brief reason for high compatibility (max 100 chars)"
}

Sort by compatibility_score descending.`;

    const userPrompt = `Candidates:\n${JSON.stringify(candidates, null, 2)}`;

    // Inject user-language directive so reasoning/labels in the output
    // respect the user's preferred language (German by default).
    const userLocale = await getUserLocale(supabase, user.id);
    systemPrompt = buildLocalizedSystemPrompt(systemPrompt, userLocale);

    console.log('Calling Gemini API for intelligent matching...');
    const { generateContent } = await import("../_shared/gemini-client.ts");
    const aiResponse = await generateContent(
      geminiApiKey,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.5 }
    );

    const aiText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      throw new Error('No response from Gemini API');
    }
    console.log('AI matching complete');

    let matchedIds: Array<{ id: string; compatibility_score: number; match_reason: string }> = [];
    
    try {
      const parsed = JSON.parse(aiText);
      matchedIds = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback: return random candidates
      matchedIds = candidates.slice(0, limit).map((c, i) => ({
        id: c.id || c.user_id,
        compatibility_score: 80 - i * 5,
        match_reason: 'Suggested based on your profile'
      }));
    }

    // Merge AI scores with candidate data
    const recommendations = matchedIds
      .map(match => {
        const candidate = candidates.find(c => 
          (c.id === match.id) || (c.user_id === match.id)
        );
        if (!candidate) return null;
        
        return {
          ...candidate,
          compatibility_score: match.compatibility_score,
          match_reason: match.match_reason
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    console.log(`Returning ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({ 
        recommendations,
        type,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recommendations function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
