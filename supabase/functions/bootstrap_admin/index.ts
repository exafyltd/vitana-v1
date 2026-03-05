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

    // SECURITY: Verify the caller is already an exafy_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser(callerToken);
    
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (caller.app_metadata?.exafy_admin !== true) {
      console.error(`Forbidden: User ${caller.email} attempted admin bootstrap without privileges`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Exafy admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin emails from request body
    const { emails } = await req.json();
    let emailList: string[] = [];
    
    if (emails && Array.isArray(emails) && emails.length > 0) {
      emailList = emails.map((email: string) => email.trim()).filter(Boolean);
    } else {
      return new Response(
        JSON.stringify({ error: 'emails array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const email of emailList) {
      console.log(`[bootstrap_admin] Caller ${caller.email} elevating: ${email}`);

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
        results.push({ email, status: 'user_not_found' });
        continue;
      }

      const isAlreadyAdmin = user.app_metadata?.exafy_admin === true;
      if (isAlreadyAdmin) {
        results.push({ email, status: 'already_admin', user_id: user.id });
        continue;
      }

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

      console.log(`Successfully elevated ${email} to Exafy admin by ${caller.email}`);
      results.push({ email, status: 'elevated', user_id: user.id });

      // Log audit event with caller identity
      await supabaseClient
        .from('audit_events')
        .insert({
          user_id: user.id,
          event_type: 'admin_elevated',
          event_data: {
            email: email,
            elevated_by: caller.email,
            elevated_by_id: caller.id
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
