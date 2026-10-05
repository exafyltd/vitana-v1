import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getUserLocale, buildLocalizedSystemPrompt } from '../_shared/llm-locale.ts';
// VTID-04889: Claude via the gateway's Bedrock bridge only — no Gemini path (CLAUDE.md ALWAYS 10a–10c).
import { generateContent, extractFunctionCall, extractTextFromResponse } from '../_shared/bedrock-bridge-client.ts';
import { rawMatchesFromResponse, normalizeRecommendationMatches } from '../_shared/recommendation-matches.ts';

// Pinned on purpose: a model verified to invoke on this account (gateway .claude/rules/backend.md §2b), so this
// function never depends on the gateway's BEDROCK_MODEL_ID default.
const RECOMMENDATION_MODEL = 'eu.anthropic.claude-sonnet-4-6';

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

    const { type } = await req.json();
    console.log('[enhanced-recommendations] Generating', type, 'for user:', user.id);

    // Fetch user context
    const { data: contextData } = await supabaseClient.functions.invoke('fetch-user-context');
    const userContext = contextData || {};

    // Fetch candidates based on type
    let candidates: any[] = [];
    if (type === 'events' || type === 'all') {
      const { data: events } = await supabaseClient
        .from('global_community_events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);
      
      if (events) candidates.push(...events.map(e => ({ ...e, type: 'event' })));
    }

    if (type === 'groups' || type === 'all') {
      const { data: groups } = await supabaseClient
        .from('global_community_groups')
        .select('*')
        .limit(50);
      
      if (groups) candidates.push(...groups.map(g => ({ ...g, type: 'group' })));
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inject user-language directive so any free-text reasons are in
    // the user's preferred language (German by default).
    // (Fixed while touching this line: previously read the undefined
    // identifier `supabase` instead of `supabaseClient`, so every call threw
    // a ReferenceError here before ever reaching the AI provider.)
    const userLocale = await getUserLocale(supabaseClient, user.id);
    const aiResponse = await generateContent(
      '', // ignored by the bridge client (signature parity with the old Gemini client)
      [
        {
          role: 'system',
          content: buildLocalizedSystemPrompt(
            `You are VITANA's recommendation AI. Score community content (events, groups) based on user's interests, goals, and context.

Call the score_recommendations tool with the matches, their scores and reasons. Use only ids from the candidate list. Each match:
{"id": "uuid", "type": "event", "score": 0.85, "reasons": ["matches interest: yoga", "near your location"]}

Score range: 0.0 to 1.0. Only include items with score >= 0.3.`,
            userLocale,
          ),
        },
        {
          role: 'user',
          content: `Score these candidates for user:

USER CONTEXT:
Interests: ${userContext.interests?.map((i: any) => i.interest).join(', ') || 'None'}
Goals: ${userContext.goals?.map((g: any) => g.primary_goal).join(', ') || 'None'}
Location: ${userContext.profile?.location || 'Not specified'}
Recent Activities: ${userContext.recentDiaryEntries?.slice(0, 3).map((d: any) => d.text.substring(0, 100)).join('; ') || 'None'}

CANDIDATES:
${JSON.stringify(candidates.map(c => ({
  id: c.id,
  type: c.type,
  name: c.title || c.name,
  description: c.description,
  category: c.category || c.event_type,
  location: c.location,
  time: c.start_time
})))}

Call the score_recommendations tool with the matches.`
        }
      ],
      { model: RECOMMENDATION_MODEL, temperature: 0.4 },
      [{
        name: 'score_recommendations',
        description: 'Score community content recommendations',
        parameters: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['event', 'group'] },
                  score: { type: 'number' },
                  reasons: { type: 'array', items: { type: 'string' } }
                },
                required: ['id', 'type', 'score', 'reasons']
              }
            }
          },
          required: ['matches']
        }
      }]
    );

    const raw = rawMatchesFromResponse(extractFunctionCall(aiResponse), extractTextFromResponse(aiResponse));
    if (!raw) {
      throw new Error('No tool call in AI response');
    }

    // Only candidates this request read from the database, score clamped, threshold applied, reasons capped.
    const matches = normalizeRecommendationMatches(
      raw,
      candidates.map((c) => ({ id: String(c.id), type: c.type })),
    );

    console.log('[enhanced-recommendations] AI scored', matches.length, 'matches');

    // Store recommendations in database
    const eventMatches = matches.filter((m) => m.type === 'event');
    const groupMatches = matches.filter((m) => m.type === 'group');

    if (eventMatches.length > 0) {
      await supabaseClient.from('event_recommendations').upsert(
        eventMatches.map((m) => ({
          user_id: user.id,
          event_id: m.id,
          match_score: m.score,
          match_reasons: m.reasons,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })),
        { onConflict: 'user_id,event_id' }
      );
    }

    if (groupMatches.length > 0) {
      await supabaseClient.from('group_recommendations').upsert(
        groupMatches.map((m) => ({
          user_id: user.id,
          group_id: m.id,
          match_score: m.score,
          match_reasons: m.reasons,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })),
        { onConflict: 'user_id,group_id' }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        events: eventMatches.length,
        groups: groupMatches.length,
        recommendations: matches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[enhanced-recommendations] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
