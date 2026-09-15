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
    const { override_language, user_id } = body;
    
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
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate language
    const ALLOWED_LANGUAGES = ['en-US', 'sr-RS', 'de-DE', 'ar-XA', 'es-ES', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-PT'];
    const targetLanguage = override_language || 'en-US';
    
    if (!ALLOWED_LANGUAGES.includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: `Invalid language: ${targetLanguage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[greeting] target_language=', targetLanguage);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Aurora migration B7 (VTID-03764 chain): see generate-enhanced-
    // recommendations/index.ts for the full rationale. Defaults to
    // 'gemini' — unchanged behavior until a deployment opts into 'bedrock'.
    const aiBridgeProvider = Deno.env.get('AI_BRIDGE_PROVIDER') || 'gemini';
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (aiBridgeProvider === 'gemini' && !GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Get comprehensive user context - pass auth header through
    const contextResponse = await supabaseClient.functions.invoke('get-proactive-context', {
      body: { user_id },
      headers: authHeader ? { Authorization: authHeader } : {}
    });
    if (contextResponse.error) {
      throw contextResponse.error;
    }
    const context = contextResponse.data;

    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'day';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // BOOTSTRAP-ORB-NO-HARDCODED-GREETING: ground the proactive greeting in the
    // user's REAL guided-journey progress (sessions done, where they left off,
    // the concrete next session + its topic). Without this the LLM produces a
    // generic, ungrounded "welcome back, let me show you your next step" line —
    // the exact empty greeting the product rule forbids. Fail-open: any query
    // miss leaves journeyGrounding empty and the greeting falls back to the
    // prior (still-LLM) behaviour, never an error.
    let journeyGrounding = '';
    try {
      const { data: gj } = await supabaseClient
        .from('user_guided_journey_state')
        .select('current_session, mode, completed_topic_ids, last_opened_topic_id')
        .eq('user_id', user_id)
        .maybeSingle();
      if (gj) {
        const localeShort = (targetLanguage || 'en-US').slice(0, 2).toLowerCase();
        const currentSession = Number(gj.current_session) || 1;
        const completedCount = Array.isArray(gj.completed_topic_ids) ? gj.completed_topic_ids.length : 0;

        // Resolve a topic's display label, preferring the user's locale and
        // falling back to English. Titles live in the translations table.
        const labelForTopic = async (topicId: string | null): Promise<string | null> => {
          if (!topicId) return null;
          const { data: rows } = await supabaseClient
            .from('journey_checklist_translations')
            .select('locale, display_label')
            .eq('topic_id', topicId)
            .in('locale', [localeShort, `${localeShort}-${localeShort.toUpperCase()}`, 'en']);
          if (!Array.isArray(rows) || rows.length === 0) return null;
          const pick =
            rows.find((r: any) => (r.locale || '').toLowerCase().startsWith(localeShort)) ||
            rows.find((r: any) => r.locale === 'en') ||
            rows[0];
          const label = (pick?.display_label || '').trim();
          return label.length > 0 ? label : null;
        };

        // The lead topic of the session the user is on (lowest position).
        const { data: nextTopics } = await supabaseClient
          .from('journey_checklist_topics')
          .select('topic_id, position')
          .eq('session', currentSession)
          .eq('enabled', true)
          .order('position', { ascending: true })
          .limit(1);
        const nextTopicId = Array.isArray(nextTopics) && nextTopics[0] ? nextTopics[0].topic_id : null;
        const nextLabel = await labelForTopic(nextTopicId);
        const lastLabel = await labelForTopic(gj.last_opened_topic_id ?? null);

        const lines: string[] = [
          `- Mode: ${gj.mode === 'full' ? 'full app' : 'guided journey'}`,
          `- Guided sessions completed: ${Math.max(0, currentSession - 1)} (topics done: ${completedCount})`,
          `- Next up: Session ${currentSession}${nextLabel ? ` — "${nextLabel}"` : ''}`,
        ];
        if (lastLabel) lines.push(`- Where they left off (you may recall this): "${lastLabel}"`);
        journeyGrounding = `\n\nGUIDED JOURNEY (ground the greeting in THIS — name the concrete next step, never a vague "next step"):\n${lines.join('\n')}`;
      }
    } catch (_gjErr) {
      // fail-open — no grounding block, greeting still generated
    }

    const systemPrompt = `You are a warm, empathetic AI assistant for Vitana, a holistic wellness and community platform.

USER CONTEXT:
- Name: ${context.user.name}
- Experience Level: ${context.journey.experience_level}
- Journey Stage: ${context.journey.stage}
- Time: ${timeOfDay}
- Engagement Success Rate: ${(context.engagement_metrics.success_rate * 100).toFixed(0)}%${journeyGrounding}

RECENT CONTEXT:
${context.recent_activity.upcoming_events.length > 0 ? `Upcoming Events: ${context.recent_activity.upcoming_events.map(e => `${e.title} at ${new Date(e.start_time).toLocaleString()}`).join(', ')}` : ''}
${context.recent_activity.actions.length > 0 ? `Recent Actions: ${context.recent_activity.actions.map(a => a.title).slice(0, 3).join(', ')}` : ''}
${context.interests.length > 0 ? `Interests: ${context.interests.slice(0, 5).map(i => i.name).join(', ')}` : ''}

IMPORTANT GUIDELINES:
1. Generate a NATURAL, EMPATHETIC greeting that feels human and contextual
2. When a GUIDED JOURNEY block is present, GROUND the greeting in it: name the
   concrete next move (e.g. the specific Session + topic) and/or recall where
   they left off. You LEAD with that concrete step.
3. NEVER end on a vague, content-free line like "let me show you your next
   step" / "Lass mich dir deinen nächsten Schritt zeigen" / "welcome back, let
   me guide you" — if you don't name a CONCRETE next move, you have failed.
   Never ask the user what they want to do; propose the next step.
4. Vary your greetings - NEVER use generic robotic patterns
5. Match the user's experience level (new users: welcoming; experienced: goal-oriented)
6. Adapt tone to time of day and user's recent engagement
7. Keep it concise (1-2 sentences max)
8. Be genuinely helpful, not pushy

Generate a personalized greeting now.`;

    const { generateContent } = await import(
      aiBridgeProvider === 'bedrock' ? '../_shared/bedrock-bridge-client.ts' : '../_shared/gemini-client.ts'
    );
    const greetingResponse = await generateContent(
      GEMINI_API_KEY ?? '',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate a personalized proactive greeting for this user based on their context.' }
      ],
      { temperature: 0.4 }
    );

    const initialGreeting = greetingResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!initialGreeting) {
      throw new Error('Failed to generate greeting');
    }

    const LANGUAGE_NAMES: Record<string, string> = {
      'en-US': 'English', 'sr-RS': 'Serbian', 'de-DE': 'German',
      'ar-XA': 'Arabic', 'es-ES': 'Spanish', 'ru-RU': 'Russian',
      'zh-CN': 'Chinese', 'fr-FR': 'French', 'pt-PT': 'Portuguese'
    };
    
    const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || 'English';
    
    const translateResp = await generateContent(
      GEMINI_API_KEY ?? '',
      [
        {
          role: 'system',
          content: `You are a precise translator. Translate the user content to ${targetLanguageName} only. Preserve tone, brevity, and natural phrasing. Output ONLY the translated message, no explanations.`
        },
        { role: 'user', content: initialGreeting }
      ],
      { temperature: 0 }
    );

    const greeting = translateResp.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!greeting) {
      throw new Error(`Translation to ${targetLanguageName} produced no output`);
    }

    // Log engagement for analytics
    await supabaseClient
      .from('proactive_engagement')
      .insert({
        user_id: user_id,
        engagement_type: 'greeting',
        context_snapshot: {
          time_of_day: timeOfDay,
          journey_stage: context.journey.stage,
          experience_level: context.journey.experience_level,
          language: targetLanguage,
          rule_based: true
        }
      });

    return new Response(JSON.stringify({ 
      greeting, 
      context,
      resolved_language: targetLanguage,
      resolved_language_name: targetLanguageName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating greeting:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
