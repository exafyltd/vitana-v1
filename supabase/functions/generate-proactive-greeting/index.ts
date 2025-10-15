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
    const { override_language } = body;
    
    // RULE 1: Validate language
    const ALLOWED_LANGUAGES = ['en-US', 'sr-RS', 'de-DE', 'ar-XA', 'es-ES', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-PT'];
    const targetLanguage = override_language || 'en-US';
    
    if (!ALLOWED_LANGUAGES.includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: `Invalid language: ${targetLanguage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[greeting] RULE: target_language=', targetLanguage);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Get comprehensive user context
    const contextResponse = await supabaseClient.functions.invoke('get-proactive-context');
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

    // Build personalized system prompt
    const systemPrompt = `You are a warm, empathetic AI assistant for Vitana, a holistic wellness and community platform.

USER CONTEXT:
- Name: ${context.user.name}
- Experience Level: ${context.journey.experience_level}
- Journey Stage: ${context.journey.stage}
- Time: ${timeOfDay}
- Engagement Success Rate: ${(context.engagement_metrics.success_rate * 100).toFixed(0)}%

RECENT CONTEXT:
${context.recent_activity.upcoming_events.length > 0 ? `Upcoming Events: ${context.recent_activity.upcoming_events.map(e => `${e.title} at ${new Date(e.start_time).toLocaleString()}`).join(', ')}` : ''}
${context.recent_activity.actions.length > 0 ? `Recent Actions: ${context.recent_activity.actions.map(a => a.title).slice(0, 3).join(', ')}` : ''}
${context.interests.length > 0 ? `Interests: ${context.interests.slice(0, 5).map(i => i.name).join(', ')}` : ''}

IMPORTANT GUIDELINES:
1. Generate a NATURAL, EMPATHETIC greeting that feels human and contextual
2. Reference specific context when relevant (upcoming events, recent activities, interests)
3. Vary your greetings - NEVER use generic robotic patterns
4. Match the user's experience level (new users: welcoming; experienced: goal-oriented)
5. Adapt tone to time of day and user's recent engagement
6. Keep it concise (1-2 sentences max)
7. Be genuinely helpful, not pushy

Generate a personalized greeting now.`;

    // Call Gemini API - Phase 1
    const { generateContent } = await import("../_shared/gemini-client.ts");
    const greetingResponse = await generateContent(
      GEMINI_API_KEY,
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
    
    console.log('[greeting] Phase 1 output:', initialGreeting.substring(0, 100));

    // RULE 4: Phase 2 - Translator pass
    const LANGUAGE_NAMES: Record<string, string> = {
      'en-US': 'English', 'sr-RS': 'Serbian', 'de-DE': 'German',
      'ar-XA': 'Arabic', 'es-ES': 'Spanish', 'ru-RU': 'Russian',
      'zh-CN': 'Chinese', 'fr-FR': 'French', 'pt-PT': 'Portuguese'
    };
    
    const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || 'English';
    
    // Phase 2 - Translation
    const translateResp = await generateContent(
      GEMINI_API_KEY,
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

    console.log('[greeting] RULE: Translation complete:', greeting.substring(0, 100));

    // Log engagement for analytics
    await supabaseClient
      .from('proactive_engagement')
      .insert({
        user_id: user.id,
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
