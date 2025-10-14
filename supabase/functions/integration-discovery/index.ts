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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    console.log('[discovery] Starting integration discovery...');

    // Define known integrations with correct enum values
    const integrations = [
      {
        name: 'Gemini Live (Vertex AI)',
        base_url: 'wss://us-central1-aiplatform.googleapis.com',
        integration_type: 'ai_multimodal',
        auth_type: 'oauth2',
        is_active: true,
        metadata: { 
          deployment_type: 'edge_function',
          edge_function: 'vertex-live',
          provider: 'google',
          capabilities: ['realtime', 'multimodal', 'voice']
        }
      },
      {
        name: 'Lovable AI Chat',
        base_url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
        integration_type: 'ai_multimodal',
        auth_type: 'api_key',
        is_active: true,
        metadata: { 
          deployment_type: 'edge_function',
          edge_function: 'ai-chat',
          provider: 'lovable',
          capabilities: ['chat', 'streaming', 'memory']
        }
      },
      {
        name: 'Google Speech-to-Text',
        base_url: 'https://speech.googleapis.com/v1/speech:recognize',
        integration_type: 'ai_stt',
        auth_type: 'api_key',
        is_active: false,
        metadata: { 
          deployment_type: 'external_api',
          provider: 'google',
          capabilities: ['audio_transcription']
        }
      },
      {
        name: 'Stripe Payments',
        base_url: 'https://api.stripe.com/v1',
        integration_type: 'payment',
        auth_type: 'api_key',
        is_active: true,
        metadata: { 
          deployment_type: 'external_api',
          provider: 'stripe',
          capabilities: ['payments', 'checkout', 'webhooks'],
          edge_functions: ['stripe-create-checkout-session', 'stripe-create-booking-checkout', 'stripe-webhook']
        }
      },
      {
        name: 'Google Cloud Text-to-Speech',
        base_url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
        integration_type: 'ai_tts',
        auth_type: 'api_key',
        is_active: true,
        metadata: { 
          deployment_type: 'edge_function',
          edge_function: 'google-cloud-tts',
          provider: 'google',
          capabilities: ['tts', 'multilingual']
        }
      }
    ];

    console.log(`[discovery] Found ${integrations.length} integrations to register`);

    // Upsert integrations
    for (const integration of integrations) {
      const { data: existing } = await supabaseClient
        .from('api_integrations')
        .select('id')
        .eq('name', integration.name)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabaseClient
          .from('api_integrations')
          .update(integration)
          .eq('id', existing.id);

        if (error) {
          console.error(`[discovery] Update failed for ${integration.name}:`, error);
        } else {
          console.log(`[discovery] ✓ Updated: ${integration.name}`);
        }
      } else {
        // Insert new
        const { error } = await supabaseClient
          .from('api_integrations')
          .insert(integration);

        if (error) {
          console.error(`[discovery] Insert failed for ${integration.name}:`, error);
        } else {
          console.log(`[discovery] ✓ Created: ${integration.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: integrations.length,
        integrations: integrations.map(i => i.name)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[discovery] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
