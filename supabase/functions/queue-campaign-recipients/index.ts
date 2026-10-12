import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createDataClient } from "../_shared/data-client.ts";
import { isServiceRoleCaller, unauthorizedResponse } from "../_shared/caller-auth.ts";
import {
  CampaignAudienceError,
  hasMemberAudience,
  resolveCampaignAudience,
  type CampaignAudienceCounts,
  type CampaignRecipient,
} from "../_shared/campaign-audience.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // VTID-05049: this function queues email/SMS/WhatsApp messages that
    // process-campaign-queue then sends. verify_jwt=true accepts the public
    // anon key, so anyone could mass-message members. Only a service-role
    // caller (trigger-scheduled-campaigns) may queue.
    if (!(await isServiceRoleCaller(req))) {
      return unauthorizedResponse(corsHeaders);
    }

    const supabaseClient = createDataClient(createClient,
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaignId, channels, audienceData: requestAudienceData } = await req.json();

    if (!campaignId || !channels) {
      throw new Error('Missing required fields: campaignId, channels');
    }

    // VTID-05049 defence in depth: the campaign must exist and be due, the
    // message comes from the campaign row (never the request), and every
    // recipient query is scoped to the campaign owner and the owner's tenant.
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('id, user_id, name, description, status, distribution_config')
      .eq('id', campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (campaign.status !== 'scheduled' && campaign.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Campaign is ${campaign.status}, not scheduled or active` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Same fallback trigger-scheduled-campaigns uses.
    const messageContent = campaign.distribution_config?.messageContent || {
      subject: campaign.name,
      body: campaign.description || 'Campaign message'
    };

    // VTID-05120: the audience comes from the campaign row too
    // (distribution_config.audience_data, written by CampaignDialog), so a
    // caller cannot widen it. The request's audienceData is a logged legacy
    // fallback only.
    let audienceData = campaign.distribution_config?.audience_data ?? null;
    if (!audienceData && requestAudienceData) {
      console.warn(`[queue-campaign-recipients] campaign ${campaignId} has no distribution_config.audience_data; using the request audienceData (legacy fallback)`);
      audienceData = requestAudienceData;
    }

    // campaigns has no tenant_id column: the campaign's tenant is its owner's
    // primary tenant (user_tenants.is_primary, else the oldest membership).
    const { data: ownerTenants, error: ownerTenantError } = await supabaseClient
      .from('user_tenants')
      .select('tenant_id, is_primary, created_at')
      .eq('user_id', campaign.user_id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    if (ownerTenantError) throw ownerTenantError;
    const tenantId: string | null = ownerTenants?.[0]?.tenant_id ?? null;

    if (!tenantId && hasMemberAudience(audienceData)) {
      return new Response(
        JSON.stringify({ error: 'campaign_owner_has_no_tenant' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Queuing recipients for campaign ${campaignId}...`);

    let allRecipients: CampaignRecipient[];
    let counts: CampaignAudienceCounts;
    try {
      ({ recipients: allRecipients, counts } = await resolveCampaignAudience(supabaseClient, {
        ownerId: campaign.user_id,
        tenantId,
        audience: audienceData,
      }));
    } catch (error) {
      if (error instanceof CampaignAudienceError) {
        console.error(`[queue-campaign-recipients] audience step ${error.step} failed:`, error.original);
        return new Response(
          JSON.stringify({ error: 'campaign_audience_failed', step: error.step }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Deduplicate recipients by email and phone
    const uniqueRecipients: CampaignRecipient[] = [];
    const seen = new Set<string>();

    for (const recipient of allRecipients) {
      const key = [recipient.email, recipient.phone].filter(Boolean).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipients.push(recipient);
      }
    }

    console.log(`Found ${allRecipients.length} total recipients (${uniqueRecipients.length} unique)`, JSON.stringify(counts));

    // VTID-05120 (owner decision D1): the send path stays closed until
    // CAMPAIGN_QUEUE_ENABLED is set. Until then this is a dry run: the audience
    // is resolved and counted, and nothing is inserted or updated. The
    // message_queue column mapping below is still the old, broken one and must
    // be fixed (atomically with campaign_recipients) before that flag is set.
    if (Deno.env.get('CAMPAIGN_QUEUE_ENABLED') !== 'true') {
      console.log(`[queue-campaign-recipients] CAMPAIGN_QUEUE_ENABLED is not set: dry run for campaign ${campaignId}, nothing queued`);
      return new Response(
        JSON.stringify({ dry_run: true, counts, unique_recipients: uniqueRecipients.length, queued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found', queued: 0, counts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build every row first, then insert in batches that throw on error, so a
    // bad row never leaves a half-written set behind.
    const recipientRecords: any[] = [];
    const messageQueueItems: any[] = [];
    const queuedAt = new Date().toISOString();

    for (const recipient of uniqueRecipients) {
      for (const channel of channels) {
        // Validate recipient has required contact info for channel
        if (channel === 'email' && !recipient.email) continue;
        if (channel === 'sms' && !recipient.phone) continue;
        if (channel === 'whatsapp' && !recipient.whatsapp_number && !recipient.phone) continue;

        const recipientId = crypto.randomUUID();
        recipientRecords.push({
          id: recipientId,
          campaign_id: campaignId,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          recipient_phone: recipient.phone,
          recipient_type: recipient.source,
          channel: channel,
          status: 'pending',
          metadata: {
            source: recipient.source,
            queued_at: queuedAt
          }
        });

        messageQueueItems.push({
          campaign_id: campaignId,
          recipient_id: recipientId,
          channel: channel,
          recipient_email: recipient.email,
          recipient_phone: channel === 'whatsapp'
            ? (recipient.whatsapp_number || recipient.phone)
            : recipient.phone,
          recipient_name: recipient.name,
          message_content: messageContent,
          status: 'pending',
          retry_count: 0,
          scheduled_for: queuedAt
        });
      }
    }

    if (recipientRecords.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients reachable on the selected channels', queued: 0, counts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: recipientError } = await supabaseClient
      .from('campaign_recipients')
      .insert(recipientRecords);
    if (recipientError) {
      console.error('Error inserting recipients:', recipientError);
      throw recipientError;
    }

    // Batch insert message queue items
    const { data: queuedMessages, error: queueError } = await supabaseClient
      .from('message_queue')
      .insert(messageQueueItems)
      .select();

    if (queueError) {
      console.error('Error queuing messages:', queueError);
      throw queueError;
    }

    console.log(`Queued ${queuedMessages.length} messages across ${channels.length} channels`);

    // Update campaign status
    const { error: statusError } = await supabaseClient
      .from('campaigns')
      .update({
        status: 'distributing',
        metadata: {
          total_recipients: uniqueRecipients.length,
          total_messages: queuedMessages.length,
          queued_at: queuedAt
        }
      })
      .eq('id', campaignId);
    if (statusError) throw statusError;

    return new Response(
      JSON.stringify({
        success: true,
        recipients: recipientRecords.length,
        queued: queuedMessages.length,
        channels: channels,
        counts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue recipients error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
