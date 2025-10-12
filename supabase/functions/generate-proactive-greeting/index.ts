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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
- Primary Language: ${context.user.language.inferred}
- Time: ${timeOfDay}
- Engagement Success Rate: ${(context.engagement_metrics.success_rate * 100).toFixed(0)}%

PERSONALITY SETTINGS:
${JSON.stringify(context.admin_settings.system_personality || {}, null, 2)}

RECENT CONTEXT:
${context.recent_activity.upcoming_events.length > 0 ? `Upcoming Events: ${context.recent_activity.upcoming_events.map(e => `${e.title} at ${new Date(e.start_time).toLocaleString()}`).join(', ')}` : ''}
${context.recent_activity.actions.length > 0 ? `Recent Actions: ${context.recent_activity.actions.map(a => a.title).slice(0, 3).join(', ')}` : ''}
${context.interests.length > 0 ? `Interests: ${context.interests.slice(0, 5).map(i => i.name).join(', ')}` : ''}

IMPORTANT GUIDELINES:
1. Generate a NATURAL, EMPATHETIC greeting that feels human and contextual
2. Reference specific context when relevant (upcoming events, recent activities, interests)
3. Vary your greetings - NEVER use generic robotic patterns like "Hello! How can I help you today?"
4. Match the user's experience level:
   - New users: Welcoming, orientation-focused
   - Experienced users: Goal-oriented, advanced features
5. Adapt tone to time of day and user's recent engagement
6. Keep it concise (1-2 sentences max)
7. If the user primarily speaks ${context.user.language.inferred}, respond in that language
8. Be genuinely helpful, not pushy
9. If engagement success rate is low (<40%), be more subtle and respectful of user's space

EXAMPLES OF GOOD GREETINGS:
- "Hi ${context.user.name}! I noticed your meditation session is coming up in 30 minutes. Would you like me to prepare a calming playlist?"
- "Welcome back! You've been making great progress with your fitness goals this week. Ready to continue?"
- "Good ${timeOfDay}! I see you're interested in ${context.interests[0]?.name || 'wellness'}. I found some community events that might interest you."

Generate a personalized greeting now.`;

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
          { role: 'user', content: 'Generate a personalized proactive greeting for this user based on their context.' }
        ],
        temperature: 0.9,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const greeting = data.choices[0].message.content.trim();

    console.log('Generated greeting for user:', user.id, greeting);

    // Log engagement for analytics
    await supabaseClient
      .from('proactive_engagement')
      .insert({
        user_id: user.id,
        engagement_type: 'greeting',
        context_snapshot: {
          time_of_day: timeOfDay,
          journey_stage: context.journey.stage,
          experience_level: context.journey.experience_level
        }
      });

    return new Response(JSON.stringify({ greeting, context }), {
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
