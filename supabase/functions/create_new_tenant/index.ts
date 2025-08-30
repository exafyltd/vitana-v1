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

    const { name, isBootstrap } = await req.json();

    let user;
    
    if (isBootstrap) {
      // For bootstrap, create admin without authentication
      console.log('Bootstrap mode: creating admin user and tenant');
      user = { id: 'bootstrap-admin', email: 'admin@example.com' };
    } else {
      // Regular flow: verify authentication
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !authUser) {
        throw new Error('Invalid authentication');
      }
      
      user = authUser;
    }

    const { name } = await req.json();

    if (!name) {
      throw new Error('Tenant name is required');
    }

    console.log(`Creating new tenant "${name}" for user ${user.id}`);

    // Create new tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{ name }])
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      throw tenantError;
    }

    // Create membership for the creator as admin
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert([{
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'admin',
        status: 'active'
      }]);

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      throw membershipError;
    }

    // Update user's app_metadata with active_tenant_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          active_tenant_id: tenant.id
        }
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      throw updateError;
    }

    console.log(`Successfully created tenant ${tenant.id} with admin user ${user.id}`);

    return new Response(
      JSON.stringify({
        tenant_id: tenant.id,
        tenant_name: tenant.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in create_new_tenant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});