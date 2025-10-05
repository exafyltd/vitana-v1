import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 'self-harm',
  'انتحار', 'أريد الموت', 'إيذاء نفسي'
];

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

function cleanAIResponse(text: string): string {
  let cleaned = text;
  
  cleaned = cleaned
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');
  
  const preamblePatterns = [
    /^my apologies[^.!?]*[.!?]\s*/i,
    /^i'm sorry[^.!?]*[.!?]\s*/i,
    /^sorry[^.!?]*[.!?]\s*/i,
    /^regarding your (other )?questions:?\s*/i,
    /^i do not have access to your (personal )?name[^.!?]*[.!?]\s*/i,
    /^as vitana,?\s*i do not have access[^.!?]*[.!?]\s*/i,
    /^my responses are based solely on[^.!?]*[.!?]\s*/i,
    /^respecting your privacy[^.!?]*[.!?]\s*/i,
  ];
  
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function normalizeLanguage(languageCode: string): string {
  const lower = languageCode.toLowerCase();
  if (lower.startsWith('sr')) return 'sr-RS';
  const normalized = lower.replace(/([a-z]{2})-([a-z]{2})/, 
    (match, p1, p2) => `${p1}-${p2.toUpperCase()}`);
  return normalized;
}

function getVoiceNameForLanguage(languageCode: string): string {
  const voiceMap: Record<string, string> = {
    'de-DE': 'de-DE-Neural2-F',
    'es-ES': 'es-ES-Neural2-A',
    'ar-XA': 'ar-XA-Standard-A',
    'cmn-CN': 'cmn-CN-Standard-A',
    'zh-CN': 'cmn-CN-Standard-A',
    'fr-FR': 'fr-FR-Neural2-A',
    'ru-RU': 'ru-RU-Standard-D',
    'sr-RS': 'sr-RS-Standard-B',
    'en-US': 'en-US-Neural2-F',
  };
  const voice = voiceMap[languageCode] || 'en-US-Neural2-F';
  console.log(`[tts] Selected voice: ${voice} for language: ${languageCode}`);
  return voice;
}

// Split text into sentences for chunked TTS
function splitIntoSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

// Synthesize TTS for a text chunk
async function synthesizeChunk(text: string, googleApiKey: string, language: string): Promise<string | null> {
  const startTime = Date.now();
  try {
    const voiceName = getVoiceNameForLanguage(language);
    console.info(`[tts] Synthesizing (${text.length} chars, voice: ${voiceName})...`);
    
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: language, name: voiceName },
          audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.1 },
        }),
      }
    );

    if (ttsResponse.ok) {
      const ttsData = await ttsResponse.json();
      const duration = Date.now() - startTime;
      console.info(`[tts] ✓ Success (${duration}ms)`);
      return ttsData.audioContent;
    }
    
    const errorBody = await ttsResponse.text();
    console.error(`[tts] ✗ Failed (${ttsResponse.status}):`, errorBody);
    return null;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[tts] ✗ Exception (${duration}ms):`, error);
    return null;
  }
}

async function extractAndStoreInsights(
  supabase: any,
  userId: string,
  conversationId: string,
  userMessage: string,
  aiResponse: string
) {
  try {
    const insights: Array<{type: string, content: string, confidence: number}> = [];

    if (userMessage.toLowerCase().includes('i prefer') || userMessage.toLowerCase().includes('i like')) {
      insights.push({ type: 'preference', content: userMessage, confidence: 0.8 });
    }

    if (userMessage.toLowerCase().includes('my goal') || userMessage.toLowerCase().includes('want to')) {
      insights.push({ type: 'goal', content: userMessage, confidence: 0.85 });
    }

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
      conversationId: existingConversationId,
      stream = true // Enable streaming by default
    } = await req.json();
    
    console.log('Received request:', { 
      hasAudio: !!audio, 
      hasText: !!text, 
      language, 
      agentType,
      conversationId: existingConversationId,
      stream 
    });

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

    let conversationId = existingConversationId;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          tenant_id: null,
          agent_type: agentType,
          context_snapshot: {},
          metadata: { 
            initiated_at: new Date().toISOString(),
            language: language || 'en'
          }
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = newConversation.id;
    }

    console.log('Fetching user context and conversation history in parallel...');
    
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const [contextResult, historyResult] = await Promise.all([
      serviceClient.functions.invoke('fetch-user-context', {
        body: { userId: user.id, forceRefresh: false }
      }).catch(async (contextError) => {
        console.error('Error fetching user context:', contextError);
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
      
      supabaseClient
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(12)
    ]);

    let userContext = contextResult.data?.context || null;
    const conversationHistory = historyResult.data || [];

    console.log('User context loaded:', {
      hasContext: !!userContext,
      userName: userContext?.identity?.displayName,
      tenantName: userContext?.identity?.tenantName
    });

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

    // Use the language parameter from the frontend, fallback to en-US
    let detectedLanguage = language || 'en-US';
    console.log(`[language] Received language parameter: ${language}, using: ${detectedLanguage}`);
    
    let userMessage = text;

    if (audio) {
      console.log('[audio] Transcribing audio with server-side STT...');
      const sttResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              languageCode: normalizeLanguage(language || detectedLanguage || 'en-US'),
              alternativeLanguageCodes: ['ar-XA', 'de-DE', 'en-US', 'es-ES', 'ru-RU', 'zh-CN', 'sr-RS'],
              model: 'latest_short',
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
      // Only override language if STT detected a different one
      const sttLanguage = sttData.results[0].languageCode;
      if (sttLanguage) {
        console.log(`[language] STT detected language: ${sttLanguage}, overriding: ${detectedLanguage}`);
        detectedLanguage = sttLanguage;
      }
      console.log('[audio] Transcribed:', userMessage, 'Language:', detectedLanguage);
    } else {
      console.log('[language] No audio transcription, using selected language for TTS:', detectedLanguage);
    }

    if (!userMessage || userMessage.trim() === '') {
      throw new Error('No message content provided');
    }

    const isCrisis = CRISIS_KEYWORDS.some(keyword =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // Store user message (non-blocking)
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
    }).then(() => console.log('User message stored'))
      .catch((err) => console.error('Error storing user message:', err));

    console.log('Getting AI response from Lovable AI...');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const basePrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.health;
    let systemMessage = basePrompt;
    
    if (userContext) {
      const { identity, temporal, health, memory, economic, community } = userContext;
      systemMessage += '\n\n=== USER CONTEXT (Use naturally when relevant) ===\n';
      if (identity?.displayName || identity?.handle) {
        systemMessage += `Name: ${identity.displayName || 'User'}${identity.handle ? ` (@${identity.handle})` : ''}\n`;
      }
      if (temporal?.dayOfWeek) {
        const now = new Date();
        systemMessage += `Time: ${temporal.dayOfWeek}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
      }
      if (economic?.balances) {
        const balances = Object.entries(economic.balances)
          .map(([curr, bal]) => `${bal} ${curr}`)
          .join(', ');
        systemMessage += `Wallet: ${balances}\n`;
      }
      if (health?.vitanaIndex !== undefined) {
        systemMessage += `Health Score: ${health.vitanaIndex}/999\n`;
      }
      if (memory?.rememberedInsights?.length > 0) {
        const topInsights = memory.rememberedInsights
          .slice(0, 2)
          .map((i: any) => i.content)
          .join('; ');
        systemMessage += `Key Insights: ${topInsights}\n`;
      }
      
      // === CONDITIONAL COMMUNITY CONTEXT (only if query mentions community topics) ===
      const communityKeywords = /event|group|match|meet|community|social|connect|friend|people|gathering|activity|rsvp|attend|join/i;
      // Check current message AND recent conversation history (last 4 messages)
      const recentConversation = [
        userMessage,
        ...conversationHistory.slice(-4).map(m => m.content)
      ].join(' ');
      const includeCommunityContext = communityKeywords.test(recentConversation);
      
      if (community && includeCommunityContext) {
        systemMessage += '\n=== COMMUNITY & SOCIAL CONTEXT ===\n';
        
        // Upcoming Events
        if (community.upcomingEvents?.length > 0) {
          systemMessage += `📅 Upcoming Events (next 30 days): ${community.upcomingEvents.length} available\n`;
          const nearestEvents = community.upcomingEvents.slice(0, 3);
          nearestEvents.forEach((e: any) => {
            const date = new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const spots = e.maxParticipants ? `${e.participantCount}/${e.maxParticipants}` : `${e.participantCount}`;
            const participating = e.isParticipating ? '✅' : '';
            systemMessage += `  ${participating} ${e.title} (${e.type}) - ${date}, ${spots} attending${e.location ? `, ${e.location}` : ''}\n`;
          });
        }
        
        // User's Registered Events
        if (community.myRegisteredEvents?.length > 0) {
          systemMessage += `✅ Your Registered Events: ${community.myRegisteredEvents.length} events\n`;
          community.myRegisteredEvents.slice(0, 3).forEach((e: any) => {
            const date = new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            systemMessage += `  - ${e.title} - ${date}\n`;
          });
        }
        
        // Groups
        if (community.joinedGroups?.length > 0) {
          systemMessage += `👥 Joined Groups: ${community.joinedGroups.length} groups\n`;
          community.joinedGroups.slice(0, 5).forEach((g: any) => {
            systemMessage += `  - ${g.name} (${g.category}) - ${g.memberCount} members, Role: ${g.role}\n`;
          });
        } else {
          systemMessage += `👥 Groups: Not yet a member of any groups\n`;
        }
        
        // Matches
        if (community.activeMatches?.length > 0) {
          systemMessage += `🤝 Active Matches: ${community.activeMatches.length} compatible users\n`;
          const topMatches = community.activeMatches.slice(0, 3);
          topMatches.forEach((m: any) => {
            const status = m.conversationStarted ? '💬 Connected' : '👋 Not yet contacted';
            const interests = m.sharedInterests?.length > 0 ? ` - Shared: ${m.sharedInterests.slice(0, 2).join(', ')}` : '';
            systemMessage += `  - ${m.displayName} (${m.compatibilityScore}% compatible)${interests} - ${status}\n`;
          });
          
          const uncontacted = community.activeMatches.filter((m: any) => !m.conversationStarted);
          if (uncontacted.length > 0) {
            systemMessage += `  ⚡ ${uncontacted.length} match${uncontacted.length > 1 ? 'es' : ''} waiting to connect!\n`;
          }
        } else {
          systemMessage += `🤝 Matches: No active matches yet\n`;
        }
        
        // Social Graph
        systemMessage += `📊 Social: ${community.followers} followers, ${community.following} following\n`;
        
        // Interests & Location
        if (community.userInterests?.length > 0) {
          systemMessage += `❤️ Interests: ${community.userInterests.join(', ')}\n`;
        }
        if (community.userLocation) {
          systemMessage += `📍 Location: ${community.userLocation}\n`;
        }
        
        // Recent Activity
        if (community.recentActivity?.length > 0) {
          systemMessage += `⚡ Recent Activity: ${community.recentActivity.length} interactions in last 30 days\n`;
        }
        
        // AI Proactive Guidance
        systemMessage += '\n=== AI PROACTIVE GUIDANCE ===\n';
        systemMessage += 'Based on the user\'s community context, be proactive in:\n';
        systemMessage += '1. 🎉 Recommending relevant upcoming events based on their interests\n';
        systemMessage += '2. 👥 Suggesting groups to join that align with their wellness goals\n';
        systemMessage += '3. 🤝 Encouraging them to reach out to high-compatibility matches\n';
        systemMessage += '4. 📈 Highlighting opportunities to grow their social network\n';
        systemMessage += '5. 🎯 Nudging them toward community engagement (events, meetups, groups)\n';
        systemMessage += '6. 🏆 Celebrating their community participation and milestones\n';
        systemMessage += '7. 💡 Making personalized suggestions like "Want me to RSVP you?" or "Should I help you connect?"\n';
      }
      
      systemMessage += '=== END CONTEXT ===\n';
    }
    
    const languageMap: Record<string, string> = {
      'sr-RS': 'Serbian', 'de-DE': 'German', 'en-US': 'English',
      'ar-XA': 'Arabic', 'es-ES': 'Spanish', 'ru-RU': 'Russian', 'zh-CN': 'Chinese'
    };
    
    const normalizedForLookup = normalizeLanguage(detectedLanguage);
    const languageName = languageMap[normalizedForLookup];
    if (languageName && languageName !== 'English') {
      systemMessage += `\n\n=== LANGUAGE INSTRUCTION ===\nIMPORTANT: Respond in ${languageName}. The user is communicating in ${languageName}, so all your responses must be in ${languageName}.\n=== END LANGUAGE INSTRUCTION ===\n`;
    }

    // STREAMING IMPLEMENTATION
    if (stream) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemMessage },
            ...conversationHistory.map((msg: any) => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
          ],
          stream: true
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('AI response failed');
      }

      const normalizedLang = normalizeLanguage(detectedLanguage);
      console.log(`[language] Normalized language for TTS: ${normalizedLang} (from ${detectedLanguage})`);
      
      // Create SSE stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullText = '';
          let currentSentence = '';
          let isControllerOpen = true;
          let sentencesProcessed = 0;
          let pendingTTS: Promise<void>[] = [];
          
          // Helper to safely enqueue
          const safeEnqueue = (data: Uint8Array) => {
            if (isControllerOpen) {
              try {
                controller.enqueue(data);
              } catch (err) {
                console.error('[stream] Failed to enqueue:', err);
                isControllerOpen = false;
              }
            }
          };
          
          try {
            const reader = aiResponse.body!.getReader();
            const decoder = new TextDecoder();
            let firstToken = true;
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    
                    if (content) {
                      if (firstToken) {
                        console.info('[stream] ⚡ First token received');
                        firstToken = false;
                      }
                      
                      fullText += content;
                      currentSentence += content;
                      
                      // Send text token immediately for smooth UI
                      const textEvent = `data: ${JSON.stringify({ type: 'text', content })}\n\n`;
                      safeEnqueue(encoder.encode(textEvent));
                      
                      // Check if sentence is complete for TTS (reduced threshold for faster TTS)
                      if (/[.!?]\s*$/.test(currentSentence) && currentSentence.length > 8) {
                        const sentence = cleanAIResponse(currentSentence.trim());
                        sentencesProcessed++;
                        
                        console.info(`[stream] 📝 Sentence ${sentencesProcessed} complete (${sentence.length} chars) - triggering TTS`);
                        
                         // Synthesize audio for this sentence (non-blocking)
                         const p = synthesizeChunk(sentence, googleApiKey, normalizedLang).then(audioContent => {
                           if (audioContent && isControllerOpen) {
                             console.info(`[stream] 🔊 Audio chunk ${sentencesProcessed} queued`);
                             const audioEvent = `data: ${JSON.stringify({ type: 'audio', content: audioContent })}\n\n`;
                             safeEnqueue(encoder.encode(audioEvent));
                           } else if (!audioContent && isControllerOpen) {
                             console.error(`[stream] ⚠️ TTS failed for sentence ${sentencesProcessed}`);
                             const errorEvent = `data: ${JSON.stringify({ type: 'audio_error', message: 'TTS synthesis failed' })}\n\n`;
                             safeEnqueue(encoder.encode(errorEvent));
                           }
                         }).catch(err => {
                           console.error(`[stream] TTS error for sentence ${sentencesProcessed}:`, err);
                           if (isControllerOpen) {
                             const errorEvent = `data: ${JSON.stringify({ type: 'audio_error', message: 'TTS synthesis error' })}\n\n`;
                             safeEnqueue(encoder.encode(errorEvent));
                           }
                         });
                         pendingTTS.push(p);
                         
                         currentSentence = '';
                      }
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
            
            // Process remaining sentence (safety check for minimum length)
            if (currentSentence.trim() && currentSentence.trim().length > 3 && isControllerOpen) {
              const sentence = cleanAIResponse(currentSentence.trim());
              sentencesProcessed++;
              console.info(`[stream] 📝 Final sentence ${sentencesProcessed} (${sentence.length} chars) - triggering TTS`);
              
              const audioContent = await synthesizeChunk(sentence, googleApiKey, normalizedLang);
              if (audioContent) {
                console.info(`[stream] 🔊 Final audio chunk queued`);
                const audioEvent = `data: ${JSON.stringify({ type: 'audio', content: audioContent })}\n\n`;
                safeEnqueue(encoder.encode(audioEvent));
              } else {
                console.error(`[stream] ⚠️ TTS failed for final sentence`);
                const errorEvent = `data: ${JSON.stringify({ type: 'audio_error', message: 'Final TTS synthesis failed' })}\n\n`;
                safeEnqueue(encoder.encode(errorEvent));
              }
            }
            
            // Store complete AI message (non-blocking)
            const cleanedFullText = cleanAIResponse(fullText);
            supabaseClient.from('ai_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: cleanedFullText,
              metadata: {
                model: 'google/gemini-2.5-flash',
                agent_type: agentType,
                context_used: !!userContext,
                timestamp: new Date().toISOString()
              }
            }).then(() => console.info('[stream] ✓ AI message stored'))
              .catch((err) => console.error('[stream] Error storing AI message:', err));
            
            // Wait for any pending TTS tasks to flush audio events before closing the stream
            try {
              await Promise.allSettled(pendingTTS);
            } catch (e) {
              console.error('[stream] Error awaiting TTS tasks:', e);
            }
            
            // Send done event
            const doneEvent = `data: ${JSON.stringify({ 
              type: 'done', 
              conversationId, 
              isCrisis,
              detectedLanguage: normalizedLang
            })}\n\n`;
            safeEnqueue(encoder.encode(doneEvent));
            console.info('[stream] ✓ Done event sent');
            
            // Mark controller as closed before actually closing
            isControllerOpen = false;
            
            // Extract insights (non-blocking)
            extractAndStoreInsights(supabaseClient, user.id, conversationId, userMessage, cleanedFullText)
              .catch(err => console.error('Failed to extract insights:', err));
            
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Fallback: Non-streaming response (original logic)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMessage },
          ...conversationHistory.map((msg: any) => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: userMessage }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    const rawAiText = aiData.choices[0].message.content;
    const aiText = cleanAIResponse(rawAiText);

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
    }).then(() => console.log('AI message stored'))
      .catch((err) => console.error('Error storing AI message:', err));

    extractAndStoreInsights(supabaseClient, user.id, conversationId, userMessage, aiText)
      .catch(err => console.error('Failed to extract insights:', err));

    const normalizedLang = normalizeLanguage(detectedLanguage);
    const base64Audio = await synthesizeChunk(aiText, googleApiKey, normalizedLang);

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
