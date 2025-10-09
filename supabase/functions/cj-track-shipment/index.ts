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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    console.log('Tracking CJ order:', orderId);

    // Get order from database
    const { data: order, error: orderError } = await supabaseClient
      .from('cj_orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (!order.cj_order_id) {
      return new Response(JSON.stringify({ 
        order,
        tracking: null,
        message: 'Order not yet submitted to CJ'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get CJ access token
    const tokenResponse = await fetch(`${req.headers.get("origin")}/functions/v1/cj-get-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get CJ access token');
    }

    const { token: cjToken } = await tokenResponse.json();

    // Get order details from CJ
    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': cjToken,
      },
      body: JSON.stringify({ orderId: order.cj_order_id }),
    });

    const data = await response.json();

    if (!response.ok || !data.result || data.code !== 200) {
      console.error('CJ order tracking error:', data);
      throw new Error(data.message || 'Failed to get order details');
    }

    const orderData = data.data;
    
    // Update order status in database
    const updateData: any = {
      status: orderData.orderStatus || order.status,
    };

    if (orderData.trackingNumber) {
      updateData.tracking_number = orderData.trackingNumber;
      updateData.carrier = orderData.shippingMethod || 'CJ';
    }

    if (orderData.shippedTime) {
      updateData.shipped_at = new Date(orderData.shippedTime).toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from('cj_orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
    }

    console.log('Order tracking updated');

    return new Response(JSON.stringify({ 
      order: { ...order, ...updateData },
      tracking: {
        trackingNumber: orderData.trackingNumber,
        carrier: orderData.shippingMethod,
        status: orderData.orderStatus,
        shippedAt: orderData.shippedTime,
        estimatedDelivery: orderData.estimatedDeliveryTime,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-track-shipment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
