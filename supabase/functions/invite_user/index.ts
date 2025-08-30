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

    const { tenant_id, email, role = 'community' } = await req.json();

    if (!tenant_id || !email) {
      throw new Error('Tenant ID and email are required');
    }

    console.log(`User ${user.id} inviting ${email} to tenant ${tenant_id} with role ${role}`);

    // Verify user has admin permissions in the tenant
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership || !['admin', 'staff'].includes(membership.role)) {
      throw new Error('Insufficient permissions to invite users');
    }

    // Generate invite token (base64 encoded tenant_id:email:role:timestamp)
    const inviteData = {
      tenant_id,
      email,
      role,
      timestamp: Date.now()
    };
    
    const inviteToken = btoa(JSON.stringify(inviteData));

    // TODO: In production, you'd want to:
    // 1. Store invite tokens in a table with expiry
    // 2. Send email with invite link
    // For now, we'll just return the token

    console.log(`Generated invite token for ${email} to join tenant ${tenant_id}`);

    return new Response(
      JSON.stringify({
        invite_token: inviteToken
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in invite_user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});