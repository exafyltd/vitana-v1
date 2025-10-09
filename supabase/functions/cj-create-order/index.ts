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

    const { checkoutSessionId } = await req.json();

    if (!checkoutSessionId) {
      throw new Error('Checkout session ID is required');
    }

    console.log('Creating CJ order for checkout session:', checkoutSessionId);

    // Get checkout session
    const { data: session, error: sessionError } = await supabaseClient
      .from('checkout_sessions')
      .select('*')
      .eq('id', checkoutSessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      throw new Error('Checkout session not found');
    }

    if (session.status !== 'completed') {
      throw new Error('Checkout session not completed');
    }

    // Parse cart items
    const cartItems = session.cart_snapshot;
    if (!cartItems || !Array.isArray(cartItems)) {
      throw new Error('Invalid cart data');
    }

    // Filter CJ products only
    const cjItems = cartItems.filter((item: any) => item.external_source === 'cj');

    if (cjItems.length === 0) {
      console.log('No CJ products in this order');
      return new Response(JSON.stringify({ 
        message: 'No CJ products to fulfill',
        orderId: null 
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

    // Get user profile for shipping address
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, email, phone')
      .eq('user_id', user.id)
      .single();

    // Format order for CJ
    const orderProducts = cjItems.map((item: any) => ({
      vid: item.external_product_id,
      quantity: item.quantity,
    }));

    // Default shipping address (you'll want to collect this from user)
    const shippingAddress = {
      countryCode: 'US',
      name: profile?.full_name || 'Customer',
      email: profile?.email || user.email,
      phone: profile?.phone || '',
      addressLine1: '123 Main St', // Should come from user
      city: 'New York',
      state: 'NY',
      zip: '10001',
    };

    // Create order in CJ
    const cjOrderResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': cjToken,
      },
      body: JSON.stringify({
        products: orderProducts,
        shippingAddress,
        shippingMethod: 'CJ_PACKET_FU', // Default shipping method
      }),
    });

    const cjOrderData = await cjOrderResponse.json();

    if (!cjOrderResponse.ok || !cjOrderData.result || cjOrderData.code !== 200) {
      console.error('CJ order creation error:', cjOrderData);
      throw new Error(cjOrderData.message || 'Failed to create CJ order');
    }

    // Save order to database
    const { data: order, error: orderError } = await supabaseClient
      .from('cj_orders')
      .insert({
        user_id: user.id,
        checkout_session_id: checkoutSessionId,
        cj_order_id: cjOrderData.data.orderId,
        status: 'processing',
        total_amount: session.total_amount,
        shipping_cost: 0,
        order_items: cjItems,
        shipping_address: shippingAddress,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error saving CJ order:', orderError);
      throw new Error('Failed to save order');
    }

    console.log('CJ order created successfully:', order.id);

    return new Response(JSON.stringify({ 
      orderId: order.id,
      cjOrderId: order.cj_order_id,
      status: order.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-create-order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
