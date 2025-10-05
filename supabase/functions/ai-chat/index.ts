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
  health: `ROLE: You are Vitana, an AI wellness coach specializing in longevity and preventive health.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start immediately with the direct answer to the user's current question
2. Use plain conversational text only - zero markdown, zero formatting
3. Maximum 2-3 sentences for simple questions, 4-5 for complex ones
4. If asked about user name/identity: state it naturally using the context provided below

ABSOLUTE PROHIBITIONS:
- NO apologies ("My apologies", "I'm sorry", "Sorry")
- NO meta-commentary ("Regarding your other questions", "Let me clarify")
- NO privacy disclaimers ("I don't have access to your name")
- NO markdown symbols (**, *, _, #, \`, >, -)
- NO preambles or setup phrases before answering
- DO NOT reference previous conversation topics unless directly asked

CONTEXT USAGE:
The USER CONTEXT section below contains current user information. Use it naturally when relevant, but ONLY answer the user's current question.

YOUR EXPERTISE:
Provide science-backed wellness advice considering the user's health profile, Vitana Index, diary entries, and daily patterns. Be empathetic and focus on sustainable lifestyle changes.`,

  autopilot: `ROLE: You are Vitana Autopilot, proactively suggesting next-best actions.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be concise and action-oriented

ABSOLUTE PROHIBITIONS:
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Analyze user patterns, schedules, and goals to recommend timely, contextual actions that save time and improve wellness.`,

  community: `ROLE: You are Vitana Community AI, facilitating wellness connections.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be warm and inclusive

ABSOLUTE PROHIBITIONS:
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Help users connect with like-minded wellness enthusiasts, suggest groups and events, foster authentic relationships.`,

  wellness: `ROLE: You are Vitana Wellness AI, providing holistic lifestyle guidance.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be practical and realistic

ABSOLUTE PROHIBITIONS:
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Integrate health, nutrition, fitness, sleep, and mental wellness into practical recommendations that fit the user's life.`
};

