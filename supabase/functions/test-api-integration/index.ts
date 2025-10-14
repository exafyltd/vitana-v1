import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get integration details
    const { data: integration, error: fetchError } = await supabaseClient
      .from('api_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      throw new Error('Integration not found');
    }

    console.log(`[test] Testing: ${integration.name}`);
    const startTime = Date.now();
    let testResult = { status: 'failed', error_log: 'Not implemented', response_body: null };

    try {
      // Route to appropriate test based on integration_type and metadata
      const integrationType = integration.integration_type;
      const provider = integration.metadata?.provider;
      
      switch (integrationType) {
        case 'payment':
          testResult = await testStripeIntegration();
          break;
        case 'ai_multimodal':
          if (provider === 'google') {
            testResult = await testVertexLiveIntegration();
          } else if (provider === 'lovable') {
            testResult = await testLovableAIIntegration();
          } else {
            testResult = { status: 'skipped', error_log: `Unknown AI provider: ${provider}`, response_body: null };
          }
          break;
        case 'ai_stt':
          testResult = await testGoogleSpeechIntegration();
          break;
        case 'ai_tts':
          testResult = await testGoogleTTSIntegration();
          break;
        default:
          testResult = { status: 'skipped', error_log: 'No test implementation', response_body: null };
      }
    } catch (error) {
      testResult = { status: 'failed', error_log: error.message, response_body: null };
    }

    const responseTime = Date.now() - startTime;

    // Log test result
    await supabaseClient.from('api_test_logs').insert({
      integration_id: integrationId,
      status: testResult.status,
      response_time_ms: responseTime,
      error_log: testResult.error_log,
      response_body: testResult.response_body,
      test_type: 'automated'
    });

    // Update integration status
    await supabaseClient.from('api_integrations').update({
      last_test_status: testResult.status,
      last_test_timestamp: new Date().toISOString(),
      avg_response_time: responseTime
    }).eq('id', integrationId);

    // Insert performance metric
    await supabaseClient.from('api_performance_metrics').insert({
      integration_id: integrationId,
      response_time: responseTime,
      status_code: testResult.status === 'success' ? 200 : 500,
      error_count: testResult.status === 'success' ? 0 : 1,
      request_count: 1
    });

    return new Response(
      JSON.stringify({ 
        success: testResult.status === 'success',
        integration: integration.name,
        responseTime,
        ...testResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function testStripeIntegration() {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return { status: 'failed', error_log: 'STRIPE_SECRET_KEY not configured', response_body: null };
  }

  const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
    headers: { 'Authorization': `Bearer ${stripeKey}` }
  });

  if (response.ok) {
    const data = await response.json();
    return { status: 'success', error_log: null, response_body: { count: data.data?.length || 0 } };
  } else {
    const errorText = await response.text();
    return { status: 'failed', error_log: `Stripe API error: ${response.status}`, response_body: { error: errorText } };
  }
}

async function testVertexLiveIntegration() {
  const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    return { status: 'failed', error_log: 'GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON not configured', response_body: null };
  }

  // Simple validation: check if we can parse the service account
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      throw new Error('Invalid service account format');
    }
    return { status: 'success', error_log: null, response_body: { project_id: serviceAccount.project_id } };
  } catch (error) {
    return { status: 'failed', error_log: error.message, response_body: null };
  }
}

async function testLovableAIIntegration() {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    return { status: 'failed', error_log: 'LOVABLE_API_KEY not configured', response_body: null };
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5
    })
  });

  if (response.ok) {
    return { status: 'success', error_log: null, response_body: { healthy: true } };
  } else {
    const errorText = await response.text();
    return { status: 'failed', error_log: `Lovable AI error: ${response.status}`, response_body: { error: errorText } };
  }
}

async function testGoogleSpeechIntegration() {
  const googleKey = Deno.env.get('GOOGLE_API_KEY');
  if (!googleKey) {
    return { status: 'failed', error_log: 'GOOGLE_API_KEY not configured', response_body: null };
  }

  return { status: 'success', error_log: null, response_body: { configured: true } };
}

async function testGoogleTTSIntegration() {
  const googleKey = Deno.env.get('GOOGLE_API_KEY');
  if (!googleKey) {
    return { status: 'failed', error_log: 'GOOGLE_API_KEY not configured', response_body: null };
  }

  const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${googleKey}`);
  
  if (response.ok) {
    const data = await response.json();
    return { status: 'success', error_log: null, response_body: { voices_count: data.voices?.length || 0 } };
  } else {
    const errorText = await response.text();
    return { status: 'failed', error_log: `Google TTS error: ${response.status}`, response_body: { error: errorText } };
  }
}
