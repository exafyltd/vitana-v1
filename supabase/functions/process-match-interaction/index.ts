import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchInteractionRequest {
  target_id: string;
  target_type: 'user' | 'group' | 'event' | 'coach';
  interaction_type: 'like' | 'pass' | 'block' | 'report';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { target_id, target_type, interaction_type, metadata = {} } = await req.json() as MatchInteractionRequest;
    
    console.log('Processing match interaction:', { target_id, target_type, interaction_type });

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate inputs
    if (!target_id || !target_type || !interaction_type) {
      throw new Error('Missing required fields: target_id, target_type, interaction_type');
    }

    // Check if interaction already exists
    const { data: existing } = await supabaseClient
      .from('user_match_interactions')
      .select('id, interaction_type')
      .eq('user_id', user.id)
      .eq('target_id', target_id)
      .eq('target_type', target_type)
      .single();

    let result;

    if (existing) {
      // Update existing interaction
      const { data, error } = await supabaseClient
        .from('user_match_interactions')
        .update({ 
          interaction_type, 
          metadata,
          created_at: new Date().toISOString() // Update timestamp
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Updated existing interaction');
    } else {
      // Create new interaction
      const { data, error } = await supabaseClient
        .from('user_match_interactions')
        .insert({
          user_id: user.id,
          target_id,
          target_type,
          interaction_type,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Created new interaction');
    }

    // Check if this created a two-way match (for 'like' interactions on users)
    let matchCreated = false;
    if (interaction_type === 'like' && target_type === 'user') {
      const user1 = user.id < target_id ? user.id : target_id;
      const user2 = user.id < target_id ? target_id : user.id;

      const { data: match } = await supabaseClient
        .from('user_matches')
        .select('id')
        .eq('user_id_1', user1)
        .eq('user_id_2', user2)
        .single();

      matchCreated = !!match;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        interaction: result,
        match_created: matchCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-match-interaction:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
