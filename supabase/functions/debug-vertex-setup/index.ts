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

    console.log('🔍 Starting comprehensive Vertex Live debug check...');

    const debugResults = {
      environment_check: {
        supabase_url_configured: !!supabaseUrl,
        service_key_configured: !!supabaseServiceKey,
        google_cloud_sa_configured: !!Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON'),
      },
      vertex_auth_test: {
        success: false,
        has_access_token: false,
        error: null as string | null,
        response_data: null as any
      },
      vertex_live_endpoint_test: {
        reachable: false,
        status_code: null as number | null,
        error: null as string | null
      },
      database_integration_check: {
        exists: false,
        is_active: false,
        last_test_status: null as string | null
      }
    };

    // Test 1: Check environment variables
    console.log('📋 Environment check:', debugResults.environment_check);

    // Test 2: Check vertex-auth function
    console.log('🔐 Testing vertex-auth function...');
    try {
      const authResponse = await supabase.functions.invoke('vertex-auth');
      debugResults.vertex_auth_test.response_data = authResponse.data;
      
      if (authResponse.error) {
        debugResults.vertex_auth_test.error = JSON.stringify(authResponse.error);
        console.error('❌ vertex-auth error:', authResponse.error);
      } else if (authResponse.data?.access_token) {
        debugResults.vertex_auth_test.success = true;
        debugResults.vertex_auth_test.has_access_token = true;
        console.log('✅ vertex-auth working - token received');
      } else {
        debugResults.vertex_auth_test.error = 'No access_token in response';
        console.error('❌ No access_token:', authResponse.data);
      }
    } catch (error) {
      debugResults.vertex_auth_test.error = error.message;
      console.error('❌ vertex-auth exception:', error);
    }

    // Test 3: Check vertex-live WebSocket endpoint
    console.log('🌐 Testing vertex-live endpoint...');
    try {
      const wsHost = new URL(supabaseUrl).hostname.replace('.supabase.co', '.functions.supabase.co');
      const response = await fetch(`https://${wsHost}/vertex-live`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      debugResults.vertex_live_endpoint_test.reachable = true;
      debugResults.vertex_live_endpoint_test.status_code = response.status;
      console.log(`✅ vertex-live endpoint reachable (status: ${response.status})`);
    } catch (error) {
      debugResults.vertex_live_endpoint_test.error = error.message;
      console.error('❌ vertex-live endpoint error:', error);
    }

    // Test 4: Check database integration record
    console.log('💾 Checking database integration...');
    try {
      const { data: integration, error } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('name', 'Vertex AI Live (Multimodal)')
        .single();

      if (error) {
        debugResults.database_integration_check.exists = false;
        console.error('❌ Integration not found in database:', error);
      } else {
        debugResults.database_integration_check.exists = true;
        debugResults.database_integration_check.is_active = integration.is_active;
        debugResults.database_integration_check.last_test_status = integration.last_test_status;
        console.log('✅ Integration found:', {
          id: integration.id,
          is_active: integration.is_active,
          last_test_status: integration.last_test_status
        });
      }
    } catch (error) {
      console.error('❌ Database check error:', error);
    }

    // Overall status
    const allPassed = 
      debugResults.environment_check.google_cloud_sa_configured &&
      debugResults.vertex_auth_test.success &&
      debugResults.vertex_live_endpoint_test.reachable &&
      debugResults.database_integration_check.exists;

    console.log('📊 Overall Status:', allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED');

    return new Response(
      JSON.stringify({
        success: allPassed,
        debug_results: debugResults,
        recommendations: !debugResults.environment_check.google_cloud_sa_configured 
          ? ['Configure GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON secret in Supabase']
          : []
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Debug script error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
