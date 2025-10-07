import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { postId } = await req.json();
    console.log('Distributing post:', postId);

    // Get post details
    const { data: post, error: postError } = await supabaseClient
      .from('distribution_posts')
      .select('*, campaign:campaigns(*)')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    if (post.campaign) {
      console.log('Part of campaign:', post.campaign.name);
    }

    // Get connected channels for this user
    const { data: channels, error: channelsError } = await supabaseClient
      .from('distribution_channels')
      .select('*')
      .eq('user_id', post.user_id)
      .eq('is_connected', true)
      .eq('is_active', true);

    if (channelsError) throw channelsError;

    const results = [];
    
    // Simulate distribution to each channel
    for (const channel of channels || []) {
      console.log(`Distributing to ${channel.channel_name} (${channel.channel_type})`);
      
      // Mock distribution - in real implementation, call actual APIs
      const success = Math.random() > 0.1; // 90% success rate
      
      results.push({
        channel: channel.channel_type,
        success,
        timestamp: new Date().toISOString(),
      });

      // Update analytics
      await supabaseClient
        .from('post_analytics')
        .upsert({
          post_id: postId,
          user_id: post.user_id,
          channel_type: channel.channel_type,
          sent_count: 1,
          delivered_count: success ? 1 : 0,
          failed_count: success ? 0 : 1,
          metadata: {
            campaign_id: post.campaign_id,
            campaign_name: post.campaign?.name,
            distributed_at: new Date().toISOString(),
          }
        }, {
          onConflict: 'post_id,channel_type',
        });
    }

    // Update post status
    await supabaseClient
      .from('distribution_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        blast_count: post.blast_count + 1,
      })
      .eq('id', postId);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Post distributed to ${results.length} channels`,
        campaign: post.campaign ? {
          id: post.campaign.id,
          name: post.campaign.name,
        } : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error distributing post:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
