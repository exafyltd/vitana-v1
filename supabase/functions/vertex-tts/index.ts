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
    const { text, voiceId, languageCode, stylePrompt } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    // Get credentials from Google Cloud service account
    const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    
    if (!serviceAccountJson || !projectId) {
      throw new Error('Google Cloud credentials not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Detect if this is a Gemini voice (supports stylePrompt)
    const geminiVoices = ['charon', 'kore', 'fenrir', 'aoede'];
    const isGeminiVoice = geminiVoices.includes((voiceId || '').toLowerCase());

    console.log('🎤 Vertex TTS request:', { 
      voiceId, 
      languageCode, 
      textLength: text.length,
      hasStylePrompt: !!stylePrompt,
      isGeminiVoice
    });

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(serviceAccount),
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('❌ Token request failed:', tokenResponse.status, errorBody);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();

    // Prepare synthesis input - only use stylePrompt for Gemini voices
    const synthesisInput: any = { text };
    if (isGeminiVoice && stylePrompt) {
      synthesisInput.prompt = stylePrompt;
    }

    // Prepare voice config - only use modelName for Gemini voices
    const voiceConfig: any = {
      languageCode: languageCode || 'en-US',
      name: voiceId || 'Charon',
    };
    if (isGeminiVoice) {
      voiceConfig.modelName = 'gemini-2.5-pro-tts';
    }

    // Call Vertex AI Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: synthesisInput,
          voice: voiceConfig,
          audioConfig: {
            audioEncoding: 'MP3',
            sampleRateHertz: 24000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Vertex TTS error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500)
      });
      throw new Error(`Vertex TTS API error: ${response.status} - ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('✅ Vertex TTS success');

    return new Response(
      JSON.stringify({ audioContent: data.audioContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in vertex-tts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = serviceAccount.private_key;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${encodedSignature}`;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
