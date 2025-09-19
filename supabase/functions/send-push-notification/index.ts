import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  threadId?: string;
  userId?: string;
  isTest?: boolean;
}

// VAPID key utilities
function base64UrlToUint8Array(base64UrlString: string): Uint8Array {
  const padding = '='.repeat((4 - base64UrlString.length % 4) % 4);
  const base64 = (base64UrlString + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVapidAuthToken(vapidPrivateKey: string, vapidSubject: string, audience: string): Promise<string> {
  // JWT header
  const header = { typ: 'JWT', alg: 'ES256' };
  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  
  // JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: vapidSubject
  };
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  
  // Create signature
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );
  
  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // Generate VAPID auth token
    const vapidToken = await generateVapidAuthToken(vapidPrivateKey, vapidSubject, audience);
    
    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 hours
      },
      body: payload
    });
    
    return response;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
}

async function logNotificationAttempt(
  supabase: any,
  userId: string,
  threadId: string,
  status: 'sent' | 'no-subscription' | 'thread-muted' | 'push-disabled' | 'dnd-active' | 'user-active' | 'endpoint-dead' | 'send-error',
  reason?: string
) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        thread_id: threadId,
        status,
        reason,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log notification attempt:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, threadId, userId, isTest }: NotificationPayload = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For test notifications, send to current user
    if (isTest) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authentication required for test notifications');
      }

      // Create test notification payload
      const notificationPayload = JSON.stringify({
        title,
        body,
        icon: '/favicon.ico',
        tag: threadId || 'test',
        data: {
          threadId: threadId || 'test',
          url: threadId ? `/inbox?thread=${threadId}` : '/inbox'
        }
      });

      // TODO: Get user's push subscriptions and send
      // For now, just return success
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Test notification would be sent' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!threadId || !userId) {
      throw new Error('threadId and userId are required for real notifications');
    }

    // Get user's push subscription
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      await logNotificationAttempt(supabase, userId, threadId, 'no-subscription');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active subscriptions found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if thread is muted
    const { data: threadMute } = await supabase
      .from('thread_mutes')
      .select('id')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .eq('active', true)
      .single();

    if (threadMute) {
      await logNotificationAttempt(supabase, userId, threadId, 'thread-muted');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Thread is muted for this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if push notifications are disabled
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('push_enabled')
      .eq('user_id', userId)
      .single();

    if (settings && !settings.push_enabled) {
      await logNotificationAttempt(supabase, userId, threadId, 'push-disabled');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Push notifications disabled for this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is in Do Not Disturb mode
    const { data: dndSettings } = await supabase
      .from('dnd_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (dndSettings) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = parseInt(dndSettings.start_time?.split(':')[0] || '22') * 60 + 
                        parseInt(dndSettings.start_time?.split(':')[1] || '0');
      const endTime = parseInt(dndSettings.end_time?.split(':')[0] || '7') * 60 + 
                      parseInt(dndSettings.end_time?.split(':')[1] || '0');

      const isInDndWindow = startTime > endTime ? 
        (currentTime >= startTime || currentTime <= endTime) :
        (currentTime >= startTime && currentTime <= endTime);

      if (isInDndWindow) {
        await logNotificationAttempt(supabase, userId, threadId, 'dnd-active');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User is in Do Not Disturb mode' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if user is currently active (presence within 30 seconds)
    const { data: presence } = await supabase
      .from('user_presence')
      .select('last_seen')
      .eq('user_id', userId)
      .single();

    if (presence?.last_seen) {
      const lastSeen = new Date(presence.last_seen);
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      
      if (lastSeen > thirtySecondsAgo) {
        await logNotificationAttempt(supabase, userId, threadId, 'user-active');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'User is currently active' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Send notifications to all active subscriptions
    const results = [];
    for (const subscription of subscriptions) {
      try {
        const notificationPayload = JSON.stringify({
          title,
          body,
          icon: '/favicon.ico',
          tag: threadId,
          data: {
            threadId,
            url: `/inbox?thread=${threadId}`
          }
        });

        const response = await sendWebPushNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key
            }
          },
          notificationPayload,
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject
        );

        if (response.status === 404 || response.status === 410) {
          // Mark subscription as inactive
          await supabase
            .from('push_subscriptions')
            .update({ active: false })
            .eq('id', subscription.id);
          
          await logNotificationAttempt(supabase, userId, threadId, 'endpoint-dead', 'HTTP ' + response.status);
        } else if (response.ok) {
          await logNotificationAttempt(supabase, userId, threadId, 'sent');
          results.push({ success: true, subscriptionId: subscription.id });
        } else {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      } catch (error) {
        console.error(`Failed to send to subscription ${subscription.id}:`, error);
        await logNotificationAttempt(supabase, userId, threadId, 'send-error', error.message);
        results.push({ success: false, subscriptionId: subscription.id, error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Processed ${results.length} subscriptions` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});