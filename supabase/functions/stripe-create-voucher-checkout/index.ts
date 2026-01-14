import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for voucher tiers
const VOUCHER_PRICES = {
  experience: "price_1SpVInAEiUKAgGPQKxwGTWIz", // €99
  exclusive: "price_1SpVJAAEiUKAgGPQfZNE1eJg",   // €199
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-VOUCHER-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Create user client for auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Get authenticated user (required for voucher purchases)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required to purchase vouchers");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    const buyerEmail = user.email;
    logStep("User authenticated", { userId: user.id, email: buyerEmail });

    // Parse request body
    const { tier } = await req.json();
    
    if (!tier || !VOUCHER_PRICES[tier as keyof typeof VOUCHER_PRICES]) {
      throw new Error("Invalid voucher tier. Must be 'experience' or 'exclusive'");
    }

    logStep("Request received", { tier });

    const priceId = VOUCHER_PRICES[tier as keyof typeof VOUCHER_PRICES];
    const tierPrice = tier === "experience" ? 99 : 199;

    // Generate unique voucher code
    const voucherCode = `MXN-${tier.toUpperCase().slice(0, 3)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Create pending voucher order record
    const { data: order, error: orderError } = await supabaseAdmin
      .from("voucher_orders")
      .insert({
        buyer_user_id: user.id,
        buyer_email: buyerEmail,
        tier,
        amount: tierPrice,
        currency: "EUR",
        status: "pending",
        voucher_code: voucherCode,
      })
      .select()
      .single();

    if (orderError) {
      logStep("Failed to create voucher order", { error: orderError });
      throw new Error("Failed to create voucher order");
    }

    logStep("Voucher order created", { orderId: order.id, voucherCode });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: buyerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://vitana.app";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : buyerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/home?voucher_success=true&order_id=${order.id}`,
      cancel_url: `${origin}/home?voucher_cancelled=true`,
      metadata: {
        type: "voucher",
        order_id: order.id,
        tier,
        voucher_code: voucherCode,
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with stripe session id
    await supabaseAdmin
      .from("voucher_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        order_id: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
