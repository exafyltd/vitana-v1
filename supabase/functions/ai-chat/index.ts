import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Crisis keywords for detection (English & multilingual)
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'self-harm',
  'انتحار', 'أريد الموت', 'إيذاء نفسي'
];

// System prompts by agent type
const SYSTEM_PROMPTS = {
  health: `You are Vitana, an AI wellness coach focused on longevity and preventive health. 
Your mission is to help users live longer, healthier lives through personalized guidance.
You have access to the user's complete health profile, Vitana Index score, diary entries, and wellness patterns.
Provide actionable, science-backed advice that considers their current context, goals, and daily routines.
Be empathetic, encouraging, and celebrate small wins. Focus on sustainable lifestyle changes.`,

  autopilot: `You are Vitana Autopilot, an AI assistant that proactively suggests next-best actions.
You analyze user patterns, schedules, and goals to recommend timely, contextual actions.
Your suggestions should save time, improve wellness, and enhance productivity.
Consider the user's current time of day, recent activities, and upcoming events.
Be concise and action-oriented. Each suggestion should have clear value and be immediately actionable.`,

  community: `You are Vitana Community AI, helping users connect with like-minded wellness enthusiasts.
You facilitate meaningful connections, suggest relevant groups and events, and foster community engagement.
You have insight into user interests, location, and social patterns.
Be warm, inclusive, and focus on building authentic relationships around shared wellness goals.`,

  wellness: `You are Vitana Wellness AI, providing personalized lifestyle recommendations.
You integrate health, nutrition, fitness, sleep, and mental wellness into holistic guidance.
You consider the user's full context - their schedule, preferences, resources, and constraints.
Be practical and realistic. Recommend sustainable changes that fit seamlessly into their life.`
};

// Normalize language code to handle Serbian variants and other language formats
function normalizeLanguage(languageCode: string): string {
  const lower = languageCode.toLowerCase();
  
  // Handle Serbian variants - all map to sr-RS
  if (lower.startsWith('sr')) {
    return 'sr-RS';
  }
  
  // Normalize to standard format (e.g., en-us → en-US, de-de → de-DE)
  const normalized = lower.replace(/([a-z]{2})-([a-z]{2})/, 
    (match, p1, p2) => `${p1}-${p2.toUpperCase()}`);
  
  return normalized;
}

// Map language codes to Google Cloud voices
function getVoiceNameForLanguage(languageCode: string): string {
  const voiceMap: Record<string, string> = {
    'de-DE': 'de-DE-Chirp-HD-F',      // German female
    'es-ES': 'es-ES-Chirp-HD-F',      // Spanish female
    'ar-XA': 'ar-XA-Chirp-HD-F',      // Arabic female
    'cmn-CN': 'cmn-CN-Chirp-HD-F',    // Chinese Mandarin female
    'zh-CN': 'cmn-CN-Chirp-HD-F',     // Alias for Chinese
    'fr-FR': 'fr-FR-Chirp-HD-F',      // French female
    'ru-RU': 'ru-RU-Chirp-HD-F',      // Russian female
    'sr-RS': 'sr-RS-Standard-B',      // Serbian male
    'en-US': 'en-US-Chirp-HD-F',      // English female (default)
  };
  
  return voiceMap[languageCode] || 'en-US-Chirp-HD-F';  // Fallback to English
}

