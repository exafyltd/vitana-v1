import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Crisis keywords for AlKalma (English + Arabic)
const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'end my life', 'self-harm', 'hurt myself',
  'overdose', 'hopeless', 'give up', 'انتحار', 'إيذاء النفس', 'يائس'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, text, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Try to get user's API key from database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('service_name', 'google_cloud')
      .maybeSingle();

    // Use user's API key if available, otherwise fall back to env variable
    const GOOGLE_CLOUD_API_KEY = apiKeyData?.api_key || Deno.env.get('GOOGLE_CLOUD_API_KEY');

    if (!GOOGLE_CLOUD_API_KEY) {
      throw new Error('Google Cloud API key not configured. Please add your API key in settings.');
    }

    let detectedLanguage = language || 'en-US';
    let userMessage = text;

    // Step 1: If audio provided, transcribe with STT (auto-detect language)
    if (audio) {
      console.log('Transcribing audio with Google Cloud STT...');
      const sttResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'de-DE', // Primary: German (Maxina)
              alternativeLanguageCodes: ['ar-XA', 'en-US', 'es-ES', 'ru-RU', 'zh-CN'],
              model: 'latest_long',
              enableAutomaticPunctuation: true,
            },
            audio: { content: audio },
          }),
        }
      );

      if (!sttResponse.ok) {
        const error = await sttResponse.text();
        console.error('STT error:', error);
        throw new Error('Speech recognition failed');
      }

      const sttData = await sttResponse.json();
      if (!sttData.results || sttData.results.length === 0) {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }

      const transcript = sttData.results[0].alternatives[0].transcript;
      if (!transcript || transcript.trim() === '') {
        throw new Error('No speech detected. Please speak clearly and try again.');
      }

      userMessage = transcript;
      detectedLanguage = sttData.results[0].languageCode || detectedLanguage;
      console.log('Transcribed:', userMessage, 'Language:', detectedLanguage);
    }

    // Validate userMessage exists before proceeding
    if (!userMessage || userMessage.trim() === '') {
      throw new Error('No message content provided');
    }

    // Step 2: Check for crisis keywords (AlKalma)
    const hasCrisisKeyword = CRISIS_KEYWORDS.some(keyword =>
      userMessage.toLowerCase().includes(keyword.toLowerCase())
    );

    // Step 3: Get AI response from Lovable AI (Gemini 2.5 Flash)
    console.log('Getting AI response from Lovable AI...');
    const systemPrompt = `You are a multilingual AI wellness coach for Vitana. 
Respond in the same language as the user's message. 
Be empathetic, supportive, and professional.
Keep responses concise (2-3 sentences max).
Languages: German, English, Arabic, Spanish, Russian, Chinese.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI error:', error);
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices[0].message.content;
    console.log('AI response:', aiText);

    // Step 4: Convert AI response to speech with TTS
    console.log('Converting to speech with Google Cloud TTS...');
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: aiText },
          voice: {
            languageCode: detectedLanguage,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            pitch: 0,
            speakingRate: 1.0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('TTS error:', error);
      throw new Error('Text-to-speech failed');
    }

    const ttsData = await ttsResponse.json();
    const audioContent = ttsData.audioContent;

    return new Response(
      JSON.stringify({
        text: aiText,
        audio: audioContent,
        language: detectedLanguage,
        crisisDetected: hasCrisisKeyword,
        transcript: userMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
