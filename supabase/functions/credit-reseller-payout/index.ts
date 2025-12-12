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

    // Check payout status
    if (payout.status === "paid_to_wallet") {
      return new Response(
        JSON.stringify({ error: "Payout already credited to wallet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payout.status === "rejected") {
      return new Response(
        JSON.stringify({ error: "Payout was rejected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = resellerProfile.user_id;
    const amount = Number(payout.total_commission_amount);

    console.log(`Crediting €${amount} to wallet for user ${userId}`);

    // Create wallet transaction
    const { data: walletTx, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        to_user_id: userId,
        from_user_id: userId, // Self-credit for commission
        amount: amount,
        transaction_type: "reseller_commission",
        from_currency: payout.currency,
        to_currency: payout.currency,
        status: "completed",
        metadata: {
          source: "sell_and_earn",
          payout_id: payout.id,
          reseller_profile_id: payout.reseller_profile_id,
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

    // Update user's wallet balance
    const { data: existingWallet } = await supabase
      .from("user_wallets")
      .select("balance")
      .eq("user_id", userId)
      .eq("currency_type", payout.currency)
      .single();

    if (existingWallet) {
      // Update existing balance
      const { error: balanceError } = await supabase
        .from("user_wallets")
        .update({ 
          balance: (Number(existingWallet.balance) || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("currency_type", payout.currency);

      if (balanceError) {
        console.error("Error updating wallet balance:", balanceError);
      }
    } else {
      // Create new wallet entry
      const { error: createError } = await supabase
        .from("user_wallets")
        .insert({
          user_id: userId,
          currency_type: payout.currency,
          balance: amount,
        });

      if (createError) {
        console.error("Error creating wallet:", createError);
      }
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

    console.log(`Successfully credited €${amount} to wallet, tx: ${walletTx.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet_transaction: walletTx,
        new_balance: (Number(existingWallet?.balance) || 0) + amount,
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
