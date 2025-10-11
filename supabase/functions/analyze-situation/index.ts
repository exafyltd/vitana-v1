import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Base64url encoding helpers (no padding, URL-safe)
function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(str: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncodeBytes(encoder.encode(str));
}

// Helper function to generate JWT for service account
async function generateAccessToken(serviceAccountKey: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccountKey.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountKey.client_email,
    sub: serviceAccountKey.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform"
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const claimB64 = base64UrlEncodeString(JSON.stringify(claim));
  const signatureInput = `${headerB64}.${claimB64}`;

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccountKey.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64UrlEncodeBytes(new Uint8Array(signature));
  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('Token exchange failed:', tokenResponse.status, tokenData);
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  console.log('Successfully obtained access token');
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log authorization header presence for diagnostics
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    if (authHeader) {
      console.log('Auth header preview:', authHeader.substring(0, 20) + '...');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
    if (!token) {
      console.error('Authentication failed: missing bearer token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Authentication failed:', userError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const { situation, contextFilters, constraints } = await req.json();
    console.log('Analyzing situation:', situation);

    // Use Lovable AI Gateway (no external secrets required)
    const systemPrompt = `You are an automation expert analyzing healthcare scenarios to suggest automation rules.

Your task is to analyze the given situation and provide structured automation recommendations.

Return a JSON object with this exact structure:
{
  "analysis": "Brief analysis of the situation and automation opportunities",
  "suggestedTriggers": ["trigger1", "trigger2"],
  "suggestedConditions": [
    {"field": "field_name", "operator": "equals", "value": "value", "reasoning": "why this condition"}
  ],
  "suggestedActions": [
    {"type": "send_notification", "config": {"title": "...", "message": "..."}, "reasoning": "why this action"}
  ],
  "priority": "high|medium|low",
  "estimatedImpact": "Description of expected impact"
}

Available triggers: user_signup, message_received, appointment_scheduled, health_metric_updated, user_inactive, notification_sent
Available condition fields: user_role, user_status, time_of_day, day_of_week, inactive_days
Available operators: equals, not_equals, greater_than, less_than, contains
Available actions: send_email, send_sms, send_notification, create_task`;

    const userPrompt = `Analyze this situation and suggest automation:

Situation: ${situation}

${contextFilters ? `Context: ${JSON.stringify(contextFilters)}` : ''}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ''}

Provide automation recommendations as strict JSON matching the specified schema.`;

    const startTime = Date.now();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const t = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, t);
      throw new Error('AI gateway error');
    }

    const aiData = await aiResp.json();
    const analysisTime = Date.now() - startTime;

    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Unexpected AI response structure:', JSON.stringify(aiData));
      throw new Error('Invalid response from AI gateway');
    }

    console.log('AI response (raw):', content);
    const analysisResult = JSON.parse(content);

    // Store analysis in database
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('ai_situation_analyses')
      .insert({
        situation_description: situation,
        created_by: user.id,
        context_filters: contextFilters || null,
        constraints: constraints || null,
        analysis_result: analysisResult,
        suggested_triggers: analysisResult.suggestedTriggers || [],
        suggested_conditions: analysisResult.suggestedConditions || null,
        suggested_actions: analysisResult.suggestedActions || null,
        analysis_duration_ms: analysisTime,
        status: 'completed'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: savedAnalysis,
        analysisTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-situation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
