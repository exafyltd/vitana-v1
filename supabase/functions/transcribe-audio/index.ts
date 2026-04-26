import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_LANGUAGES = ['en-US', 'sr-RS', 'de-DE', 'ar-SA', 'ar-XA', 'es-ES', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-PT', 'pl-PL'];

function normalizeLanguage(lang: string): string {
  if (!lang) return 'en-US';
  const map: Record<string, string> = {
    'ar-XA': 'ar-SA',
    'de': 'de-DE',
    'en': 'en-US',
    'sr': 'sr-RS',
    'ar': 'ar-SA',
    'es': 'es-ES',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'fr': 'fr-FR',
    'pt': 'pt-PT',
    'pl': 'pl-PL',
  };
  if (map[lang]) return map[lang];
  return ALLOWED_LANGUAGES.includes(lang) ? lang : 'en-US';
}

function detectEncoding(mimeType?: string): { encoding: string; sampleRateHertz?: number } {
  const mt = (mimeType || '').toLowerCase();
  if (mt.includes('webm') || mt.includes('opus')) return { encoding: 'WEBM_OPUS' };
  if (mt.includes('ogg')) return { encoding: 'OGG_OPUS' };
  if (mt.includes('wav')) return { encoding: 'LINEAR16', sampleRateHertz: 16000 };
  if (mt.includes('mp4') || mt.includes('m4a') || mt.includes('aac')) return { encoding: 'MP3' };
  if (mt.includes('mpeg') || mt.includes('mp3')) return { encoding: 'MP3' };
  return { encoding: 'WEBM_OPUS' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { audio, language, mimeType } = await req.json();
    if (!audio) {
      return new Response(JSON.stringify({ error: 'No audio provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    if (!googleApiKey) {
      const { data: keyData } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('service_name', 'google_cloud')
        .maybeSingle();
      googleApiKey = keyData?.api_key || undefined;
    }

    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Google Cloud API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lang = normalizeLanguage(language);
    const { encoding, sampleRateHertz } = detectEncoding(mimeType);
    const alternativeLanguageCodes = ALLOWED_LANGUAGES.filter(l => l !== lang).slice(0, 3);

    const config: Record<string, unknown> = {
      encoding,
      languageCode: lang,
      alternativeLanguageCodes,
      model: 'latest_long',
      enableAutomaticPunctuation: true,
    };
    if (sampleRateHertz) config.sampleRateHertz = sampleRateHertz;

    const sttResponse = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, audio: { content: audio } }),
      }
    );

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('[transcribe-audio] Google STT error:', sttResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Speech recognition failed', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sttData = await sttResponse.json();
    const transcript = (sttData.results || [])
      .map((r: any) => r.alternatives?.[0]?.transcript || '')
      .filter(Boolean)
      .join(' ')
      .trim();

    return new Response(
      JSON.stringify({ transcript, language: lang }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[transcribe-audio] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
