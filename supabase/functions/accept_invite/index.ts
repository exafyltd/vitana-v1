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

    const { invite_token } = await req.json();

    if (!invite_token) {
      throw new Error('Invite token is required');
    }

    console.log(`User ${user.id} accepting invite with token ${invite_token.substring(0, 10)}...`);

    // Decode and validate invite token
    let inviteData;
    try {
      inviteData = JSON.parse(atob(invite_token));
    } catch {
      throw new Error('Invalid invite token format');
    }

    const { tenant_id, email, role, timestamp } = inviteData;

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (tokenAge > maxAge) {
      throw new Error('Invite token has expired');
    }

    // Verify email matches current user
    if (email !== user.email) {
      throw new Error('Invite token email does not match current user');
    }

    // Check if user already has membership in this tenant
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (existingMembership) {
      throw new Error('User is already a member of this tenant');
    }

    // Create membership
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert([{
        user_id: user.id,
        tenant_id: tenant_id,
        role: role,
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
          active_tenant_id: tenant_id
        }
      }
    );

    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      throw updateError;
    }

    console.log(`Successfully accepted invite: user ${user.id} joined tenant ${tenant_id} with role ${role}`);

    return new Response(
      JSON.stringify({
        tenant_id: tenant_id,
        role: role
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in accept_invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});