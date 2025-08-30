import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    )

    const { userId, email } = await req.json()
    
    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Bootstrapping admin user: ${email} (${userId})`)

    // Update user's app_metadata to make them exafy_admin
    const { error: userUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: { 
          role: 'exafy_admin'
        }
      }
    )

    if (userUpdateError) {
      console.error('Error updating user metadata:', userUpdateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user metadata', details: userUpdateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .in('name', ['Maxina', 'Alkalma', 'Earthlings'])

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tenants', details: tenantsError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create memberships for all three workspaces as admin
    const membershipsToInsert = tenants.map(tenant => ({
      user_id: userId,
      tenant_id: tenant.id,
      role: 'admin',
      status: 'active'
    }))

    const { error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .upsert(membershipsToInsert, { 
        onConflict: 'user_id,tenant_id',
        ignoreDuplicates: false 
      })

    if (membershipsError) {
      console.error('Error creating memberships:', membershipsError)
      return new Response(
        JSON.stringify({ error: 'Failed to create memberships', details: membershipsError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set Maxina as the active tenant
    const maxinaTenant = tenants.find(t => t.name === 'Maxina')
    if (maxinaTenant) {
      const { error: activeTenantError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: { 
            role: 'exafy_admin',
            active_tenant_id: maxinaTenant.id
          }
        }
      )

      if (activeTenantError) {
        console.error('Error setting active tenant:', activeTenantError)
        // Don't fail the entire process for this
      }
    }

    console.log(`Successfully bootstrapped admin user: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user bootstrapped successfully',
        tenants: tenants.map(t => t.name),
        activeTenant: maxinaTenant?.name || 'Maxina'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Bootstrap function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})