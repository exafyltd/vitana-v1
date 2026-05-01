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

const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English',
  'de-DE': 'German',
  'sr-RS': 'Serbian',
  'ar-SA': 'Arabic',
  'es-ES': 'Spanish',
  'ru-RU': 'Russian',
  'zh-CN': 'Chinese',
  'fr-FR': 'French',
  'pt-PT': 'Portuguese',
  'pl-PL': 'Polish',
};

/**
 * Gemini accepts a wide range of audio mime types directly. Map the browser-
 * provided mime to one Gemini understands. Gemini 1.5 supports audio/mp3,
 * audio/aac, audio/ogg, audio/wav, audio/flac, audio/m4a, audio/webm.
 */
function normalizeMimeForGemini(mimeType?: string): string {
  const mt = (mimeType || '').toLowerCase();
  if (!mt) return 'audio/mp4';
  if (mt.startsWith('audio/webm')) return 'audio/webm';
  if (mt.startsWith('audio/ogg')) return 'audio/ogg';
  if (mt.startsWith('audio/wav') || mt.startsWith('audio/x-wav')) return 'audio/wav';
  if (mt.startsWith('audio/flac')) return 'audio/flac';
  if (mt.startsWith('audio/aac')) return 'audio/aac';
  if (mt.startsWith('audio/mpeg') || mt.startsWith('audio/mp3')) return 'audio/mp3';
  if (mt.startsWith('audio/mp4') || mt.startsWith('audio/m4a') || mt.startsWith('audio/x-m4a')) return 'audio/mp4';
  // Strip codec suffix and retry
  const bare = mt.split(';')[0].trim();
  if (bare !== mt) return normalizeMimeForGemini(bare);
  return 'audio/mp4';
}

async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  language: string,
  apiKey: string,
): Promise<string> {
  const langName = LANGUAGE_NAMES[language] || 'the spoken language';
  const requestBody = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        {
          text:
            `Transcribe the spoken audio verbatim in ${langName}. ` +
            `Output ONLY the transcript text — no commentary, no quotes, no labels. ` +
            `If the audio is silent or has no speech, output an empty string.`,
        },
      ],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
    },
  };

  // gemini-1.5-flash was retired (404 on this key as of 2026-05-01).
  // gemini-2.5-flash is the current cheap+fast model that accepts inline
  // audio (mp3/aac/wav/webm/ogg/flac/mp4). Allow override via env so we can
  // switch models without another deploy if Google retires this one too.
  const model = Deno.env.get('GEMINI_TRANSCRIBE_MODEL') || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  const transcript: string = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p?.text || '')
    .join('')
    .trim();

  // Strip a leading "Transcript:" label or surrounding quotes if Gemini adds them.
  return transcript
    .replace(/^transcript\s*:\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

async function transcribeWithGoogleSTT(
  audioBase64: string,
  mimeType: string,
  language: string,
  apiKey: string,
): Promise<string> {
  // Encoding map for the synchronous v1 endpoint. iOS MP4/AAC is NOT supported
  // here — that's why Gemini is the primary path. This is only used as a
  // fallback when no Gemini key is configured AND the audio is webm/ogg/wav.
  let encoding = 'WEBM_OPUS';
  const mt = (mimeType || '').toLowerCase();
  if (mt.includes('ogg')) encoding = 'OGG_OPUS';
  else if (mt.includes('wav')) encoding = 'LINEAR16';
  else if (mt.includes('webm')) encoding = 'WEBM_OPUS';
  else throw new Error(`Google STT v1 does not support ${mimeType}; configure GOOGLE_GEMINI_API_KEY for full coverage.`);

  const config: Record<string, unknown> = {
    encoding,
    languageCode: language,
    alternativeLanguageCodes: ALLOWED_LANGUAGES.filter(l => l !== language).slice(0, 3),
    model: 'latest_long',
    enableAutomaticPunctuation: true,
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, audio: { content: audioBase64 } }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google STT ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  return ((data?.results || []) as any[])
    .map(r => r?.alternatives?.[0]?.transcript || '')
    .filter(Boolean)
    .join(' ')
    .trim();
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

    const lang = normalizeLanguage(language);
    const geminiMime = normalizeMimeForGemini(mimeType);

    const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    let googleSttKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    if (!googleSttKey) {
      const { data: keyData } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('service_name', 'google_cloud')
        .maybeSingle();
      googleSttKey = keyData?.api_key || undefined;
    }

    if (!geminiKey && !googleSttKey) {
      return new Response(
        JSON.stringify({ error: 'Neither GOOGLE_GEMINI_API_KEY nor GOOGLE_CLOUD_API_KEY is configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let transcript = '';
    let provider = '';
    let firstError: string | null = null;

    // Primary: Gemini (handles iOS MP4/AAC, WebM/Opus, mp3, wav, etc.)
    if (geminiKey) {
      try {
        transcript = await transcribeWithGemini(audio, geminiMime, lang, geminiKey);
        provider = 'gemini';
      } catch (err: any) {
        firstError = `gemini: ${err?.message || err}`;
        console.error('[transcribe-audio] Gemini failed:', firstError);
      }
    }

    // Fallback: Google Cloud Speech-to-Text (only useful for webm/ogg/wav)
    if (!provider && googleSttKey) {
      try {
        transcript = await transcribeWithGoogleSTT(audio, geminiMime, lang, googleSttKey);
        provider = 'google-stt';
      } catch (err: any) {
        const sttError = `google-stt: ${err?.message || err}`;
        console.error('[transcribe-audio] Google STT failed:', sttError);
        return new Response(
          JSON.stringify({
            error: 'Transcription failed',
            details: firstError ? `${firstError} | ${sttError}` : sttError,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Transcription failed', details: firstError || 'unknown' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ transcript, language: lang, provider }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[transcribe-audio] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
