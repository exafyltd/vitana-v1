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
    const body = await req.json();
    const { user_id } = body;
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate the caller owns this user_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = claimsData.claims.sub;
    if (callerId !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Cannot access other user context' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for data fetching (bypasses RLS for aggregation)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userId = user_id;

    // Check cache first
    const { data: cachedContext } = await supabaseClient
      .from('proactive_context_cache')
      .select('context_data, expires_at')
      .eq('user_id', userId)
      .single();

    if (cachedContext && new Date(cachedContext.expires_at) > new Date() && !body.force_refresh) {
      console.log('Returning cached context for user:', userId);
      return new Response(JSON.stringify(cachedContext.context_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Computing fresh context for user:', userId);

    // Fetch all context data in parallel
    const [
      profileResult,
      journeyResult,
      preferencesResult,
      memoryResult,
      interestsResult,
      recentActionsResult,
      upcomingEventsResult,
      engagementResult,
      adminSettingsResult,
      recentDiaryResult
    ] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('display_name, full_name, age_range, gender, activity_level, timezone, preferred_languages, inferred_language')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseClient
        .from('user_journey')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseClient
        .from('ai_memory')
        .select('content, memory_type, confidence_score, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('confidence_score', { ascending: false })
        .limit(10),
      supabaseClient
        .from('user_interests')
        .select('interest, category, strength')
        .eq('user_id', userId)
        .order('strength', { ascending: false })
        .limit(10),
      supabaseClient
        .from('autopilot_actions')
        .select('title, category, priority, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseClient
        .from('calendar_events')
        .select('title, start_time, event_type')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: true })
        .limit(5),
      supabaseClient
        .from('proactive_engagement')
        .select('engagement_type, was_helpful, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseClient
        .from('admin_proactive_settings')
        .select('setting_key, setting_value'),
      supabaseClient
        .from('diary_entries')
        .select('text, source, tags, created_at, attachments')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const engagementData = engagementResult.data || [];
    const helpfulCount = engagementData.filter(e => e.was_helpful === true).length;
    const totalEngagements = engagementData.length;
    const engagementSuccessRate = totalEngagements > 0 ? (helpfulCount / totalEngagements) : 0.5;

    const context = {
      user: {
        id: userId,
        name: profileResult.data?.display_name || profileResult.data?.full_name || 'there',
        demographics: {
          age_range: profileResult.data?.age_range,
          gender: profileResult.data?.gender,
          activity_level: profileResult.data?.activity_level || 'moderate',
          timezone: profileResult.data?.timezone || 'UTC'
        },
        language: {
          preferred: profileResult.data?.preferred_languages || ['en'],
          inferred: profileResult.data?.inferred_language || preferencesResult.data?.stt_language || 'en'
        }
      },
      journey: {
        stage: journeyResult.data?.onboarding_stage || 'new',
        experience_level: journeyResult.data?.experience_level || 'beginner',
        engagement_score: journeyResult.data?.engagement_score || 0,
        days_active: journeyResult.data?.days_active || 0,
        milestones: journeyResult.data?.milestones || []
      },
      preferences: {
        autopilot_enabled: preferencesResult.data?.autopilot_enabled || false,
        auto_greeting_enabled: preferencesResult.data?.auto_greeting_enabled || false,
        greeting_frequency: preferencesResult.data?.greeting_frequency || 'session',
        stt_language: preferencesResult.data?.stt_language || 'en-US',
        tts_voice: preferencesResult.data?.tts_voice || 'alloy'
      },
      memory: {
        recent_facts: (() => {
          const profileName = profileResult.data?.display_name || profileResult.data?.full_name;
          const filtered = (memoryResult.data || []).filter(m => {
            // Filter out name-identity memories that conflict with the profile
            if (/\b(name is|called|goes by|known as|my name|i am|i'm)\b/i.test(m.content)) {
              if (profileName && !m.content.toLowerCase().includes(profileName.toLowerCase())) {
                console.log(`[context] Filtered conflicting name memory: "${m.content}" (profile: ${profileName})`);
                return false;
              }
            }
            return true;
          });
          return filtered.map(m => ({
            content: m.content,
            type: m.memory_type,
            confidence: m.confidence_score,
            date: m.created_at
          }));
        })()
      },
      interests: (interestsResult.data || []).map(i => ({
        name: i.interest,
        category: i.category,
        strength: i.strength
      })),
      recent_activity: {
        actions: (recentActionsResult.data || []).map(a => ({
          title: a.title,
          category: a.category,
          priority: a.priority,
          status: a.status,
          date: a.created_at
        })),
        upcoming_events: (upcomingEventsResult.data || []).map(e => ({
          title: e.title,
          start_time: e.start_time,
          type: e.event_type
        }))
      },
      engagement_metrics: {
        success_rate: engagementSuccessRate,
        total_interactions: totalEngagements,
        recent_helpful: helpfulCount
      },
      admin_settings: (adminSettingsResult.data || []).reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>),
      diary_insights: {
        recent_entries: (recentDiaryResult.data || []).map(e => ({
          content: e.text.substring(0, 500),
          source: e.source,
          tags: e.tags,
          date: e.created_at,
          has_attachments: (e.attachments && e.attachments.length > 0)
        }))
      },
      computed_at: new Date().toISOString()
    };

    // Cache the context for 1 hour
    await supabaseClient
      .from('proactive_context_cache')
      .upsert({
        user_id: userId,
        context_data: context,
        computed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }, {
        onConflict: 'user_id'
      });

    console.log('Context computed and cached for user:', userId);

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching proactive context:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
