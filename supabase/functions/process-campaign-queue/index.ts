import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageQueueItem {
  id: string;
  campaign_id: string;
  recipient_id: string;
  channel: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_name: string;
  message_content: string;
  status: string;
  retry_count: number;
  scheduled_for?: string;
}

// Rate limits per provider (messages per second)
const RATE_LIMITS = {
  email: 100, // Resend
  sms: 1,     // Twilio
  whatsapp: 80 // Meta WhatsApp
};

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { channel } = await req.json();
    
    if (!channel || !['email', 'sms', 'whatsapp'].includes(channel)) {
      throw new Error('Invalid channel specified');
    }

    console.log(`Processing ${channel} queue...`);

    // Fetch pending messages for this channel
    const { data: messages, error: fetchError } = await supabaseClient
      .from('message_queue')
      .select('*')
      .eq('channel', channel)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending messages', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${messages.length} pending messages`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process messages with rate limiting
    const delayBetweenMessages = 1000 / RATE_LIMITS[channel as keyof typeof RATE_LIMITS];

    for (const message of messages) {
      try {
        // Update status to sending
        await supabaseClient
          .from('message_queue')
          .update({ status: 'sending' })
          .eq('id', message.id);

        // Send message via appropriate provider
        let sent = false;
        
        if (channel === 'email') {
          sent = await sendEmail(message, supabaseClient);
        } else if (channel === 'sms') {
          sent = await sendSMS(message, supabaseClient);
        } else if (channel === 'whatsapp') {
          sent = await sendWhatsApp(message, supabaseClient);
        }

        if (sent) {
          // Update to sent status
          await supabaseClient
            .from('message_queue')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', message.id);

          // Update campaign recipient status
          await supabaseClient
            .from('campaign_recipients')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', message.recipient_id);

          results.sent++;
        } else {
          throw new Error('Failed to send message');
        }

        results.processed++;

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

      } catch (error) {
        console.error(`Error sending message ${message.id}:`, error);
        
        const retryCount = message.retry_count + 1;
        
        if (retryCount >= MAX_RETRIES) {
          // Mark as failed after max retries
          await supabaseClient
            .from('message_queue')
            .update({ 
              status: 'failed',
              error_message: String(error),
              failed_at: new Date().toISOString()
            })
            .eq('id', message.id);

          await supabaseClient
            .from('campaign_recipients')
            .update({ 
              status: 'failed',
              error_message: String(error),
              failed_at: new Date().toISOString()
            })
            .eq('id', message.recipient_id);

          results.failed++;
        } else {
          // Schedule retry
          const retryDelay = RETRY_DELAYS[retryCount - 1];
          const nextRetry = new Date(Date.now() + retryDelay).toISOString();
          
          await supabaseClient
            .from('message_queue')
            .update({ 
              status: 'pending',
              retry_count: retryCount,
              scheduled_for: nextRetry,
              error_message: String(error)
            })
            .eq('id', message.id);
        }

        results.errors.push(`Message ${message.id}: ${error}`);
      }
    }

    console.log(`Queue processing complete:`, results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendEmail(message: MessageQueueItem, supabase: any): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  // Get sender info from campaign channel
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, distribution_channels!inner(*)')
    .eq('id', message.campaign_id)
    .single();

  const emailChannel = campaign?.distribution_channels?.find((ch: any) => ch.channel_type === 'email');
  const senderName = emailChannel?.connection_data?.sender_name || 'VITANA';
  const senderEmail = emailChannel?.connection_data?.email || 'hello@vitana.app';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${senderName} <${senderEmail}>`,
      to: [message.recipient_email],
      subject: `Message from ${senderName}`,
      html: message.message_content,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return true;
}

async function sendSMS(message: MessageQueueItem, supabase: any): Promise<boolean> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!twilioSid || !twilioToken) {
    console.error('Twilio credentials not configured');
    return false;
  }

  // Get Twilio phone number from campaign channel
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, distribution_channels!inner(*)')
    .eq('id', message.campaign_id)
    .single();

  const smsChannel = campaign?.distribution_channels?.find((ch: any) => ch.channel_type === 'sms');
  const fromNumber = smsChannel?.connection_data?.from_number;

  if (!fromNumber) {
    throw new Error('Twilio from number not configured');
  }

  const auth = btoa(`${twilioSid}:${twilioToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: message.recipient_phone!,
        From: fromNumber,
        Body: message.message_content,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${error}`);
  }

  return true;
}

async function sendWhatsApp(message: MessageQueueItem, supabase: any): Promise<boolean> {
  // Get Meta credentials from campaign channel
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, distribution_channels!inner(*)')
    .eq('id', message.campaign_id)
    .single();

  const whatsappChannel = campaign?.distribution_channels?.find((ch: any) => ch.channel_type === 'whatsapp');
  const metaToken = whatsappChannel?.connection_data?.meta_api_token;
  const phoneNumberId = whatsappChannel?.connection_data?.phone_number_id;

  if (!metaToken || !phoneNumberId) {
    throw new Error('WhatsApp credentials not configured');
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${metaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.recipient_phone!,
        type: 'text',
        text: { body: message.message_content }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  return true;
}
