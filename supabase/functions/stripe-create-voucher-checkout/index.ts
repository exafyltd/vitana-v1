import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for voucher tiers
const VOUCHER_PRICES = {
  test: "price_1Spt2uAEiUKAgGPQ4GRZonZf",       // €0.49 (test)
  experience: "price_1SpVInAEiUKAgGPQKxwGTWIz", // €99
  exclusive: "price_1SpVJAAEiUKAgGPQfZNE1eJg",  // €199
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-VOUCHER-CHECKOUT] ${step}${detailsStr}`);
};

// Sanitize returnTo - only allow relative paths starting with /
const sanitizeReturnTo = (path: string | undefined): string => {
  if (!path || typeof path !== 'string') return '/home';
  const trimmed = path.trim();
  // Must start with / and not contain protocol or double slashes
  if (!trimmed.startsWith('/') || trimmed.includes('://') || trimmed.startsWith('//')) {
    return '/home';
  }
  return trimmed;
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
    const { tier, returnTo } = await req.json();
    const safeReturnTo = sanitizeReturnTo(returnTo);
    
    if (!tier || !VOUCHER_PRICES[tier as keyof typeof VOUCHER_PRICES]) {
      throw new Error("Invalid voucher tier. Must be 'test', 'experience', or 'exclusive'");
    }

    logStep("Request received", { tier });

    const priceId = VOUCHER_PRICES[tier as keyof typeof VOUCHER_PRICES];
    const tierPriceCents = tier === "test" ? 49 : tier === "experience" ? 9900 : 19900;

    // Maxina tenant ID for voucher purchases
    const MAXINA_TENANT_ID = "2e7528b8-472a-4356-88da-0280d4639cce";

    // Create voucher record first (expires in 1 year)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from("vouchers")
      .insert({
        tier,
        type: "gift",
        status: "pending",
        tenant_id: MAXINA_TENANT_ID,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (voucherError) {
      logStep("Failed to create voucher", { error: voucherError });
      throw new Error("Failed to create voucher");
    }

    logStep("Voucher created", { voucherId: voucher.id });

    // Create voucher order record
    const { data: order, error: orderError } = await supabaseAdmin
      .from("voucher_orders")
      .insert({
        voucher_id: voucher.id,
        buyer_user_id: user.id,
        buyer_email: buyerEmail,
        amount_cents: tierPriceCents,
        currency: "EUR",
        status: "pending",
        tenant_id: MAXINA_TENANT_ID,
        provider: "stripe",
      })
      .select()
      .single();

    if (orderError) {
      logStep("Failed to create voucher order", { error: orderError });
      throw new Error("Failed to create voucher order");
    }

    logStep("Voucher order created", { orderId: order.id, voucherId: voucher.id });

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

    // Create Stripe Checkout session with dynamic return URL
    const returnSeparator = safeReturnTo.includes('?') ? '&' : '?';
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
      success_url: `${origin}${safeReturnTo}${returnSeparator}voucher_success=true&order_id=${order.id}&tier=${tier}`,
      cancel_url: `${origin}${safeReturnTo}${returnSeparator}voucher_cancelled=true`,
      metadata: {
        type: "voucher",
        order_id: order.id,
        voucher_id: voucher.id,
        tier,
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Update order with stripe checkout session id
    await supabaseAdmin
      .from("voucher_orders")
      .update({ checkout_session_id: session.id })
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
