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
    // Extract and validate auth token
    const rawAuthHeader = req.headers.get('Authorization') || '';
    const token = rawAuthHeader.startsWith('Bearer ') ? rawAuthHeader.slice(7).trim() : '';
    const authHeader = token && token !== 'undefined' && token !== 'null' ? `Bearer ${token}` : null;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    let user: any = null;
    try {
      if (authHeader) {
        const { data: { user: u } } = await supabaseClient.auth.getUser();
        user = u ?? null;
      }
    } catch (_) {
      // proceed as guest
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get comprehensive user context with fallback (guest-safe)
    let context: any;
    if (user) {
      const contextResponse = await supabaseClient.functions.invoke('get-proactive-context', {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      if (contextResponse.error) {
        console.warn('Failed to fetch user context:', contextResponse.error);
        context = {
          user: { name: user.user_metadata?.name || 'there', language: { inferred: 'en' } },
          journey: { experience_level: 'beginner', stage: 'onboarding', days_active: 1 },
          engagement_metrics: { success_rate: 0.5 },
          admin_settings: { system_personality: {} },
          interests: [],
          recent_activity: { upcoming_events: [], actions: [], diary_entries: [] }
        };
      } else {
        context = contextResponse.data;
      }
    } else {
      context = {
        user: { name: 'there', language: { inferred: 'en' } },
        journey: { experience_level: 'beginner', stage: 'onboarding', days_active: 1 },
        engagement_metrics: { success_rate: 0.5 },
        admin_settings: { system_personality: {} },
        interests: [],
        recent_activity: { upcoming_events: [], actions: [], diary_entries: [] }
      };
    }

    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'day';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Determine priority items
    const upcomingEvents = context.recent_activity?.upcoming_events || [];
    const nearbyEvents = upcomingEvents.filter((e: any) => {
      const eventTime = new Date(e.start_time).getTime();
      const now = Date.now();
      const hoursUntil = (eventTime - now) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil < 2;
    });

    const pendingActions = context.recent_activity?.actions?.filter((a: any) => a.status === 'pending') || [];
    const recentDiary = context.recent_activity?.diary_entries?.slice(0, 1) || [];

    // Build priority context for message generation
    let priorityContext = '';
    let messageType = 'guidance';
    let priority = 'medium';

    if (nearbyEvents.length > 0) {
      const event = nearbyEvents[0];
      const eventTime = new Date(event.start_time);
      const minutesUntil = Math.floor((eventTime.getTime() - Date.now()) / (1000 * 60));
      priorityContext = `URGENT: Event "${event.title}" starts in ${minutesUntil} minutes at ${eventTime.toLocaleTimeString()}`;
      messageType = 'reminder';
      priority = 'high';
    } else if (pendingActions.length > 0) {
      const action = pendingActions[0];
      priorityContext = `Pending action: ${action.title} (${action.category})`;
      messageType = 'suggestion';
      priority = 'medium';
    } else if (context.journey.days_active === 1) {
      priorityContext = 'User is new to the platform (day 1)';
      messageType = 'greeting';
      priority = 'medium';
    } else if (recentDiary.length > 0) {
      priorityContext = 'User recently logged diary entry';
      messageType = 'encouragement';
      priority = 'low';
    } else if (timeOfDay === 'morning') {
      priorityContext = 'Morning time, start of day';
      messageType = 'check-in';
      priority = 'low';
    } else {
      priorityContext = 'General wellness guidance';
      messageType = 'guidance';
      priority = 'low';
    }

    // Map language codes to full language names
    const languageMap: Record<string, string> = {
      'en-US': 'English',
      'de-DE': 'German',
      'fr-FR': 'French',
      'es-ES': 'Spanish',
      'sr-RS': 'Serbian',
      'ar-XA': 'Arabic',
      'ru-RU': 'Russian',
      'zh-CN': 'Chinese',
      'pt-PT': 'Portuguese'
    };

    // Get user's language preference (from preferences or fallback to inferred)
    const langCode = context.preferences?.stt_language || context.user?.language?.inferred || 'en-US';
    const languageName = languageMap[langCode] || 'English';

    // Build personalized system prompt with CRITICAL language requirement at top
    const systemPrompt = `🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
YOU MUST RESPOND ENTIRELY IN ${languageName.toUpperCase()} ONLY.
DO NOT use English or any other language. The user's voice system is configured for ${languageName}.
This is MANDATORY and NON-NEGOTIABLE. All text must be in ${languageName}.

You are a warm, empathetic AI assistant for Vitana, a holistic wellness and community platform.

USER CONTEXT:
- Name: ${context.user.name}
- Experience Level: ${context.journey.experience_level}
- Journey Stage: ${context.journey.stage}
- Days Active: ${context.journey.days_active}
- Preferred Language: ${languageName} (${langCode})
- Time: ${timeOfDay}
- Engagement Success Rate: ${(context.engagement_metrics.success_rate * 100).toFixed(0)}%

PRIORITY CONTEXT:
${priorityContext}

PERSONALITY SETTINGS:
${JSON.stringify(context.admin_settings.system_personality || {}, null, 2)}

RECENT CONTEXT:
${upcomingEvents.length > 0 ? `Upcoming Events: ${upcomingEvents.slice(0, 2).map((e: any) => `${e.title} at ${new Date(e.start_time).toLocaleString()}`).join(', ')}` : 'No upcoming events'}
${context.interests.length > 0 ? `Interests: ${context.interests.slice(0, 5).map((i: any) => i.name).join(', ')}` : ''}

MESSAGE TYPES (choose most relevant based on PRIORITY CONTEXT):
1. REMINDER - Urgent: events, tasks, appointments (use for nearby events)
2. GUIDANCE - Wellness tips, health insights (general wellness)
3. ENCOURAGEMENT - Celebrate progress, acknowledge efforts
4. SUGGESTION - Connect with community, try features (for pending actions)
5. CHECK-IN - Ask about wellbeing, feelings (morning/evening)
6. GREETING - Welcome, onboarding (new users)

IMPORTANT GUIDELINES:
1. Generate ONE contextual message (1-2 sentences max)
2. Reference specific context when available (event names, times, achievements)
3. Match the user's experience level and engagement patterns
4. Be warm and empathetic, not pushy or robotic
5. If engagement success rate is low (<40%), be more subtle
6. For high priority items, be clear and action-oriented
7. For low priority, be gentle and supportive

EXAMPLES:
- High priority: "Hi ${context.user.name}! Your meditation session starts in 30 minutes. Would you like me to set a reminder?"
- Medium priority: "I noticed you're interested in ${context.interests[0]?.name || 'wellness'}. There's a new community group you might enjoy."
- Low priority: "Good ${timeOfDay}! How are you feeling today? I'm here if you need anything."

Generate a personalized ${messageType} message now based on the PRIORITY CONTEXT.`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a personalized ${messageType} message for this user based on the priority context provided.` }
        ],
        temperature: 0.9,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const message = data.choices[0].message.content.trim();

    if (user?.id) {
      console.log(`Generated ${messageType} message for user:`, user.id, message);

      // Log engagement for analytics
      await supabaseClient
        .from('proactive_engagement')
        .insert({
          user_id: user.id,
          engagement_type: messageType,
          context_snapshot: {
            time_of_day: timeOfDay,
            journey_stage: context.journey.stage,
            experience_level: context.journey.experience_level,
            priority_context: priorityContext,
            priority: priority
          }
        });
    } else {
      console.log(`Generated ${messageType} message (guest):`, message);
    }

    return new Response(JSON.stringify({ 
      message, 
      messageType, 
      priority,
      context,
      mode: user?.id ? 'user' : 'guest'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating proactive message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
