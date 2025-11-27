import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { campaignId, channels, audienceData, messageContent } = await req.json();

    if (!campaignId || !channels || !messageContent) {
      throw new Error('Missing required fields: campaignId, channels, messageContent');
    }

    console.log(`Queuing recipients for campaign ${campaignId}...`);

    let allRecipients: any[] = [];

    // Process Vitana Contacts
    if (audienceData?.vitanaContacts?.enabled && audienceData.vitanaContacts.contactIds?.length > 0) {
      const { data: contacts } = await supabaseClient
        .from('contacts')
        .select('*')
        .in('id', audienceData.vitanaContacts.contactIds);

      if (contacts) {
        allRecipients.push(...contacts.map((c: any) => ({
          name: c.contact_name,
          email: c.contact_email,
          phone: c.contact_phone,
          source: 'vitana_contacts'
        })));
      }
    }

    // Process CSV uploads
    if (audienceData?.csvUpload?.enabled && audienceData.csvUpload.data?.length > 0) {
      allRecipients.push(...audienceData.csvUpload.data.map((row: any) => ({
        name: row.name || row.Name || 'Unknown',
        email: row.email || row.Email,
        phone: row.phone || row.Phone,
        source: 'csv_upload'
      })));
    }

    // Process Community Segments
    if (audienceData?.segments?.enabled && audienceData.segments.segmentIds?.length > 0) {
      // Fetch segment members
      for (const segmentId of audienceData.segments.segmentIds) {
        const { data: segment } = await supabaseClient
          .from('campaign_audience_segments')
          .select('criteria')
          .eq('id', segmentId)
          .single();

        if (segment?.criteria) {
          // Apply segment criteria to find matching users
          // This is a simplified version - would need more complex logic
          const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('user_id, display_name, full_name')
            .limit(100);

          if (profiles) {
            allRecipients.push(...profiles.map((p: any) => ({
              name: p.display_name || p.full_name || 'Unknown',
              email: null, // Would need to fetch from user preferences
              phone: null,
              source: `segment_${segmentId}`
            })));
          }
        }
      }
    }

    console.log(`Found ${allRecipients.length} total recipients`);

    if (allRecipients.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found', queued: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create campaign recipient records
    const campaignRecipients = [];
    const messageQueueItems = [];

    for (const recipient of allRecipients) {
      for (const channel of channels) {
        // Validate recipient has required contact info for channel
        if (channel === 'email' && !recipient.email) continue;
        if ((channel === 'sms' || channel === 'whatsapp') && !recipient.phone) continue;

        // Create campaign recipient record
        const recipientRecord = {
          campaign_id: campaignId,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          recipient_phone: recipient.phone,
          recipient_type: recipient.source,
          channel: channel,
          status: 'pending',
          metadata: {
            source: recipient.source,
            queued_at: new Date().toISOString()
          }
        };

        const { data: insertedRecipient, error: recipientError } = await supabaseClient
          .from('campaign_recipients')
          .insert(recipientRecord)
          .select()
          .single();

        if (recipientError) {
          console.error('Error inserting recipient:', recipientError);
          continue;
        }

        campaignRecipients.push(insertedRecipient);

        // Create message queue item
        messageQueueItems.push({
          campaign_id: campaignId,
          recipient_id: insertedRecipient.id,
          channel: channel,
          recipient_email: recipient.email,
          recipient_phone: recipient.phone,
          recipient_name: recipient.name,
          message_content: messageContent,
          status: 'pending',
          retry_count: 0,
          scheduled_for: new Date().toISOString()
        });
      }
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
    await supabaseClient
      .from('campaigns')
      .update({ 
        status: 'distributing',
        metadata: {
          total_recipients: allRecipients.length,
          total_messages: queuedMessages.length,
          queued_at: new Date().toISOString()
        }
      })
      .eq('id', campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        recipients: campaignRecipients.length,
        queued: queuedMessages.length,
        channels: channels
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
