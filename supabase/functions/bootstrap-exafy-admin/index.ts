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

    // Use the existing database function which has the right permissions
    const { error: bootstrapError } = await supabaseAdmin.rpc('bootstrap_admin_user', {
      user_id: userId,
      user_email: email
    })

    if (bootstrapError) {
      console.error('Error calling bootstrap function:', bootstrapError)
      return new Response(
        JSON.stringify({ error: 'Failed to bootstrap admin user', details: bootstrapError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the tenants for response
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .in('name', ['Maxina', 'Alkalma', 'Earthlings'])

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      // Don't fail the process, just return without tenant info
    }

    console.log(`Successfully bootstrapped admin user: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user bootstrapped successfully',
        tenants: tenants?.map(t => t.name) || ['Maxina', 'Alkalma', 'Earthlings'],
        activeTenant: 'Maxina'
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