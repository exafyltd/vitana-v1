import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      throw new Error('Tenant ID is required');
    }

    console.log(`User ${user.id} setting active tenant to ${tenant_id}`);

    // Verify user has valid membership in the tenant
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, status')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership) {
      throw new Error('User is not a member of this tenant');
    }

    if (membership.status !== 'active') {
      throw new Error('User membership is not active');
    }

    // Update user's app_metadata with active_tenant_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          active_tenant_id: tenant_id
        }
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      throw updateError;
    }

    console.log(`Successfully set active tenant ${tenant_id} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        tenant_id: tenant_id,
        message: 'active tenant updated'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in set_active_tenant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});