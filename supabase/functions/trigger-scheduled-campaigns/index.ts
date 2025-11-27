import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for scheduled campaigns to trigger...');

    // Find campaigns that are scheduled and should start now
    const { data: scheduledCampaigns, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('start_date', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${scheduledCampaigns?.length || 0} campaigns to trigger`);

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scheduled campaigns to trigger',
          triggered: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`Triggering campaign: ${campaign.name} (${campaign.id})`);

        // Get campaign recipients and channels from metadata
        const channels = campaign.target_channels || ['email'];
        const distributionConfig = campaign.distribution_config || {};

        // Queue recipients for this campaign
        const { data: queueData, error: queueError } = await supabaseClient.functions.invoke(
          'queue-campaign-recipients',
          {
            body: {
              campaignId: campaign.id,
              channels,
              audienceData: distributionConfig.audienceData || { vitanaContacts: true },
              messageContent: distributionConfig.messageContent || { 
                subject: campaign.name,
                body: campaign.description || 'Campaign message'
              },
            },
          }
        );

        if (queueError) {
          throw queueError;
        }

        // Update campaign status to active
        const { error: updateError } = await supabaseClient
          .from('campaigns')
          .update({ 
            status: 'active',
            metadata: {
              ...campaign.metadata,
              distribution_started_at: new Date().toISOString(),
            }
          })
          .eq('id', campaign.id);

        if (updateError) {
          throw updateError;
        }

        // Trigger processing for each channel
        for (const channel of channels) {
          await supabaseClient.functions.invoke('process-campaign-queue', {
            body: { channel },
          });
        }

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: true,
          recipientsQueued: queueData?.totalRecipients || 0,
        });

        console.log(`Successfully triggered campaign: ${campaign.name}`);
      } catch (error) {
        console.error(`Error triggering campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        triggered: successCount,
        failed: results.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in trigger-scheduled-campaigns:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