// Extract and store insights from conversation
async function extractAndStoreInsights(
  supabase: any,
  userId: string,
  conversationId: string,
  userMessage: string,
  aiResponse: string
) {
  try {
    // Simple pattern detection (can be enhanced with AI)
    const insights: Array<{type: string, content: string, confidence: number}> = [];

    // Detect preferences
    if (userMessage.toLowerCase().includes('i prefer') || userMessage.toLowerCase().includes('i like')) {
      insights.push({
        type: 'preference',
        content: userMessage,
        confidence: 0.8
      });
    }

    // Detect goals
    if (userMessage.toLowerCase().includes('my goal') || userMessage.toLowerCase().includes('want to')) {
      insights.push({
        type: 'goal',
        content: userMessage,
        confidence: 0.85
      });
    }

    // Store insights
    for (const insight of insights) {
      await supabase.from('ai_memory').insert({
        user_id: userId,
        memory_type: insight.type,
        content: insight.content,
        confidence_score: insight.confidence,
        source_conversation_id: conversationId,
        metadata: { extracted_at: new Date().toISOString() }
      });
    }

    console.log(`Stored ${insights.length} insights for user ${userId}`);
  } catch (error) {
    console.error('Error extracting insights:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      audio, 
      text, 
      language,
      agentType = 'health',
      conversationId: existingConversationId 
    } = await req.json();
    
    console.log('Received request:', { 
      hasAudio: !!audio, 
      hasText: !!text, 
      language, 
      agentType,
      conversationId: existingConversationId 
    });

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
    
    // Create a service role client to invoke the function
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: contextData, error: contextError } = await serviceClient.functions.invoke('fetch-user-context', {
      body: { userId: user.id }
    });
    
    let userContext = contextError ? null : contextData?.context;

    // Fallback: if context fetch failed, get minimal profile data directly
    if (!userContext || !userContext.identity?.displayName) {
      console.log('Context fetch failed or incomplete, fetching profile directly...');
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('display_name, handle, full_name, email')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        userContext = {
          identity: {
            userId: user.id,
            displayName: profile.display_name || profile.full_name || 'User',
            handle: profile.handle || '',
            email: profile.email || '',
            tenantId: '',
            tenantName: '',
            roles: []
          }
        };
        console.log('Using fallback profile data:', profile.display_name);
      }
    }

    console.log('User context loaded:', {
      hasContext: !!userContext,
      userName: userContext?.identity?.displayName,
      tenantName: userContext?.identity?.tenantName
    });

    // Create or get conversation
    let conversationId = existingConversationId;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          tenant_id: userContext?.identity?.tenantId,
          agent_type: agentType,
          context_snapshot: userContext || {},
          metadata: { 
            initiated_at: new Date().toISOString(),
            language: language || 'en'
          }
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConversation.id;
      console.log('Created new conversation:', conversationId);
    }

    // Load conversation history (last 10 messages for context)
    const { data: messageHistory } = await supabaseClient
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory = messageHistory || [];

    // Get Google Cloud API key
    let googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    
    if (!googleApiKey) {
      const { data: apiKeyData } = await supabaseClient
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('service_name', 'google_cloud')
        .single();
      
      if (apiKeyData?.api_key) {
        googleApiKey = apiKeyData.api_key;
      } else {
        throw new Error('Google Cloud API key not configured');
      }
    }

    let detectedLanguage = language || 'en-US';
    let userMessage = text;

    // Step 1: If audio provided, transcribe with STT
    if (audio) {
      console.log('Transcribing audio...');
      const sttResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'de-DE',
              alternativeLanguageCodes: ['ar-XA', 'en-US', 'es-ES', 'ru-RU', 'zh-CN', 'sr-RS'],
              model: 'latest_long',
              enableAutomaticPunctuation: true,
            },
            audio: { content: audio },
          }),
        }
      );

      if (!sttResponse.ok) {
        throw new Error('Speech recognition failed');
      }

      const sttData = await sttResponse.json();
      if (!sttData.results || sttData.results.length === 0) {
        throw new Error('No speech detected');
      }

      userMessage = sttData.results[0].alternatives[0].transcript;
      detectedLanguage = sttData.results[0].languageCode || detectedLanguage;
      console.log('Transcribed:', userMessage, 'Language:', detectedLanguage);
    }

    if (!userMessage || userMessage.trim() === '') {
      throw new Error('No message content provided');
    }

    // Check for crisis keywords
    const isCrisis = CRISIS_KEYWORDS.some(keyword =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // Store user message
    await supabaseClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      context_used: userContext,
      metadata: {
        language: detectedLanguage,
        has_audio: !!audio,
        timestamp: new Date().toISOString()
      }
    });

    // Get AI response from Lovable AI with full context
    console.log('Getting AI response from Lovable AI...');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context-enriched system prompt
    const basePrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.health;
    
    let contextPrompt = basePrompt;
    
    if (userContext) {
      const { identity, temporal, health, memory, economic, social } = userContext;
      
      contextPrompt += `\n\n=== USER CONTEXT ===`;
      
      // Identity & Tenant
      if (identity) {
        contextPrompt += `\nUser: ${identity.displayName || 'User'} ${identity.handle ? `(@${identity.handle})` : ''}`;
        if (identity.tenantName) {
          contextPrompt += `\nWorkspace: ${identity.tenantName}`;
          if (identity.tenantName === 'Maxina') {
            contextPrompt += ` - Focus on clinical health, longevity protocols, medical precision.`;
          } else if (identity.tenantName === 'AlKalma') {
            contextPrompt += ` - Focus on holistic wellness, spiritual health, community healing.`;
          } else if (identity.tenantName === 'EarthLinks') {
            contextPrompt += ` - Focus on sustainability, eco-wellness, environmental health.`;
          }
        }
      }
      
      // Time context
      if (temporal) {
        contextPrompt += `\n\nTime: ${temporal.dayOfWeek}, ${new Date(temporal.currentTime).toLocaleTimeString()}, Hour: ${temporal.currentHour}`;
        if (temporal.upcomingEvents?.length > 0) {
          contextPrompt += `\nUpcoming: ${temporal.upcomingEvents[0].title} at ${new Date(temporal.upcomingEvents[0].start).toLocaleTimeString()}`;
        }
      }
      
      // Financial context
      if (economic?.balances) {
        contextPrompt += `\n\nWallet: ${economic.balances.USD} USD, ${economic.balances.VTN} VTN, ${economic.balances.CREDITS} Credits`;
      }
      
      // Health context
      if (health) {
        if (health.vitanaIndex) {
          contextPrompt += `\n\nVitana Index: ${health.vitanaIndex}/999`;
        }
        if (health.recentDiaryEntries?.length > 0) {
          const latestEntry = health.recentDiaryEntries[0];
          contextPrompt += `\nRecent journal: "${latestEntry.text.substring(0, 100)}..."`;
        }
      }
      
      // Memory context
      if (memory) {
        if (memory.rememberedInsights?.length > 0) {
          contextPrompt += `\n\n=== REMEMBERED INSIGHTS ===`;
          memory.rememberedInsights.slice(0, 3).forEach(insight => {
            contextPrompt += `\n- ${insight.content} (confidence: ${(insight.confidence * 100).toFixed(0)}%)`;
          });
        }
        
        if (memory.learnedPreferences && Object.keys(memory.learnedPreferences).length > 0) {
          contextPrompt += `\n\n=== USER PREFERENCES ===`;
          Object.entries(memory.learnedPreferences).slice(0, 5).forEach(([key, value]) => {
            contextPrompt += `\n- ${key}: ${value}`;
          });
        }
        
        if (memory.patterns?.length > 0) {
          contextPrompt += `\n\n=== OBSERVED PATTERNS ===`;
          memory.patterns.slice(0, 3).forEach(pattern => {
            contextPrompt += `\n- ${pattern.description} (${pattern.frequency})`;
          });
        }
        
        if (memory.actionHistory?.length > 0) {
          const completedActions = memory.actionHistory.filter(a => a.status === 'completed');
          if (completedActions.length > 0) {
            contextPrompt += `\nRecently completed: ${completedActions[0].title}`;
          }
        }
      }
      
      contextPrompt += `\n\n=== END CONTEXT ===\n`;
      contextPrompt += `\nUse this context to provide personalized, timely, and relevant guidance. Reference specific details when appropriate to show you understand the user's situation.`;
    }
      
      // Financial context
      if (economic.balances) {
        contextPrompt += `\n\nWallet: ${economic.balances.USD} USD, ${economic.balances.VTN} VTN, ${economic.balances.CREDITS} Credits`;
      }
      
      // Health context
      if (health.vitanaIndex) {
        contextPrompt += `\n\nVitana Index: ${health.vitanaIndex}/999`;
      }
      if (health.recentDiaryEntries.length > 0) {
        const latestEntry = health.recentDiaryEntries[0];
        contextPrompt += `\nRecent journal: "${latestEntry.text.substring(0, 100)}..."`;
      }
      
      // Memory context
      if (memory.rememberedInsights.length > 0) {
        contextPrompt += `\n\n=== REMEMBERED INSIGHTS ===`;
        memory.rememberedInsights.slice(0, 3).forEach(insight => {
          contextPrompt += `\n- ${insight.content} (confidence: ${(insight.confidence * 100).toFixed(0)}%)`;
        });
      }
      
      if (Object.keys(memory.learnedPreferences).length > 0) {
        contextPrompt += `\n\n=== USER PREFERENCES ===`;
        Object.entries(memory.learnedPreferences).slice(0, 5).forEach(([key, value]) => {
          contextPrompt += `\n- ${key}: ${value}`;
        });
      }
      
      if (memory.patterns.length > 0) {
        contextPrompt += `\n\n=== OBSERVED PATTERNS ===`;
        memory.patterns.slice(0, 3).forEach(pattern => {
          contextPrompt += `\n- ${pattern.description} (${pattern.frequency})`;
        });
      }
      
      if (memory.actionHistory.length > 0) {
        const completedActions = memory.actionHistory.filter(a => a.status === 'completed');
        if (completedActions.length > 0) {
          contextPrompt += `\n\nRecently completed: ${completedActions[0].title}`;
        }
      }
      
      contextPrompt += `\n\n=== END CONTEXT ===\n`;
      contextPrompt += `\nUse this context to provide personalized, timely, and relevant guidance. Reference specific details when appropriate to show you understand the user's situation.`;
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          ...conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: userMessage
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices[0].message.content;
    console.log('AI response:', aiText);

    // Store AI response
    await supabaseClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiText,
      metadata: {
        model: 'google/gemini-2.5-flash',
        agent_type: agentType,
        context_used: !!userContext,
        timestamp: new Date().toISOString()
      }
    });

    // Extract and store insights asynchronously (don't block response)
    extractAndStoreInsights(supabaseClient, user.id, conversationId, userMessage, aiText)
      .catch(err => console.error('Failed to extract insights:', err));

    // Normalize language for TTS and response (before try block)
    const normalizedLang = normalizeLanguage(detectedLanguage);

    // Convert to speech (optional - graceful failure)
    let base64Audio = null;
    try {
      const voiceName = getVoiceNameForLanguage(normalizedLang);
      console.log('Using TTS voice:', voiceName, 'for language:', normalizedLang);
      
      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: aiText },
            voice: {
              languageCode: normalizedLang,
              name: voiceName,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: 0,
              speakingRate: 1.0,
            },
          }),
        }
      );

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        base64Audio = ttsData.audioContent;
      } else {
        console.error('TTS failed with status:', ttsResponse.status);
      }
    } catch (ttsError) {
      console.error('TTS conversion failed, returning text-only response:', ttsError);
      // Continue without audio - text response is still valid
    }

    return new Response(
      JSON.stringify({
        text: aiText,
        audioContent: base64Audio,
        transcript: userMessage,
        detectedLanguage: normalizedLang,
        isCrisis,
        conversationId,
        agentType,
        contextUsed: !!userContext
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        text: null,
        audioContent: null,
        conversationId: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
