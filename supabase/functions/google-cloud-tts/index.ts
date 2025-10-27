import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, languageCode, speakingRate, pitch, useSSML } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    const apiKey = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Cloud TTS API key not configured');
    }

    console.log('🎤 Google Cloud TTS request:', { voiceId, languageCode, textLength: text.length });

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: useSSML ? { ssml: text } : { text },
          voice: {
            languageCode: languageCode || 'en-US',
            name: voiceId || 'en-US-Standard-A',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate ?? 1.0,
            pitch: pitch ?? 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Google Cloud TTS error:', response.status, error);
      throw new Error(`Google Cloud TTS API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Google Cloud TTS success');

    return new Response(
      JSON.stringify({ audioContent: data.audioContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-cloud-tts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
