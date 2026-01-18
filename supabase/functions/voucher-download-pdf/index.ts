import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_DETAILS = {
  test: {
    name: "Test Voucher",
    benefits: ["Payment flow test only", "Not a real voucher", "For development testing"],
  },
  experience: {
    name: "Experience Voucher",
    benefits: [
      "1 premium community event access",
      "Personalized wellness consultation",
      "30-day Vitana+ trial included",
      "Beautifully designed e-voucher",
    ],
  },
  exclusive: {
    name: "Exclusive Voucher",
    benefits: [
      "3 premium community events",
      "1-on-1 expert coaching session",
      "90-day Vitana+ subscription",
      "Priority booking + VIP perks",
    ],
  },
};

/**
 * Self-healing: Check Stripe and update order if payment is complete but order is still pending
 */
async function selfHealPendingOrder(
  supabaseAdmin: any,
  order: any,
  stripeSecretKey: string
): Promise<{ healed: boolean; error?: string }> {
  console.log(`[voucher-download-pdf] Self-healing check for order ${order.id}, status: ${order.status}`);
  
  if (order.status === "completed") {
    return { healed: false }; // Already completed, no healing needed
  }
  
  if (!order.checkout_session_id) {
    console.log(`[voucher-download-pdf] No checkout_session_id, cannot self-heal`);
    return { healed: false, error: "Order has no checkout session. Please contact support." };
  }
  
  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    
    console.log(`[voucher-download-pdf] Retrieving Stripe session: ${order.checkout_session_id}`);
    const session = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
    
    console.log(`[voucher-download-pdf] Stripe session payment_status: ${session.payment_status}`);
    
    if (session.payment_status === "paid") {
      console.log(`[voucher-download-pdf] Payment confirmed! Updating order to completed...`);
      
      // Update voucher_orders to completed
      const { error: orderError } = await supabaseAdmin
        .from("voucher_orders")
        .update({
          status: "completed",
          payment_intent_id: session.payment_intent as string,
        })
        .eq("id", order.id);
      
      if (orderError) {
        console.error(`[voucher-download-pdf] Error updating order:`, orderError);
        return { healed: false, error: "Failed to update order status" };
      }
      
      // Activate the voucher if exists
      if (order.voucher_id) {
        const { error: voucherError } = await supabaseAdmin
          .from("vouchers")
          .update({ status: "active" })
          .eq("id", order.voucher_id);
        
        if (voucherError) {
          console.error(`[voucher-download-pdf] Error activating voucher:`, voucherError);
        } else {
          console.log(`[voucher-download-pdf] Voucher ${order.voucher_id} activated`);
        }
      }
      
      console.log(`[voucher-download-pdf] Self-healing complete for order ${order.id}`);
      return { healed: true };
    } else {
      console.log(`[voucher-download-pdf] Payment not completed: ${session.payment_status}`);
      return { healed: false, error: "Payment not yet completed. Please wait or contact support." };
    }
  } catch (stripeError: any) {
    console.error(`[voucher-download-pdf] Stripe error during self-heal:`, stripeError);
    return { healed: false, error: `Unable to verify payment: ${stripeError.message}` };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Check for required secrets
    if (!stripeSecretKey) {
      console.error("[voucher-download-pdf] STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client for user verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Create admin client for self-healing updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[voucher-download-pdf] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[voucher-download-pdf] Fetching order ${orderId} for user ${user.id}`);

    // Fetch voucher order with voucher details (use admin to ensure we get the data)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("voucher_orders")
      .select(`
        *,
        voucher:vouchers(*)
      `)
      .eq("id", orderId)
      .eq("buyer_user_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("[voucher-download-pdf] Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[voucher-download-pdf] Order found: status=${order.status}, checkout_session_id=${order.checkout_session_id}`);

    // Self-healing: If order is pending but has checkout_session_id, check Stripe
    if (order.status !== "completed") {
      const healResult = await selfHealPendingOrder(supabaseAdmin, order, stripeSecretKey);
      
      if (healResult.healed) {
        // Refetch the order to get updated data
        const { data: updatedOrder, error: refetchError } = await supabaseAdmin
          .from("voucher_orders")
          .select(`*, voucher:vouchers(*)`)
          .eq("id", orderId)
          .single();
        
        if (!refetchError && updatedOrder) {
          Object.assign(order, updatedOrder);
        }
      } else if (healResult.error) {
        return new Response(
          JSON.stringify({ error: healResult.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Order not completed yet. Please try again in a moment." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get tier details
    const tier = order.tier as keyof typeof TIER_DETAILS;
    const tierInfo = TIER_DETAILS[tier] || TIER_DETAILS.experience;

    // Format dates
    const purchaseDate = new Date(order.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const expiresAt = order.voucher?.expires_at 
      ? new Date(order.voucher.expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "1 year from purchase";

    // Build voucher data for PDF generation
    const voucherData = {
      code: order.voucher?.code || order.id.slice(0, 8).toUpperCase(),
      tier: tier,
      tierName: tierInfo.name,
      price: `€${(order.amount_cents / 100).toFixed(2)}`,
      purchaseDate,
      expiresAt,
      benefits: tierInfo.benefits,
      buyerEmail: user.email,
      orderId: order.id,
    };

    console.log("[voucher-download-pdf] Returning voucher data:", voucherData);

    return new Response(
      JSON.stringify({ success: true, voucher: voucherData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[voucher-download-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
