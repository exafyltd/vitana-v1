import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get admin emails from environment
    const adminEmails = Deno.env.get('EXAFY_SUPERADMIN_EMAILS') || 'dstevanovic@hotmail.com';
    const emailList = adminEmails.split(',').map(email => email.trim());

    const results = [];

    for (const email of emailList) {
      console.log(`Checking admin privileges for: ${email}`);

      // Find user by email
      const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (userError) {
        console.error('Error listing users:', userError);
        continue;
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        console.log(`User not found: ${email}`);
        results.push({ email, status: 'user_not_found' });
        continue;
      }

      // Check if already admin
      const isAlreadyAdmin = user.app_metadata?.exafy_admin === true;
      if (isAlreadyAdmin) {
        console.log(`User ${email} is already an Exafy admin`);
        results.push({ email, status: 'already_admin', user_id: user.id });
        continue;
      }

      // Elevate to admin
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        user.id,
        {
          app_metadata: {
            ...user.app_metadata,
            exafy_admin: true
          }
        }
      );

      if (updateError) {
        console.error(`Error elevating user ${email}:`, updateError);
        results.push({ email, status: 'elevation_failed', error: updateError.message });
        continue;
      }

      // Set default active tenant to Maxina
      const { data: maxinaTenant } = await supabaseClient
        .from('tenants')
        .select('id')
        .eq('slug', 'maxina')
        .single();

      if (maxinaTenant) {
        await supabaseClient.auth.admin.updateUserById(
          user.id,
          {
            app_metadata: {
              ...user.app_metadata,
              exafy_admin: true,
              active_tenant_id: maxinaTenant.id
            }
          }
        );
      }

      console.log(`Successfully elevated ${email} to Exafy admin`);
      results.push({ email, status: 'elevated', user_id: user.id });

      // Log audit event
      await supabaseClient
        .from('audit_events')
        .insert({
          user_id: user.id,
          event_type: 'admin_elevated',
          event_data: {
            email: email,
            elevated_by: 'bootstrap_system'
          }
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed_emails: emailList,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bootstrap_admin function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});