import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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

    // Fetch voucher order with voucher details
    const { data: order, error: orderError } = await supabase
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

    if (order.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Order not completed yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

  } catch (error) {
    console.error("[voucher-download-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
