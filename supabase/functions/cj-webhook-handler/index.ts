import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    const eventType = payload.eventType || 'unknown';

    console.log('CJ webhook received:', eventType);

    // Log webhook
    await supabaseClient
      .from('cj_webhook_logs')
      .insert({
        event_type: eventType,
        payload,
        processed: false,
      });

    // Process different event types
    switch (eventType) {
      case 'order_shipped':
        await handleOrderShipped(supabaseClient, payload);
        break;
      case 'order_delivered':
        await handleOrderDelivered(supabaseClient, payload);
        break;
      case 'order_cancelled':
        await handleOrderCancelled(supabaseClient, payload);
        break;
      case 'inventory_updated':
        await handleInventoryUpdated(supabaseClient, payload);
        break;
      default:
        console.log('Unhandled event type:', eventType);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-webhook-handler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleOrderShipped(supabase: any, payload: any) {
  const { orderId, trackingNumber, carrier, shippedAt } = payload.data;

  await supabase
    .from('cj_orders')
    .update({
      status: 'shipped',
      tracking_number: trackingNumber,
      carrier,
      shipped_at: shippedAt,
    })
    .eq('cj_order_id', orderId);

  console.log('Order shipped:', orderId);
}

async function handleOrderDelivered(supabase: any, payload: any) {
  const { orderId, deliveredAt } = payload.data;

  await supabase
    .from('cj_orders')
    .update({
      status: 'delivered',
      delivered_at: deliveredAt,
    })
    .eq('cj_order_id', orderId);

  console.log('Order delivered:', orderId);
}

async function handleOrderCancelled(supabase: any, payload: any) {
  const { orderId, reason } = payload.data;

  await supabase
    .from('cj_orders')
    .update({
      status: 'cancelled',
    })
    .eq('cj_order_id', orderId);

  console.log('Order cancelled:', orderId, reason);
}

async function handleInventoryUpdated(supabase: any, payload: any) {
  const { productId, inventory } = payload.data;

  await supabase
    .from('cj_products')
    .update({
      inventory_count: inventory,
      last_synced_at: new Date().toISOString(),
    })
    .eq('cj_product_id', productId);

  console.log('Inventory updated for product:', productId);
}