// Strip markdown and unwanted preambles from AI responses
function cleanAIResponse(text: string): string {
  let cleaned = text;
  
  // Step 1: Remove markdown formatting
  cleaned = cleaned
    // Remove bold/italic markers
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove links but keep text [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');
  
  // Step 2: Remove unwanted preambles and boilerplate
  const preamblePatterns = [
    /^my apologies[^.!?]*[.!?]\s*/i,
    /^i'm sorry[^.!?]*[.!?]\s*/i,
    /^sorry[^.!?]*[.!?]\s*/i,
    /^regarding your (other )?questions?:?\s*/i,
    /^i do not have access to your (personal )?name[^.!?]*[.!?]\s*/i,
    /^as vitana,?\s*i do not have access[^.!?]*[.!?]\s*/i,
    /^my responses are based solely on[^.!?]*[.!?]\s*/i,
    /^respecting your privacy[^.!?]*[.!?]\s*/i,
  ];
  
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Step 3: Clean up whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

// Keep original function for backwards compatibility (just calls cleanAIResponse)
function sanitizeTextForTTS(text: string): string {
  return cleanAIResponse(text);
}

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

    // Create or get conversation ID early (needed for parallel fetch)
    let conversationId = existingConversationId;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          tenant_id: null, // Will be updated with context
          agent_type: agentType,
          context_snapshot: {},
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

    // OPTIMIZATION: Parallelize user context and conversation history fetch
    console.log('Fetching user context and conversation history in parallel...');
    
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const [contextResult, historyResult] = await Promise.all([
      // Fetch user context
      serviceClient.functions.invoke('fetch-user-context', {
        body: { userId: user.id, forceRefresh: false }
      }).catch(async (contextError) => {
        console.error('Error fetching user context:', contextError);
        // Fallback: fetch minimal profile data
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('display_name, handle, full_name, email')
          .eq('user_id', user.id)
          .single();
        
        return {
          data: profile ? {
            context: {
              identity: {
                userId: user.id,
                displayName: profile.display_name || profile.full_name || 'User',
                handle: profile.handle || '',
                email: profile.email || '',
                tenantId: '',
                tenantName: '',
                roles: []
              }
            }
          } : null
        };
      }),
      
      // Fetch conversation history
      supabaseClient
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(4)
    ]);

    let userContext = contextResult.data?.context || null;
    const conversationHistory = historyResult.data || [];

    console.log('User context loaded:', {
      hasContext: !!userContext,
      userName: userContext?.identity?.displayName,
      tenantName: userContext?.identity?.tenantName
    });

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

    // OPTIMIZATION: Store user message (non-blocking)
    supabaseClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      context_used: userContext,
      metadata: {
        language: detectedLanguage,
        has_audio: !!audio,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      console.log('User message stored');
    }).catch((err) => {
      console.error('Error storing user message:', err);
    });

    // Get AI response from Lovable AI with full context
    console.log('Getting AI response from Lovable AI...');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build enriched system prompt with context
    const basePrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.health;
    let systemMessage = basePrompt;
    
    if (userContext) {
      const { identity, temporal, health, memory, economic } = userContext;
      
      systemMessage += '\n\n=== USER CONTEXT (Use naturally when relevant) ===\n';
      
      // Identity
      if (identity?.displayName || identity?.handle) {
        systemMessage += `Name: ${identity.displayName || 'User'}${identity.handle ? ` (@${identity.handle})` : ''}\n`;
      }
      
      // Time
      if (temporal?.dayOfWeek) {
        const now = new Date();
        systemMessage += `Time: ${temporal.dayOfWeek}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
      }
      
      // Wallet
      if (economic?.balances) {
        const balances = Object.entries(economic.balances)
          .map(([curr, bal]) => `${bal} ${curr}`)
          .join(', ');
        systemMessage += `Wallet: ${balances}\n`;
      }
      
      // Health Score
      if (health?.vitanaIndex !== undefined) {
        systemMessage += `Health Score: ${health.vitanaIndex}/999\n`;
      }
      
      // Top 2 insights only
      if (memory?.rememberedInsights?.length > 0) {
        const topInsights = memory.rememberedInsights
          .slice(0, 2)
          .map((i: any) => i.content)
          .join('; ');
        systemMessage += `Key Insights: ${topInsights}\n`;
      }
      
      systemMessage += '=== END CONTEXT ===\n';
    }
    
    // Add language instruction to system prompt
    const languageMap: Record<string, string> = {
      'sr-RS': 'Serbian',
      'de-DE': 'German',
      'en-US': 'English',
      'ar-XA': 'Arabic',
      'es-ES': 'Spanish',
      'ru-RU': 'Russian',
      'zh-CN': 'Chinese'
    };
    
    const languageName = languageMap[detectedLanguage];
    if (languageName && languageName !== 'English') {
      systemMessage += `\n\n=== LANGUAGE INSTRUCTION ===\nIMPORTANT: Respond in ${languageName}. The user is communicating in ${languageName}, so all your responses must be in ${languageName}.\n=== END LANGUAGE INSTRUCTION ===\n`;
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
            content: systemMessage
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
    const rawAiText = aiData.choices[0].message.content;
    console.log('AI response (raw):', rawAiText);
    
    // Clean the AI response: remove markdown and unwanted preambles
    const aiText = cleanAIResponse(rawAiText);
    console.log('AI response (cleaned):', aiText);

    // OPTIMIZATION: Store AI response (non-blocking)
    supabaseClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiText,
      metadata: {
        model: 'google/gemini-2.5-flash',
        agent_type: agentType,
        context_used: !!userContext,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      console.log('AI message stored');
    }).catch((err) => {
      console.error('Error storing AI message:', err);
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
      
      // AI text is already cleaned, just use it for TTS
      const cleanTextForSpeech = aiText;
      
      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: cleanTextForSpeech },
            voice: {
              languageCode: normalizedLang,
              name: voiceName,
            },
      audioConfig: {
        audioEncoding: 'MP3',
        pitch: 0,
        speakingRate: 1.2,
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
