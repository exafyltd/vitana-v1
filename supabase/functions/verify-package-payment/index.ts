import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PACKAGE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { purchase_id, session_id } = await req.json();
    logStep("Request params", { purchase_id, session_id });

    if (!purchase_id || !session_id) {
      throw new Error("Missing purchase_id or session_id");
    }

    // Fetch purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("package_purchases")
      .select(`
        *,
        business_packages (
          id,
          title,
          description,
          image_url,
          price_cents,
          currency,
          tenant_id,
          package_items (*)
        )
      `)
      .eq("id", purchase_id)
      .single();

    if (purchaseError || !purchase) {
      logStep("Purchase not found", { purchaseError });
      throw new Error("Purchase not found");
    }

    logStep("Purchase found", { status: purchase.status, package_id: purchase.package_id });

    // If already paid, return success (idempotent)
    if (purchase.status === "paid") {
      logStep("Already paid, returning existing purchase");
      return new Response(JSON.stringify({ success: true, purchase }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { payment_status: session.payment_status });

    if (session.payment_status !== "paid") {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Verify session matches purchase
    if (purchase.stripe_session_id !== session_id) {
      logStep("Session mismatch", { expected: purchase.stripe_session_id, received: session_id });
      throw new Error("Session ID does not match purchase record");
    }

    // Update purchase status to paid
    const { error: updateError } = await supabaseAdmin
      .from("package_purchases")
      .update({
        status: "paid",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", purchase_id);

    if (updateError) {
      logStep("Failed to update purchase", { updateError });
      throw new Error("Failed to update purchase status");
    }
    logStep("Purchase updated to paid");

    // Create redemption rows for each package item
    const packageItems = purchase.business_packages?.package_items || [];
    const redemptionRows: Array<{
      purchase_id: string;
      package_item_id: string;
      redemption_number: number;
      status: string;
      tenant_id: string;
    }> = [];

    for (const item of packageItems) {
      const quantity = item.quantity || 1;
      for (let i = 1; i <= quantity; i++) {
        redemptionRows.push({
          purchase_id: purchase_id,
          package_item_id: item.id,
          redemption_number: i,
          status: "available",
          tenant_id: purchase.tenant_id,
        });
      }
    }

    if (redemptionRows.length > 0) {
      // Check if redemptions already exist (idempotency)
      const { data: existingRedemptions } = await supabaseAdmin
        .from("package_item_redemptions")
        .select("id")
        .eq("purchase_id", purchase_id)
        .limit(1);

      if (!existingRedemptions || existingRedemptions.length === 0) {
        const { error: redemptionError } = await supabaseAdmin
          .from("package_item_redemptions")
          .insert(redemptionRows);

        if (redemptionError) {
          logStep("Failed to create redemptions", { redemptionError });
          // Don't throw - payment succeeded, redemptions can be created later
        } else {
          logStep("Redemptions created", { count: redemptionRows.length });
        }
      } else {
        logStep("Redemptions already exist, skipping creation");
      }
    }

    // Fetch updated purchase with all details
    const { data: updatedPurchase } = await supabaseAdmin
      .from("package_purchases")
      .select(`
        *,
        business_packages (
          id,
          title,
          description,
          image_url,
          price_cents,
          currency,
          tenant_id,
          package_items (*)
        )
      `)
      .eq("id", purchase_id)
      .single();

    logStep("Verification complete", { purchase_id });

    return new Response(JSON.stringify({ success: true, purchase: updatedPurchase }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
