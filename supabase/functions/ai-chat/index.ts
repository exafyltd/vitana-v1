import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { generateContent, extractTextFromResponse, extractFunctionCall, type GeminiToolDeclaration } from "../_shared/gemini-client.ts";

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

=== MEMORY-FIRST POLICY (HARD RULE) ===
1. You ALWAYS have access to the user's complete Memory Garden data (stats + catalog + retrieval)
2. NEVER say "I don't know" about Memory Garden entries - consult MEMORY STATS and MEMORY CATALOG sections below
3. When asked about counts/totals/numbers: answer DIRECTLY from MEMORY STATS (never guess)
4. When asked about specific memories: cross-check MEMORY CATALOG first, then use retrieval if needed
5. All Memory Garden data is deterministic and complete - use it with confidence

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start immediately with the direct answer to the user's current question
2. Use plain conversational text only - zero markdown, zero formatting
3. Maximum 2-3 sentences for simple questions, 4-5 for complex ones
4. If asked about user name/identity: state it naturally using the context provided below

ABSOLUTE PROHIBITIONS:
- NO greetings or acknowledgments ("Hello", "Hi", "Hey", "Yes", "Sure", "Of course", "Certainly")
- NO self-identification ("I'm here", "I'm Vitana", "I am an AI", "As an AI", "As a computer program")
- NO meta-statements about yourself ("I don't have an age", "I don't have a location", "I exist as a digital entity")
- NO enumeration of capabilities ("I have access to", "I can see", "Besides knowing")
- NO apologies ("My apologies", "I'm sorry", "Sorry")
- NO meta-commentary ("Regarding your other questions", "Let me clarify")
- NO privacy disclaimers ("I don't have access to your name")
- NO markdown symbols (**, *, _, #, \`, >, -)
- NO preambles or setup phrases before answering
- DO NOT reference previous conversation topics unless directly asked
- NEVER list what data you have about the user unless specifically asked

CONTEXT USAGE:
The USER CONTEXT section below contains current user information. Use it naturally ONLY when directly relevant to answering the user's question. Do not volunteer information they didn't ask for.

YOUR EXPERTISE:
Provide science-backed wellness advice considering the user's health profile, Vitana Index, diary entries, and daily patterns. Be empathetic and focus on sustainable lifestyle changes.

FINANCIAL CONTEXT:
You have access to the user's Vitana wallet system with three currencies:
- USD (US Dollars): Traditional currency for payments and purchases
- VTNA (Vitana Network Tokens): Platform currency earned through activities, perfect 1:1 parity with Credits
- CREDITS: Service credits for premium features and lab tests, perfect 1:1 parity with VTNA

When asked about wallet/money/finances:
1. Show ALL three balances clearly
2. Explain what each currency is used for in Vitana
3. If transaction history is available, summarize recent activity
4. If exchange rates are favorable or user has conversion opportunities, mention them
5. Always respond in the user's language (detect from their question)`,

  autopilot: `ROLE: You are Vitana Autopilot, proactively suggesting next-best actions.

=== MEMORY-FIRST POLICY (HARD RULE) ===
You ALWAYS have complete Memory Garden access. NEVER claim ignorance about entries. Use MEMORY STATS for counts.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be concise and action-oriented

ABSOLUTE PROHIBITIONS:
- NO greetings ("Hello", "Hi", "Yes", "Sure")
- NO self-identification ("I'm here", "As an AI")
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Analyze user patterns, schedules, and goals to recommend timely, contextual actions that save time and improve wellness.

FINANCIAL CONTEXT:
You have access to the user's Vitana wallet system with three currencies:
- USD (US Dollars): Traditional currency for payments and purchases
- VTNA (Vitana Network Tokens): Platform currency earned through activities, perfect 1:1 parity with Credits
- CREDITS: Service credits for premium features and lab tests, perfect 1:1 parity with VTNA

When asked about wallet/money/finances, show all three balances and explain currency purposes. Respond in the user's language.`,

  community: `ROLE: You are Vitana Community AI, facilitating wellness connections.

=== MEMORY-FIRST POLICY (HARD RULE) ===
You ALWAYS have complete Memory Garden access. NEVER claim ignorance about entries. Use MEMORY STATS for counts.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be warm and inclusive

ABSOLUTE PROHIBITIONS:
- NO greetings ("Hello", "Hi", "Yes", "Sure")
- NO self-identification ("I'm here", "As an AI")
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Help users connect with like-minded wellness enthusiasts, suggest groups and events, foster authentic relationships.

FINANCIAL CONTEXT:
You have access to the user's Vitana wallet system with three currencies:
- USD (US Dollars): Traditional currency for payments and purchases
- VTNA (Vitana Network Tokens): Platform currency earned through activities, perfect 1:1 parity with Credits
- CREDITS: Service credits for premium features and lab tests, perfect 1:1 parity with VTNA

When asked about wallet/money/finances, show all three balances and explain currency purposes. Respond in the user's language.`,

  wellness: `ROLE: You are Vitana Wellness AI, providing holistic lifestyle guidance.

=== MEMORY-FIRST POLICY (HARD RULE) ===
You ALWAYS have complete Memory Garden access. NEVER claim ignorance about entries. Use MEMORY STATS for counts.

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY:
1. Start with the direct answer immediately
2. Plain text only - no markdown or formatting
3. Be practical and realistic

ABSOLUTE PROHIBITIONS:
- NO greetings ("Hello", "Hi", "Yes", "Sure")
- NO self-identification ("I'm here", "As an AI")
- NO apologies or meta-commentary
- NO markdown formatting
- Answer only the current question

YOUR EXPERTISE:
Integrate health, nutrition, fitness, sleep, and mental wellness into practical recommendations that fit the user's life.

FINANCIAL CONTEXT:
You have access to the user's Vitana wallet system with three currencies:
- USD (US Dollars): Traditional currency for payments and purchases
- VTNA (Vitana Network Tokens): Platform currency earned through activities, perfect 1:1 parity with Credits
- CREDITS: Service credits for premium features and lab tests, perfect 1:1 parity with VTNA

When asked about wallet/money/finances, show all three balances and explain currency purposes. Respond in the user's language.`
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
    // Preserve real URLs when model sends markdown links
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 $2')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');
  
  const preamblePatterns = [
    // Greetings and acknowledgments
    /^\s*(hello|hi|hey)[^.!?]*[.!?]\s*/i,
    /^\s*(yes|sure|certainly|of course)[,!\s]+/i,
    
    // Self-identification phrases
    /^\s*i['']?\s*(am|m)\s+here[^.!?]*[.!?]\s*/i,
    /^\s*i['']?\s*(am|m)\s+vitana[^.!?]*[.!?]\s*/i,
    /^\s*(as an? ai|i am (an? )?ai|as a computer program)[^.!?]*[.!?]\s*/i,
    /^\s*i['']?\s*(am|m)\s+(ready to|here to)\s+(help|assist)[^.!?]*[.!?]\s*/i,
    
    // Meta-statements about capabilities/limitations
    /^\s*i\s+(don't|do not)\s+have\s+(an?\s+)?(age|location|physical\s+form)[^.!?]*[.!?]\s*/i,
    /^\s*i\s+exist\s+as\s+a\s+digital\s+entity[^.!?]*[.!?]\s*/i,
    /^\s*i\s+(cannot|can't)\s+(technically\s+)?(hear|speak)[^.!?]*[.!?]\s*/i,
    /^\s*besides\s+knowing[^.!?]*[.!?]\s*/i,
    /^\s*i\s+(also\s+)?have\s+access\s+to[^.!?]*[.!?]\s*/i,
    
    // Original patterns
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

type LinkCandidate = {
  url: string;
  title?: string;
  location?: string;
};

const LINK_REQUEST_REGEX = /(\blink\b|\burl\b|\bhref\b|schick\s+mir\s+.*\blink\b|send\s+me\s+.*\blink\b|sende\s+.*\blink\b)/i;

function stripTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,!?;:)\]}]+$/g, '');
}

