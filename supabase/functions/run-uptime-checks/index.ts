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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[uptime] Starting uptime checks...');

    // Get all active integrations
    const { data: integrations, error: fetchError } = await supabaseClient
      .from('api_integrations')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[uptime] Found ${integrations?.length || 0} active integrations`);

    const results = [];

    // Test each integration
    for (const integration of integrations || []) {
      console.log(`[uptime] Testing: ${integration.name}`);
      
      try {
        const testResponse = await supabaseClient.functions.invoke('test-api-integration', {
          body: { integrationId: integration.id }
        });

        results.push({
          integration: integration.name,
          success: !testResponse.error,
          error: testResponse.error?.message
        });
      } catch (error) {
        console.error(`[uptime] Test failed for ${integration.name}:`, error);
        results.push({
          integration: integration.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[uptime] Complete: ${successCount}/${results.length} passed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        tested: results.length,
        passed: successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[uptime] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
