import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payout_id } = await req.json();

    if (!payout_id) {
      return new Response(
        JSON.stringify({ error: "payout_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load the payout with reseller profile info
    const { data: payout, error: payoutError } = await supabase
      .from("reseller_payouts")
      .select(`
        id,
        reseller_profile_id,
        total_commission_amount,
        currency,
        status,
        wallet_transaction_id,
        reseller_profiles:reseller_profile_id (
          user_id
        )
      `)
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      console.error("Error loading payout:", payoutError);
      return new Response(
        JSON.stringify({ error: "Payout not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership
    const resellerProfile = payout.reseller_profiles as any;
    if (!resellerProfile || resellerProfile.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDEMPOTENCY CHECK: If already credited, return success with existing transaction
    if (payout.wallet_transaction_id) {
      console.log(`Payout ${payout_id} already credited, returning existing tx: ${payout.wallet_transaction_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          already_credited: true,
          wallet_transaction_id: payout.wallet_transaction_id,
          message: "Payout was already credited to wallet"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY (post-audit hardening): only 'approved' payouts may be credited.
    // Previously also accepted 'pending' — since create-reseller-payout lets a
    // reseller self-request a payout (status='pending') for their own
    // attributions with no staff review, that meant a reseller could
    // self-request-and-self-credit real wallet money in one round trip with
    // zero oversight. A payout must now be explicitly flipped to 'approved'
    // by an exafy_admin via approve-reseller-payout before it can be credited.
    if (payout.status !== "approved") {
      return new Response(
        JSON.stringify({ error: `Cannot credit payout with status: ${payout.status}. Payout must be approved by an admin first.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = resellerProfile.user_id;
    const amount = Number(payout.total_commission_amount);

    console.log(`Crediting €${amount} to wallet for user ${userId}`);

    // Count attributions for this payout
    const { count: attributionCount } = await supabase
      .from("reseller_attributions")
      .select("id", { count: "exact", head: true })
      .eq("payout_id", payout.id);

    // Create wallet transaction with correct semantics
    // from_user_id = null (platform credit, not from another user)
    const { data: walletTx, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        to_user_id: userId,
        from_user_id: null, // Platform credit - no sender
        amount: amount,
        transaction_type: "reseller_commission",
        from_currency: payout.currency,
        to_currency: payout.currency,
        status: "completed",
        metadata: {
          source: "sell_and_earn",
          payout_id: payout.id,
          reseller_profile_id: payout.reseller_profile_id,
          attribution_count: attributionCount || 0,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating wallet transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Failed to create wallet transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ATOMIC BALANCE UPDATE using RPC function
    const { data: newBalance, error: balanceError } = await supabase
      .rpc('increment_wallet_balance', {
        p_user_id: userId,
        p_currency_type: payout.currency,
        p_amount: amount
      });

    if (balanceError) {
      console.error("Error updating wallet balance:", balanceError);
      // Don't fail completely - the transaction was created
      // but log the error for investigation
    }

    // Update payout status
    const { error: updateError } = await supabase
      .from("reseller_payouts")
      .update({
        status: "paid_to_wallet",
        wallet_transaction_id: walletTx.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    if (updateError) {
      console.error("Error updating payout status:", updateError);
      // Don't fail - the wallet credit already happened
    }

    console.log(`Successfully credited €${amount} to wallet, tx: ${walletTx.id}, new balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet_transaction_id: walletTx.id,
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in credit-reseller-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