function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urls = new Set<string>();

  const markdownLinkRegex = /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gi;
  for (const match of text.matchAll(markdownLinkRegex)) {
    if (match[1]) urls.add(stripTrailingUrlPunctuation(match[1]));
  }

  const plainUrlRegex = /https?:\/\/[^\s<>"]+/gi;
  for (const match of text.matchAll(plainUrlRegex)) {
    if (match[0]) urls.add(stripTrailingUrlPunctuation(match[0]));
  }

  return Array.from(urls).filter(Boolean);
}

function ensureUrlsPreserved(sourceText: string, transformedText: string): string {
  const sourceUrls = extractUrlsFromText(sourceText);
  if (sourceUrls.length === 0) return transformedText;

  const missingUrls = sourceUrls.filter((url) => !transformedText.includes(url));
  if (missingUrls.length === 0) return transformedText;

  const spacer = transformedText.trim().length > 0 ? '\n' : '';
  return `${transformedText}${spacer}${missingUrls.join('\n')}`.trim();
}

function selectBestFallbackLink(userMessage: string, candidates: LinkCandidate[]): string | null {
  if (candidates.length === 0) return null;

  const query = userMessage.toLowerCase();
  const direct = candidates.find((candidate) => {
    const title = candidate.title?.toLowerCase() || '';
    const location = candidate.location?.toLowerCase() || '';
    return (title && query.includes(title)) || (location && query.includes(location));
  });

  if (direct?.url) return direct.url;

  const tokens = query
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  const scored = candidates
    .map((candidate) => {
      const haystack = `${candidate.title || ''} ${candidate.location || ''}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  if ((scored[0]?.score || 0) > 0) return scored[0].candidate.url;
  return candidates[0]?.url || null;
}

function enforceLinkIfRequested(userMessage: string, responseText: string, candidates: LinkCandidate[]): string {
  if (!LINK_REQUEST_REGEX.test(userMessage)) return responseText;
  if (extractUrlsFromText(responseText).length > 0) return responseText;

  const fallbackLink = selectBestFallbackLink(userMessage, candidates);
  if (!fallbackLink) return responseText;

  const trimmed = responseText.trim();
  return trimmed.length > 0 ? `${trimmed} ${fallbackLink}` : fallbackLink;
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
    console.log('[insights] Starting AI-powered extraction...');
    
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.warn('[insights] GOOGLE_GEMINI_API_KEY not configured, skipping extraction');
      return;
    }

    // Use direct Gemini API to extract structured insights
    const tool: GeminiToolDeclaration = {
      name: 'extract_insights',
      description: 'Extract meaningful facts, preferences, goals, and patterns from the conversation',
      parameters: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['fact', 'preference', 'goal', 'pattern', 'insight'],
                  description: 'Type of memory'
                },
                content: {
                  type: 'string',
                  description: 'Concise fact or insight (e.g., "Birthday: March 15, 1990")'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score (0.7-1.0)',
                  minimum: 0.7,
                  maximum: 1.0
                }
              },
              required: ['type', 'content', 'confidence']
            }
          }
        },
        required: ['insights']
      }
    };

    const extractionResponse = await generateContent(
      geminiApiKey,
      [
        {
          role: 'system',
          content: `Extract key information from this conversation that should be remembered. Focus on:
- Personal facts (birthday, age, location, occupation, family)
- Health data (conditions, medications, allergies, symptoms)
- Preferences (foods, activities, sleep schedule)
- Goals (health targets, lifestyle changes)
- Important dates and events

IMPORTANT: Do NOT extract the user's name or any name they mention as their own — the user's identity is already known from their profile. Never store "name is X" or "called X" as an insight.

Return ONLY meaningful, memorable facts. Skip questions, commands, or temporary information.
Each insight must have high confidence (0.7+). Be concise - extract the core fact only.`
        },
        {
          role: 'user',
          content: `User: ${userMessage}\nAI: ${aiResponse}`
        }
      ],
      { temperature: 0.3 },
      [tool]
    );

    const functionCall = extractFunctionCall(extractionResponse);
    if (!functionCall) {
      console.log('[insights] No insights extracted');
      return;
    }

    const { insights } = functionCall.args;
    
    if (!insights || insights.length === 0) {
      console.log('[insights] No insights found');
      return;
    }

    console.log(`[insights] Extracted ${insights.length} insights, checking for duplicates...`);

    // Deduplication: Check for similar existing memories
    const storedCount = 0;
    for (const insight of insights) {
      // Quality filter: minimum confidence threshold
      if (insight.confidence < 0.7) {
        console.log(`[insights] Skipped low confidence: ${insight.content} (${insight.confidence})`);
        continue;
      }

      // Check for duplicate by searching for similar content
      const similarityKeywords = insight.content.toLowerCase().split(' ').filter(w => w.length > 3);
      
      if (similarityKeywords.length > 0) {
        const { data: existingMemories } = await supabase
          .from('ai_memory')
          .select('id, content, confidence_score')
          .eq('user_id', userId)
          .eq('memory_type', insight.type)
          .eq('is_active', true)
          .limit(5);

        // Simple deduplication: check if content is very similar
        const isDuplicate = existingMemories?.some((existing: any) => {
          const existingLower = existing.content.toLowerCase();
          return similarityKeywords.some(keyword => existingLower.includes(keyword));
        });

        if (isDuplicate) {
          console.log(`[insights] Skipped duplicate: ${insight.content}`);
          continue;
        }
      }

      // Store new insight
      const { data: newMemory, error: insertError } = await supabase
        .from('ai_memory')
        .insert({
          user_id: userId,
          memory_type: insight.type,
          content: insight.content,
          confidence_score: insight.confidence,
          source_conversation_id: conversationId,
          is_active: true,
          metadata: { 
            extracted_at: new Date().toISOString(),
            extraction_method: 'ai_powered'
          }
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[insights] Insert error:', insertError);
      } else {
        console.log(`[insights] ✓ Stored: ${insight.type} - ${insight.content} (${insight.confidence})`);
        
        // Generate embedding asynchronously (don't block on this)
        supabase.functions.invoke('generate-memory-embedding', {
          body: { 
            memoryId: newMemory.id, 
            content: insight.content 
          }
        }).catch((embError) => {
          console.error(`[insights] Embedding generation failed for memory ${newMemory.id}:`, embError);
        });
      }
    }

    console.log(`[insights] Extraction complete`);
  } catch (error) {
    console.error('[insights] Error extracting insights:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      audio, 
      text, 
      language,
      override_language,  // RULE 1: Mandatory language override
      agentType = 'health',
      conversationId: existingConversationId,
      stream = true,
      isVoiceInput = false
    } = body;
    
    // RULE 1: Validate override_language against allowed set
    const ALLOWED_LANGUAGES = ['en-US', 'sr-RS', 'de-DE', 'ar-XA', 'es-ES', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-PT'];
    const targetLanguage = override_language || language || 'en-US';
    
    if (!ALLOWED_LANGUAGES.includes(targetLanguage)) {
      console.error('[ai-chat] RULE VIOLATION: Invalid language:', targetLanguage);
      return new Response(
        JSON.stringify({ error: `Invalid language: ${targetLanguage}. Allowed: ${ALLOWED_LANGUAGES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[ai-chat] RULE: target_language=', targetLanguage, {
      hasAudio: !!audio, 
      hasText: !!text, 
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
            language: targetLanguage,
            rule_based: true
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

    // RULE 2: NO AUTO-DETECTION - use targetLanguage directly
    let detectedLanguage = targetLanguage;
    console.log(`[ai-chat] RULE: Using fixed language: ${detectedLanguage} (no detection)`);
    
    let userMessage = text;
    let inputMethod: 'voice' | 'text' = isVoiceInput ? 'voice' : 'text';

    // Only transcribe audio if provided AND no text is available (server-side STT)
    if (audio && !text) {
      console.log('[audio] Transcribing audio with server-side STT...');
      inputMethod = 'voice';
      
      try {
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
          const errorText = await sttResponse.text();
          console.error('[audio] Google STT API error:', sttResponse.status, errorText);
          throw new Error(`Speech recognition failed: ${sttResponse.status}`);
        }

        const sttData = await sttResponse.json();
        if (!sttData.results || sttData.results.length === 0) {
          throw new Error('No speech detected');
        }

        userMessage = sttData.results[0].alternatives[0].transcript;
        // RULE 2: Do NOT override language from STT - stick to targetLanguage
        console.log('[audio] Transcribed:', userMessage, '| RULE: keeping language:', detectedLanguage);
      } catch (error) {
        console.error('[audio] Server-side STT error:', error);
        throw new Error(`Speech recognition failed: ${error.message}`);
      }
    } else if (audio && text) {
      console.log('[audio] Text already provided (client-side STT), skipping server-side transcription');
    } else {
      console.log('[language] No audio transcription, using selected language for TTS:', detectedLanguage);
    }

    if (!userMessage || userMessage.trim() === '') {
      throw new Error('No message content provided');
    }

    const isCrisis = CRISIS_KEYWORDS.some(keyword =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // === PHASE 3: SEMANTIC MEMORY SEARCH ===
    // Search for relevant memories based on user query
    let relevantMemories: any[] = [];
    let hasContradictions = false;
    let contradictions: any[] = [];

    try {
      console.log('[memory] Searching for relevant memories...');
      const memorySearchResult = await serviceClient.functions.invoke('search-memories', {
        body: { query: userMessage, userId: user.id }
      });

      if (memorySearchResult.data) {
        relevantMemories = memorySearchResult.data.relevant_memories || [];
        hasContradictions = memorySearchResult.data.has_contradictions || false;
        contradictions = memorySearchResult.data.contradictions || [];
        
        console.log(`[memory] Found ${relevantMemories.length} relevant memories`);
        
        if (hasContradictions) {
          console.log(`[memory] ⚠️ Detected contradictions in memories`);
        }

        // Reinforce referenced memories (boost confidence)
        if (relevantMemories.length > 0) {
          const memoryIds = relevantMemories.map(m => m.id);
          serviceClient.functions.invoke('reinforce-memory', {
            body: { memoryIds, action: 'reference' }
          }).catch(err => console.error('[memory] Failed to reinforce:', err));
        }
      }
    } catch (memoryError) {
      console.error('[memory] Memory search failed:', memoryError);
      // Continue without memory search
    }

    // Store user message (non-blocking) - ai_messages is the source of truth
    supabaseClient.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      input_method: inputMethod,
      context_used: userContext,
      metadata: {
        language: detectedLanguage,
        has_audio: !!audio,
        timestamp: new Date().toISOString()
      }
    }).then(async (result) => {
      console.log('[activity] User message stored, logging to activity table');
      
      // Also log to activity log for timeline
      const { error: logError } = await supabaseClient.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'chat.message',
        activity_data: {
          role: 'user',
          content: userMessage.substring(0, 200),
          conversation_id: conversationId,
          agent_type: agentType,
          input_method: inputMethod,
          message_length: userMessage.length
        },
        context_data: {
          conversation_id: conversationId,
          message_id: result.data?.[0]?.id,
          agent_type: agentType
        },
        dedupe_key: result.data?.[0]?.id ? `chat-user-${result.data[0].id}` : undefined
      });
      
      if (logError) {
        console.error('[activity] Failed to log user message:', logError);
      }
    }).catch((err) => console.error('Error storing user message:', err));

    console.log('Getting AI response from Gemini API...');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const basePrompt = SYSTEM_PROMPTS[agentType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.health;
    let systemMessage = basePrompt;
    const contextLinkCandidates: LinkCandidate[] = [];
    
    // === DETERMINISTIC COUNT QUESTION DETECTION ===
    const countQuestionPattern = /(how many|total|count|across.*memory garden|number of.*entr)/i;
    const isCountQuestion = countQuestionPattern.test(userMessage);
    
    if (userContext) {
      const { identity, temporal, health, memory, economic, community, memoryStats, memoryHeaders } = userContext;
      
      // === MEMORY STATS (Always inject first) ===
      if (memoryStats) {
        console.info(`[ai-chat] Injecting MEMORY STATS: total=${memoryStats.totalCount}`);
        systemMessage += '\n\n=== MEMORY STATS (Complete Memory Garden Data) ===\n';
        systemMessage += `Total Entries: ${memoryStats.totalCount} (${memoryStats.aiCount} Insights + ${memoryStats.diaryCount} Diary)\n`;
        systemMessage += `Last Updated: ${new Date(memoryStats.updatedAt).toLocaleString()}\n`;
        
        if (Object.keys(memoryStats.aiByType).length > 0) {
          systemMessage += '\nInsights by Type:\n';
          Object.entries(memoryStats.aiByType).forEach(([type, count]) => {
            systemMessage += `  • ${type}: ${count}\n`;
          });
        }
        
        if (Object.keys(memoryStats.diaryByTag).length > 0) {
          systemMessage += '\nDiary by Tag:\n';
          Object.entries(memoryStats.diaryByTag).forEach(([tag, count]) => {
            systemMessage += `  • ${tag}: ${count}\n`;
          });
        }
        
        // If this is a count question, answer it immediately
        if (isCountQuestion) {
          console.info('[ai-chat] Count question detected - answering from memoryStats');
        }
      }
      
      // === MEMORY CATALOG (Compact headers of all entries) ===
      if (memoryHeaders && (memoryHeaders.aiHeaders.length > 0 || memoryHeaders.diaryHeaders.length > 0)) {
        console.info(`[ai-chat] Injecting MEMORY CATALOG: ai=${memoryHeaders.aiHeaders.length}, diary=${memoryHeaders.diaryHeaders.length}`);
        systemMessage += '\n=== MEMORY CATALOG (Complete Index) ===\n';
        systemMessage += 'All Memory Garden entries (id | type/tag | date | preview):\n';
        
        // Include AI memory headers
        if (memoryHeaders.aiHeaders.length > 0) {
          systemMessage += '\nInsights:\n';
          memoryHeaders.aiHeaders.slice(0, 50).forEach(h => {
            const date = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const conf = h.confidence ? `${Math.round(h.confidence * 100)}%` : '';
            systemMessage += `  ${h.id.slice(0, 8)} | ${h.type} ${conf} | ${date} | ${h.preview.slice(0, 80)}\n`;
          });
          if (memoryHeaders.aiHeaders.length > 50) {
            systemMessage += `  ... and ${memoryHeaders.aiHeaders.length - 50} more insights (use retrieval for details)\n`;
          }
        }
        
        // Include diary headers
        if (memoryHeaders.diaryHeaders.length > 0) {
          systemMessage += '\nDiary Entries:\n';
          memoryHeaders.diaryHeaders.slice(0, 50).forEach(h => {
            const date = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const tags = h.tags.join(', ') || 'diary';
            systemMessage += `  ${h.id.slice(0, 8)} | ${tags} | ${date} | ${h.preview.slice(0, 80)}\n`;
          });
          if (memoryHeaders.diaryHeaders.length > 50) {
            systemMessage += `  ... and ${memoryHeaders.diaryHeaders.length - 50} more diary entries\n`;
          }
        }
        
        if (memoryHeaders.catalogTruncated) {
          systemMessage += '\nNote: Diary catalog shows most recent entries. Older entries available via retrieval.\n';
        }
      }
      
      // === MEMORY SNAPSHOT (High-Confidence Facts) ===
      const memorySnapshot = memory?.aiMemoryHighlights || [];
      const recentDiaryHighlights = memory?.diaryEntriesRecent?.slice(0, 3) || [];
      
      console.log('[snapshot] Injecting memory snapshot:', memorySnapshot.length, 'facts');
      console.log('[snapshot] Injecting diary highlights:', recentDiaryHighlights.length, 'entries');
      
      systemMessage += '\n\n=== USER SNAPSHOT (High-Confidence Facts from Memory Garden) ===\n';
      if (memorySnapshot.length > 0) {
        memorySnapshot.forEach((m: any) => {
          systemMessage += `• ${m.content} (${m.memory_type}, ${Math.round(m.confidence_score * 100)}% confidence)\n`;
        });
      } else {
        systemMessage += '• No high-confidence facts yet\n';
      }
      
      if (recentDiaryHighlights.length > 0) {
        systemMessage += '\n=== RECENT DIARY HIGHLIGHTS ===\n';
        recentDiaryHighlights.forEach((d: any) => {
          const date = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const preview = d.text.substring(0, 150);
          systemMessage += `• ${date}: ${preview}...\n`;
        });
      }
      
      systemMessage += '\n=== USER CONTEXT (Use naturally when relevant) ===\n';
      if (identity?.displayName || identity?.handle) {
        systemMessage += `Name: ${identity.displayName || 'User'}${identity.handle ? ` (@${identity.handle})` : ''}\n`;
      }
      if (identity?.birthDate || typeof identity?.ageYears === 'number') {
        const ageText = typeof identity.ageYears === 'number' ? ` (Age: ${identity.ageYears})` : '';
        systemMessage += `Birthday: ${identity.birthDate || 'unknown'}${ageText}\n`;
      }
      if (temporal?.dayOfWeek) {
        const now = new Date();
        systemMessage += `Time: ${temporal.dayOfWeek}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
      }
      
      // ALWAYS include wallet balances (lightweight, always relevant)
      if (economic?.balances) {
        const balances = Object.entries(economic.balances)
          .map(([curr, bal]) => `${bal} ${curr}`)
          .join(', ');
        systemMessage += `Wallet: ${balances}\n`;
        
        // Expanded multilingual economic keywords
        const economicKeywords = /(wallet|balance|currency|credits?|usd|vtn|money|pay|transfer|transaction|exchange|convert|rate|financial|funds?|account|новац|новчаник|салдо|токени|долари|кредити|средства|плаћање|трансфер|размена|курс|how much|do i have|колико|имам)/i;
        
        // Include transaction history if query is wallet-related
        if (economicKeywords.test(userMessage) && economic?.recentTransactions?.length > 0) {
          systemMessage += `\n=== WALLET ACTIVITY (Last 30 days) ===\n`;
          systemMessage += `Recent Transactions: ${economic.recentTransactions.length} total\n`;
          
          const recentTx = economic.recentTransactions.slice(0, 5);
          recentTx.forEach((tx: any) => {
            const direction = tx.isIncoming ? '⬇️ Received' : '⬆️ Sent';
            const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            systemMessage += `  ${direction}: ${tx.amount} ${tx.currency} - ${tx.type} (${tx.status}) - ${date}\n`;
          });
          
          if (economic.pendingPayments > 0) {
            systemMessage += `⏳ Pending: ${economic.pendingPayments} transaction(s)\n`;
          }
        }
        
        // Include exchange rates if query mentions conversion/exchange
        if (/exchange|convert|rate|курс|размена|conversion/i.test(userMessage) && economic?.exchangeRates?.length > 0) {
          systemMessage += `\n=== EXCHANGE RATES ===\n`;
          economic.exchangeRates.forEach((rate: any) => {
            const trend = rate.trend === 'up' ? '📈' : rate.trend === 'down' ? '📉' : '➡️';
            const change = rate.change24h > 0 ? `+${rate.change24h}%` : `${rate.change24h}%`;
            systemMessage += `  ${rate.from} → ${rate.to}: ${rate.rate} ${trend} (${change} 24h)\n`;
          });
        }
      }
      
      if (health?.vitanaIndex !== undefined) {
        systemMessage += `Health Score: ${health.vitanaIndex}/999\n`;
      }
      
      // Only include diary/insights if query mentions them
      const diaryKeywords = /(diary|journal|note|wrote|entry|entries|recorded)/i;
      if (memory?.rememberedInsights?.length > 0 && diaryKeywords.test(userMessage)) {
        const topInsights = memory.rememberedInsights
          .slice(0, 2)
          .map((i: any) => i.content)
          .join('; ');
        systemMessage += `Recent Diary Insights: ${topInsights}\n`;
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
            const link = e.slug
              ? `https://e.vitanaland.com/events/${encodeURIComponent(e.slug)}`
              : `https://e.vitanaland.com/events/${encodeURIComponent(e.id)}`;
            contextLinkCandidates.push({ url: link, title: e.title, location: e.location });
            systemMessage += `  ${participating} ${e.title} (${e.type}) - ${date}, ${spots} attending${e.location ? `, ${e.location}` : ''} → ${link}\n`;
          });
        }
        
        // User's Registered Events
        if (community.myRegisteredEvents?.length > 0) {
          systemMessage += `✅ Your Registered Events: ${community.myRegisteredEvents.length} events\n`;
          community.myRegisteredEvents.slice(0, 3).forEach((e: any) => {
            const date = new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const link = e.slug
              ? `https://e.vitanaland.com/events/${encodeURIComponent(e.slug)}`
              : `https://e.vitanaland.com/events/${encodeURIComponent(e.id)}`;
            contextLinkCandidates.push({ url: link, title: e.title });
            systemMessage += `  - ${e.title} - ${date} → ${link}\n`;
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
            const matchLink = `https://e.vitanaland.com/matches/${encodeURIComponent(m.id)}`;
            contextLinkCandidates.push({ url: matchLink, title: m.displayName });
            systemMessage += `  - ${m.displayName} (${m.compatibilityScore}% compatible)${interests} - ${status} → ${matchLink}\n`;
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
        systemMessage += '8. 🔗 CRITICAL: When users ask about an event or match, you MUST include the full clickable URL (starting with https://vitanaland.com/) from the → arrow in the context above. Copy the exact URL — never write placeholder text like "[Link zum Event]" or "[link]". Always paste the real URL.\n';
      }
      
      // === LONG-TERM MEMORY (Unified Semantic Search Results) ===
      if (relevantMemories.length > 0) {
        systemMessage += '\n=== LONG-TERM MEMORY (Retrieved from Memory Garden & Diaries) ===\n';
        systemMessage += 'The following memories are directly relevant to the user\'s current question:\n';
        
        relevantMemories.forEach((mem: any) => {
          const source = mem.source === 'diary' ? '📖' : '🧠';
          const emoji = mem.type === 'fact' ? '📌' : mem.type === 'preference' ? '❤️' : mem.type === 'goal' ? '🎯' : mem.type === 'diary' ? '📖' : '💡';
          const confidence = mem.confidence ? `${(mem.confidence * 100).toFixed(0)}%` : '70%';
          systemMessage += `${source}${emoji} [${mem.type}] ${mem.content} (${confidence})\n`;
        });

        // Contradiction warning
        if (hasContradictions && contradictions.length > 0) {
          systemMessage += '\n⚠️ CONTRADICTION DETECTED ⚠️\n';
          systemMessage += 'The following memories seem to contradict each other:\n';
          contradictions.forEach((c: any, i: number) => {
            systemMessage += `${i + 1}. "${c.memory1.content}" vs "${c.memory2.content}"\n`;
          });
          systemMessage += 'INSTRUCTION: Ask the user to clarify which information is correct before proceeding.\n';
        }
        
        console.log('[memory-injection] Injected', relevantMemories.length, 'memories into system prompt');
        systemMessage += '\nIMPORTANT: ALWAYS use these memories when answering. They contain facts the user previously shared.\n';
      }
      
      systemMessage += '=== END CONTEXT ===\n';
    }
    
    const LANGUAGE_NAMES: Record<string, string> = {
      'en-US': 'English', 'sr-RS': 'Serbian', 'de-DE': 'German',
      'ar-XA': 'Arabic', 'es-ES': 'Spanish', 'ru-RU': 'Russian',
      'zh-CN': 'Chinese', 'fr-FR': 'French', 'pt-PT': 'Portuguese'
    };
    
    const targetLanguageName = LANGUAGE_NAMES[detectedLanguage] || 'English';
    console.log('[ai-chat] RULE: Target language name=', targetLanguageName);

    // STREAMING IMPLEMENTATION using Gemini
    if (stream) {
      const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
      if (!GEMINI_API_KEY) {
        throw new Error('GOOGLE_GEMINI_API_KEY not configured');
      }

      // Prepare Gemini messages format
      const geminiMessages = [
        { role: 'user', parts: [{ text: systemMessage }] },
        { role: 'model', parts: [{ text: 'Understood.' }] }
      ];
      
      // Add conversation history
      conversationHistory.forEach((msg: any) => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        geminiMessages.push({ role, parts: [{ text: msg.content }] });
      });
      
      // Add current user message
      geminiMessages.push({ role: 'user', parts: [{ text: userMessage }] });

      // Call Gemini streaming API
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('[ai-chat] Gemini streaming failed:', aiResponse.status, errorText);
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
          let firstSentenceBuffer = ''; // Buffer for first sentence preamble filtering
          let isFirstSentence = true;
          
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
            let sseBuffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Stream-safe decode and accumulate into buffer
              const chunk = decoder.decode(value, { stream: true });
              sseBuffer += chunk;
              
              // Process complete lines only; keep the trailing partial line in buffer
              while (true) {
                const newlineIndex = sseBuffer.indexOf('\n');
                if (newlineIndex === -1) break;
                let line = sseBuffer.slice(0, newlineIndex);
                sseBuffer = sseBuffer.slice(newlineIndex + 1);
                if (line.endsWith('\r')) line = line.slice(0, -1);
                if (!line || line.startsWith(':')) continue; // Skip comments/empties
                
                const match = line.match(/^data:\s*(.*)$/);
                if (!match) continue;
                const data = match[1];
                if (data === '[DONE]') continue;
                
                // Parse Gemini SSE format
                let parsed: any;
                try {
                  parsed = JSON.parse(data);
                } catch (_e) {
                  // Re-buffer the line and wait for more data
                  sseBuffer = line + '\n' + sseBuffer;
                  break; // break inner loop to read more bytes
                }
                
                // Extract content from Gemini format
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  if (firstToken) {
                    console.info('[stream] ⚡ First token received');
                    firstToken = false;
                  }
                  
                  fullText += content;
                  currentSentence += content;
                  
                  // Buffer first sentence for preamble filtering
                  if (isFirstSentence) {
                    firstSentenceBuffer += content;
                    
                    // Check if first sentence is complete
                    if (/[.!?]\s*$/.test(firstSentenceBuffer)) {
                      const originalFirst = firstSentenceBuffer.trim();
                      const cleanedFirst = cleanAIResponse(originalFirst);
                      
                      console.info(`[stream] 🔍 First sentence check - Original: "${originalFirst.substring(0, 50)}...", Cleaned: "${cleanedFirst.substring(0, 50) || '(EMPTY)'}..."`);
                      
                      // If first sentence was just preamble (cleaned to empty), discard it
                      if (cleanedFirst.length === 0) {
                        console.info('[stream] 🗑️ Discarded preamble from first sentence');
                        currentSentence = '';
                        firstSentenceBuffer = '';
                      } else {
                        // First sentence has real content, emit the CLEANED version
                        const textEvent = `data: ${JSON.stringify({ type: 'text', content: cleanedFirst })}\n\n`;
                        safeEnqueue(encoder.encode(textEvent));
                        
                        // Process for TTS
                        if (cleanedFirst.length > 8) {
                          sentencesProcessed++;
                          console.info(`[stream] 📝 First sentence complete (${cleanedFirst.length} chars) - triggering TTS`);
                          
                          const p = synthesizeChunk(cleanedFirst, googleApiKey, normalizedLang).then(audioContent => {
                            if (audioContent && isControllerOpen) {
                              console.info(`[stream] 🔊 Audio chunk ${sentencesProcessed} queued`);
                              const audioEvent = `data: ${JSON.stringify({ type: 'audio', content: audioContent })}\n\n`;
                              safeEnqueue(encoder.encode(audioEvent));
                            }
                          }).catch(err => console.error(`[stream] TTS error:`, err));
                          pendingTTS.push(p);
                        }
                        currentSentence = '';
                      }
                      
                      isFirstSentence = false;
                      firstSentenceBuffer = '';
                    }
                    continue; // Don't emit tokens while buffering first sentence
                  }
                  
                  // After first sentence, emit tokens immediately
                  const textEvent = `data: ${JSON.stringify({ type: 'text', content })}\n\n`;
                  safeEnqueue(encoder.encode(textEvent));
                  
                  // Check if sentence is complete for TTS
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
              }
            }
            
            console.log(`[ai-chat] Phase 1 complete: ${fullText.length} chars collected`);
            
            // RULE 4: PHASE 2 - Deterministic translation pass using Gemini
            console.log(`[ai-chat] RULE: Translating to ${targetLanguageName} (temperature=0)`);
            
            const { generateContent } = await import("../_shared/gemini-client.ts");
            const translateResp = await generateContent(
              GEMINI_API_KEY,
              [
                {
                  role: 'system',
                  content: `You are a precise translator. Translate the user content to ${targetLanguageName} only. Preserve tone, brevity, and natural phrasing. Output ONLY the translated message, no explanations.`
                },
                { role: 'user', content: fullText }
              ],
              { temperature: 0 }
            );

            const translatedText = translateResp.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!translatedText) {
              // RULE 4: STRICT FAIL
              console.error('[ai-chat] RULE VIOLATION: No translation output');
              const errorEvent = `data: ${JSON.stringify({
                type: 'error',
                message: `Translation to ${targetLanguageName} produced no output.`
              })}\n\n`;
              safeEnqueue(encoder.encode(errorEvent));
              controller.close();
              return;
            }

            console.log(`[ai-chat] RULE: Translation complete (${translatedText.length} chars)`);
            
            // PHASE 3: Re-stream translated text with deterministic URL preservation
            fullText = enforceLinkIfRequested(
              userMessage,
              ensureUrlsPreserved(fullText, translatedText),
              contextLinkCandidates
            );
            const sentences = splitIntoSentences(fullText);
            
            for (const sentence of sentences) {
              const cleaned = cleanAIResponse(sentence);
              if (!cleaned || cleaned.length < 3) continue;
              
              // Stream text
              const textEvent = `data: ${JSON.stringify({ type: 'text', content: cleaned })}\n\n`;
              safeEnqueue(encoder.encode(textEvent));
              
              // Generate TTS for translated text
              sentencesProcessed++;
              const audioContent = await synthesizeChunk(cleaned, googleApiKey, normalizedLang);
              if (audioContent && isControllerOpen) {
                console.info(`[stream] 🔊 Translated audio chunk ${sentencesProcessed} queued`);
                const audioEvent = `data: ${JSON.stringify({ type: 'audio', content: audioContent })}\n\n`;
                safeEnqueue(encoder.encode(audioEvent));
              }
            }
            
            
            // Store complete AI message (rule-based, translated)
            const cleanedFullText = enforceLinkIfRequested(
              userMessage,
              ensureUrlsPreserved(fullText, cleanAIResponse(fullText)),
              contextLinkCandidates
            );
            supabaseClient.from('ai_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: cleanedFullText,
              metadata: {
                model: 'google/gemini-2.5-flash',
                agent_type: agentType,
                context_used: !!userContext,
                language: detectedLanguage,
                rule_based: true,
                translated: true,
                timestamp: new Date().toISOString()
              }
            }).then(async (result) => {
              console.info('[stream] ✓ AI message stored');
              
              // Sync memoryStats to user_memory_metadata
              if (userContext?.memoryStats) {
                const { totalCount, updatedAt } = userContext.memoryStats;
                await supabaseClient.from('user_memory_metadata')
                  .upsert({
                    user_id: user.id,
                    total_memories_count: totalCount,
                    last_ai_sync_at: updatedAt
                  }, {
                    onConflict: 'user_id'
                  })
                  .then(() => console.info(`[ai-chat] memoryStats synced -> total=${totalCount}`))
                  .catch(syncErr => console.error('[ai-chat] Failed to sync memoryStats:', syncErr));
              }
              
              // Log activity with proper error handling
              const { error: logError } = await supabaseClient.from('user_activity_log').insert({
                user_id: user.id,
                activity_type: 'chat.message',
                activity_data: {
                  role: 'assistant',
                  content: cleanedFullText.substring(0, 200),
                  conversation_id: conversationId,
                  agent_type: agentType,
                  message_length: cleanedFullText.length
                },
                context_data: {
                  conversation_id: conversationId,
                  message_id: result.data?.[0]?.id,
                  agent_type: agentType
                },
                dedupe_key: result.data?.[0]?.id ? `chat-ai-${result.data[0].id}` : undefined
              });
              
              if (logError) {
                console.error('[activity] Failed to log AI message:', logError);
              }
            }).catch((err) => console.error('[stream] Error storing AI message:', err));
            
            // Emit link events for any URLs found in the final response
            const responseUrls = extractUrlsFromText(fullText);
            for (const url of responseUrls) {
              const linkEvent = `data: ${JSON.stringify({ type: 'link', url })}\n\n`;
              safeEnqueue(encoder.encode(linkEvent));
            }
            if (responseUrls.length > 0) {
              console.info(`[stream] 🔗 Emitted ${responseUrls.length} link event(s)`);
            }

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
              detectedLanguage: normalizedLang,
              rule_based: true,
              translated: true
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
    const aiText = enforceLinkIfRequested(
      userMessage,
      ensureUrlsPreserved(rawAiText, cleanAIResponse(rawAiText)),
      contextLinkCandidates
    );

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
    }).then(async (result) => {
      console.log('AI message stored');
      
      // Sync memoryStats to user_memory_metadata
      if (userContext?.memoryStats) {
        const { totalCount, updatedAt } = userContext.memoryStats;
        await supabaseClient.from('user_memory_metadata')
          .upsert({
            user_id: user.id,
            total_memories_count: totalCount,
            last_ai_sync_at: updatedAt
          }, {
            onConflict: 'user_id'
          })
          .then(() => console.info(`[ai-chat] memoryStats synced -> total=${totalCount}`))
          .catch(syncErr => console.error('[ai-chat] Failed to sync memoryStats:', syncErr));
      }
      
      // Log activity with proper error handling
      const { error: logError } = await supabaseClient.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'chat.message',
        activity_data: {
          role: 'assistant',
          content: aiText.substring(0, 200),
          conversation_id: conversationId,
          agent_type: agentType,
          message_length: aiText.length
        },
        context_data: {
          conversation_id: conversationId,
          message_id: result.data?.[0]?.id,
          agent_type: agentType
        },
        dedupe_key: result.data?.[0]?.id ? `chat-ai-${result.data[0].id}` : undefined
      });
      
      if (logError) {
        console.error('[activity] Failed to log AI message:', logError);
      }
    }).catch((err) => console.error('Error storing AI message:', err));

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
