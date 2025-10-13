/**
 * TEMPLATE: Custom API Test Runner
 * 
 * This is a template edge function for creating custom API integration tests.
 * Copy this file and modify it for your specific API testing needs.
 * 
 * SETUP:
 * 1. Copy this folder and rename it (e.g., 'test-shopify-api')
 * 2. Update the integration_id below
 * 3. Customize the test logic in runTests()
 * 4. Add any required secrets to Supabase Vault
 * 5. Update the api_integrations table with test_runner_function = 'your-function-name'
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Get integration details from request
    const { integration_id } = await req.json();

    console.log('Running custom API test for integration:', integration_id);

    // Fetch integration details
    const { data: integration, error: fetchError } = await supabase
      .from('api_integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (fetchError || !integration) {
      throw new Error(`Integration not found: ${integration_id}`);
    }

    console.log('Testing integration:', integration.name);

    // Run the actual API tests
    const testResults = await runTests(integration);

    // Log test results
    const { error: logError } = await supabase
      .from('api_test_logs')
      .insert({
        integration_id,
        status: testResults.success ? 'success' : 'fail',
        response_time_ms: testResults.responseTime,
        response_body: testResults.details,
        error_log: testResults.error,
        test_type: 'automated',
        metadata: {
          test_runner: 'custom',
          endpoints_tested: testResults.endpointsTested
        }
      });

    if (logError) {
      console.error('Error logging test results:', logError);
    }

    // Update integration status
    await supabase
      .from('api_integrations')
      .update({
        last_test_status: testResults.success ? 'success' : 'fail',
        last_test_timestamp: new Date().toISOString()
      })
      .eq('id', integration_id);

    return new Response(
      JSON.stringify({ 
        success: testResults.success,
        message: testResults.message,
        details: testResults.details
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: testResults.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('Error in custom test runner:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * CUSTOMIZE THIS FUNCTION
 * 
 * This is where you implement your specific API testing logic.
 * Modify this to match your API's requirements.
 */
async function runTests(integration: any) {
  const startTime = Date.now();
  const testResults = {
    success: true,
    message: '',
    error: null as string | null,
    responseTime: 0,
    endpointsTested: [] as string[],
    details: {} as any
  };

  try {
    // EXAMPLE: Test endpoint configuration from integration.test_endpoints
    const endpoints = integration.test_endpoints || [];
    
    for (const endpoint of endpoints) {
      console.log(`Testing endpoint: ${endpoint.path}`);
      
      const url = `${integration.base_url}${endpoint.path}`;
      testResults.endpointsTested.push(url);

      // Build headers
      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Add authentication based on auth_type
      if (integration.auth_type === 'bearer' && integration.auth_token) {
        headers['Authorization'] = `Bearer ${integration.auth_token}`;
      } else if (integration.auth_type === 'api_key' && integration.auth_token) {
        // Customize header name based on your API
        headers['X-API-Key'] = integration.auth_token;
      }

      // Make the API call
      const response = await fetch(url, {
        method: endpoint.method || 'GET',
        headers,
        ...(endpoint.body && { body: JSON.stringify(endpoint.body) })
      });

      const responseData = await response.json();

      // Check if response is successful
      if (!response.ok) {
        testResults.success = false;
        testResults.error = `Endpoint ${url} returned ${response.status}`;
        testResults.details[endpoint.path] = {
          status: response.status,
          error: responseData
        };
      } else {
        testResults.details[endpoint.path] = {
          status: response.status,
          data: responseData
        };
      }
    }

    testResults.responseTime = Date.now() - startTime;
    testResults.message = testResults.success 
      ? `All ${endpoints.length} endpoint(s) tested successfully`
      : 'Some endpoints failed';

  } catch (error) {
    testResults.success = false;
    testResults.error = error.message;
    testResults.message = 'Test execution failed';
    testResults.responseTime = Date.now() - startTime;
  }

  return testResults;
}
