import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create supabase client with service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    if (!supabaseServiceKey || !supabaseUrl) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the requesting user is an exafy_admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const isExafyAdmin = user.app_metadata?.exafy_admin === true
    if (!isExafyAdmin) {
      throw new Error('Access denied: Exafy admin required')
    }

    // Get the user_id from request body
    const { user_id } = await req.json()
    
    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Prevent self-removal
    if (user_id === user.id) {
      throw new Error('Cannot remove your own admin privileges')
    }

    // Get the user to remove
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(user_id)
    
    if (getUserError) {
      throw new Error('User not found')
    }

    // Remove exafy_admin from app_metadata
    const updatedMetadata = { ...targetUser.user.app_metadata }
    delete updatedMetadata.exafy_admin
    delete updatedMetadata.active_tenant_id

    const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
      app_metadata: updatedMetadata
    })

    if (updateError) {
      throw updateError
    }

    // Log the admin removal for audit purposes
    await supabase.from('audit_events').insert({
      user_id: user.id,
      event_type: 'admin_privilege_removed',
      event_data: {
        removed_user_id: user_id,
        removed_user_email: targetUser.user.email,
        timestamp: new Date().toISOString()
      }
    })

    console.log(`Removed admin privileges from ${targetUser.user.email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin privileges removed from ${targetUser.user.email}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})