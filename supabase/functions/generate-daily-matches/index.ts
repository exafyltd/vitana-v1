import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate JWT using anon client with user's token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !authUser) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const user = { id: authUser.id };

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating daily matches for user ${user.id}`);

    // Get current user's interests and profile
    const { data: userInterests } = await supabase
      .from('user_wellness_interests')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: userProfile } = await supabase
      .rpc('get_user_profile_by_identifier', { identifier: user.id });

    // Get potential matches (other active users, excluding self)
    const { data: candidates } = await supabase
      .from('profiles')
      .select('user_id, display_name, full_name, avatar_url, bio, location')
      .neq('user_id', user.id)
      .limit(50);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No candidates found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate match scores
    const matches = candidates.map((candidate) => {
      let score = 0;
      const reasons = [];

      // Random base score (60-90) for demo purposes
      score = Math.floor(Math.random() * 30) + 60;

      // Add some demo match reasons
      const possibleReasons = [
        'Shared wellness interests',
        'Similar daily routines',
        'Compatible fitness goals',
        'Matching activity times',
        'Nearby location',
        'Similar wellness journey stage'
      ];
      
      const numReasons = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numReasons; i++) {
        const randomReason = possibleReasons[Math.floor(Math.random() * possibleReasons.length)];
        if (!reasons.includes(randomReason)) {
          reasons.push(randomReason);
        }
      }

      return {
        user_id: user.id,
        matched_user_id: candidate.user_id,
        match_score: score,
        match_reasons: reasons,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    // Sort by score and take top 10
    matches.sort((a, b) => b.match_score - a.match_score);
    const topMatches = matches.slice(0, 10);

    // Delete old matches
    await supabase
      .from('daily_matches')
      .delete()
      .eq('user_id', user.id);

    // Insert new matches
    const { error: insertError } = await supabase
      .from('daily_matches')
      .insert(topMatches);

    if (insertError) {
      console.error('Error inserting matches:', insertError);
      throw insertError;
    }

    console.log(`Generated ${topMatches.length} matches for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        matches_generated: topMatches.length,
        message: `Generated ${topMatches.length} daily matches`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating matches:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
