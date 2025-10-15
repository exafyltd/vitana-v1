import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Converts raw PCM audio data to WAV format with proper headers
 * Based on: http://soundfile.sapp.org/doc/WaveFormat/
 */
function convertPCMToWav(
  pcmData: Uint8Array,
  sampleRate: number = 48000,
  bitsPerSample: number = 16,
  numChannels: number = 1
): Uint8Array {
  const dataSize = pcmData.length;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const chunkSize = 36 + dataSize; // 36 bytes for header fields before data chunk size

  // Create WAV header (44 bytes)
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // Helper to write string
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, chunkSize, true); // File size - 8
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Combine header and PCM data
  const wavFile = new Uint8Array(44 + dataSize);
  wavFile.set(new Uint8Array(header), 0);
  wavFile.set(pcmData, 44);

  return wavFile;
}

// Map languages to Chirp 3 HD voices (primarily female voices)
const GEMINI_VOICE_MAP: Record<string, string> = {
  'en-US': 'en-US-Chirp3-HD-Leda',
  'en-GB': 'en-GB-Chirp3-HD-Aoede',
  'en-AU': 'en-AU-Chirp3-HD-Callirrhoe',
  'en-IN': 'en-IN-Chirp3-HD-Kore',
  'de-DE': 'de-DE-Chirp3-HD-Achernar',
  'ar-XA': 'ar-XA-Chirp3-HD-Aoede',
  'es-ES': 'es-ES-Chirp3-HD-Gacrux',
  'es-US': 'es-US-Chirp3-HD-Vindemiatrix',
  'ru-RU': 'ru-RU-Chirp3-HD-Kore',
  'cmn-CN': 'cmn-CN-Chirp3-HD-Leda',
  'zh-CN': 'cmn-CN-Chirp3-HD-Leda',
  'fr-FR': 'fr-FR-Chirp3-HD-Pulcherrima',
  'fr-CA': 'fr-CA-Chirp3-HD-Zephyr',
  'pt-BR': 'pt-BR-Chirp3-HD-Laomedeia',
  'pt-PT': 'pt-PT-Chirp3-HD-Zephyr',
  'it-IT': 'it-IT-Chirp3-HD-Erinome',
  'ja-JP': 'ja-JP-Chirp3-HD-Callirrhoe',
  'ko-KR': 'ko-KR-Chirp3-HD-Kore',
  'nl-NL': 'nl-NL-Chirp3-HD-Leda',
  'nl-BE': 'nl-BE-Chirp3-HD-Aoede',
  'pl-PL': 'pl-PL-Chirp3-HD-Despina',
  'tr-TR': 'tr-TR-Chirp3-HD-Erinome',
  'sv-SE': 'sv-SE-Chirp3-HD-Gacrux',
  'da-DK': 'da-DK-Chirp3-HD-Laomedeia',
  'fi-FI': 'fi-FI-Chirp3-HD-Sulafat',
  'nb-NO': 'nb-NO-Chirp3-HD-Vindemiatrix',
  'hi-IN': 'hi-IN-Chirp3-HD-Kore',
  'bn-IN': 'bn-IN-Chirp3-HD-Aoede',
  'ta-IN': 'ta-IN-Chirp3-HD-Leda',
  'te-IN': 'te-IN-Chirp3-HD-Callirrhoe',
  'ml-IN': 'ml-IN-Chirp3-HD-Erinome',
  'kn-IN': 'kn-IN-Chirp3-HD-Despina',
  'gu-IN': 'gu-IN-Chirp3-HD-Gacrux',
  'mr-IN': 'mr-IN-Chirp3-HD-Laomedeia',
  'ur-IN': 'ur-IN-Chirp3-HD-Pulcherrima',
  'id-ID': 'id-ID-Chirp3-HD-Sulafat',
  'th-TH': 'th-TH-Chirp3-HD-Vindemiatrix',
  'vi-VN': 'vi-VN-Chirp3-HD-Zephyr',
  'uk-UA': 'uk-UA-Chirp3-HD-Kore',
  'sw-KE': 'sw-KE-Chirp3-HD-Aoede',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, languageCode } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('[Gemini TTS] Request:', { voiceId, languageCode, textLength: text.length });

    // Determine which voice to use
    let finalVoiceId = voiceId;
    if (!finalVoiceId || !finalVoiceId.includes('Chirp3-HD')) {
      // Auto-select voice based on language
      finalVoiceId = GEMINI_VOICE_MAP[languageCode] || 'en-US-Chirp3-HD-Leda';
      console.log('[Gemini TTS] Auto-selected voice:', finalVoiceId);
    }

    // Get access token from vertex-auth function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: authData, error: authError } = await supabase.functions.invoke('vertex-auth');
    
    if (authError || !authData?.access_token) {
      console.error('[Gemini TTS] Auth error:', authError);
      throw new Error('Failed to get authentication token');
    }

    const accessToken = authData.access_token;

    // Call Google Cloud Text-to-Speech API with Chirp 3 HD voices
    const ttsResponse = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            text: text,
          },
          voice: {
            languageCode: languageCode,
            name: finalVoiceId,
          },
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 48000,
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[Gemini TTS] API error:', ttsResponse.status, errorText);
      throw new Error(`Gemini TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    
    if (!ttsData.audioContent) {
      console.error('[Gemini TTS] No audio content in response:', ttsData);
      throw new Error('No audio content received from Gemini TTS');
    }

    console.log('[Gemini TTS] Received audio, converting to WAV format...');

    // Decode base64 PCM data
    const base64Audio = ttsData.audioContent;
    const binaryString = atob(base64Audio);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM to WAV with proper headers
    // LINEAR16 at 48kHz, 1 channel
    const wavData = convertPCMToWav(pcmData, 48000, 16, 1);

    // Convert back to base64
    let wavBase64 = '';
    const chunkSize = 0x8000; // Process in chunks to avoid stack overflow
    for (let i = 0; i < wavData.length; i += chunkSize) {
      const chunk = wavData.subarray(i, Math.min(i + chunkSize, wavData.length));
      wavBase64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const finalBase64 = btoa(wavBase64);

    console.log('[Gemini TTS] Success! WAV audio size:', finalBase64.length);

    return new Response(
      JSON.stringify({ audioContent: finalBase64 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Gemini TTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to generate speech with Gemini TTS'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
