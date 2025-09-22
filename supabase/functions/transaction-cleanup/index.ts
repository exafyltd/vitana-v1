import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting transaction cleanup...');

    // Call the cleanup function
    const { data, error } = await supabaseClient.rpc('cleanup_abandoned_transactions');

    if (error) {
      console.error('Cleanup error:', error);
      throw error;
    }

    // Log cleanup results
    const { data: cleanedTransactions } = await supabaseClient
      .from('wallet_transactions')
      .select('id, created_at, status')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false });

    console.log(`✅ Cleanup completed. Found ${cleanedTransactions?.length || 0} recently failed transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction cleanup completed',
        cleanedCount: cleanedTransactions?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Transaction cleanup failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});