import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting API integration test runner...');

    // Get integrations due for testing
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
    
    const { data: integrations, error: fetchError } = await supabase
      .from('api_integrations')
      .select('*')
      .eq('is_active', true)
      .or(`last_test_timestamp.is.null,last_test_timestamp.lt.${cutoffTime.toISOString()}`);

    if (fetchError) {
      console.error('❌ Error fetching integrations:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Found ${integrations?.length || 0} integrations to test`);

    const results = [];

    for (const integration of integrations || []) {
      console.log(`🧪 Testing: ${integration.name}`);

      // Check if custom test runner exists
      if (integration.test_runner_function) {
        console.log(`🔧 Using custom test runner: ${integration.test_runner_function}`);
        
        try {
          const { data: customResult, error: customError } = await supabase.functions.invoke(
            integration.test_runner_function,
            { body: { integration_id: integration.id } }
          );

          if (customError) throw customError;
          
          results.push({
            integration_id: integration.id,
            name: integration.name,
            status: customResult.status,
            custom_runner: true
          });

          // Update integration status
          await supabase
            .from('api_integrations')
            .update({
              last_test_status: customResult.status,
              last_test_timestamp: now.toISOString()
            })
            .eq('id', integration.id);

        } catch (error) {
          console.error(`❌ Custom runner failed for ${integration.name}:`, error);
          await logTestResult(supabase, integration.id, 'fail', null, error.message);
          
          await supabase
            .from('api_integrations')
            .update({
              last_test_status: 'fail',
              last_test_timestamp: now.toISOString()
            })
            .eq('id', integration.id);
        }
        continue;
      }

      // Standard HTTP endpoint testing
      const testEndpoints = integration.test_endpoints || [];
      
      if (testEndpoints.length === 0) {
        console.log(`⚠️ No test endpoints configured for ${integration.name}`);
        continue;
      }

      let allTestsPassed = true;
      
      for (const endpoint of testEndpoints) {
        const startTime = Date.now();
        
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          // Add authentication
          if (integration.auth_type === 'api_key' && integration.auth_token) {
            headers['Authorization'] = `Bearer ${integration.auth_token}`;
          }

          const response = await fetch(
            `${integration.base_url}${endpoint.url}`,
            {
              method: endpoint.method || 'GET',
              headers,
              body: endpoint.payload ? JSON.stringify(endpoint.payload) : undefined,
              signal: AbortSignal.timeout(10000) // 10s timeout
            }
          );

          const responseTime = Date.now() - startTime;
          const responseBody = await response.json().catch(() => ({}));

          const status = response.ok ? 'success' : 'fail';
          if (status === 'fail') allTestsPassed = false;

          await logTestResult(
            supabase,
            integration.id,
            status,
            responseTime,
            response.ok ? null : `HTTP ${response.status}`,
            responseBody
          );

          results.push({
            integration_id: integration.id,
            name: integration.name,
            endpoint: endpoint.url,
            status,
            response_time_ms: responseTime
          });

        } catch (error) {
          console.error(`❌ Test failed for ${integration.name} ${endpoint.url}:`, error);
          const responseTime = Date.now() - startTime;
          allTestsPassed = false;
          
          await logTestResult(
            supabase,
            integration.id,
            'timeout',
            responseTime,
            error.message
          );

          results.push({
            integration_id: integration.id,
            name: integration.name,
            endpoint: endpoint.url,
            status: 'timeout',
            error: error.message
          });
        }
      }

      // Update integration last test status
      const overallStatus = allTestsPassed ? 'success' : 'fail';

      await supabase
        .from('api_integrations')
        .update({
          last_test_status: overallStatus,
          last_test_timestamp: now.toISOString()
        })
        .eq('id', integration.id);
    }

    console.log(`✅ Test runner completed. Tested ${results.length} endpoints.`);

    return new Response(
      JSON.stringify({ success: true, tested: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Test runner error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logTestResult(
  supabase: any,
  integrationId: string,
  status: string,
  responseTimeMs: number | null,
  errorLog: string | null,
  responseBody?: any
) {
  await supabase.from('api_test_logs').insert({
    integration_id: integrationId,
    status,
    response_time_ms: responseTimeMs,
    error_log: errorLog,
    response_body: responseBody,
    test_type: 'automated'
  });
}
