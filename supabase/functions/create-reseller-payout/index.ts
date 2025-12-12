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

    const { reseller_profile_id, mode = "all_unpaid" } = await req.json();

    if (!reseller_profile_id) {
      return new Response(
        JSON.stringify({ error: "reseller_profile_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this reseller profile
    const { data: profile, error: profileError } = await supabase
      .from("reseller_profiles")
      .select("id, user_id")
      .eq("id", reseller_profile_id)
      .single();

    if (profileError || !profile || profile.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Reseller profile not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all unpaid attributions for this reseller
    const { data: attributions, error: attrError } = await supabase
      .from("reseller_attributions")
      .select("id, commission_amount")
      .eq("reseller_id", reseller_profile_id)
      .is("payout_id", null);

    if (attrError) {
      console.error("Error fetching attributions:", attrError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch attributions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!attributions || attributions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No unpaid commissions to payout", payout: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total commission
    const totalCommission = attributions.reduce(
      (sum, attr) => sum + (Number(attr.commission_amount) || 0),
      0
    );

    console.log(`Creating payout for ${attributions.length} attributions, total: €${totalCommission}`);

    // Create the payout record
    const { data: payout, error: payoutError } = await supabase
      .from("reseller_payouts")
      .insert({
        reseller_profile_id,
        total_commission_amount: totalCommission,
        currency: "EUR",
        status: "pending",
      })
      .select()
      .single();

    if (payoutError) {
      console.error("Error creating payout:", payoutError);
      return new Response(
        JSON.stringify({ error: "Failed to create payout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update all attributions to link to this payout
    const attributionIds = attributions.map((a) => a.id);
    const { error: updateError } = await supabase
      .from("reseller_attributions")
      .update({ payout_id: payout.id })
      .in("id", attributionIds);

    if (updateError) {
      console.error("Error updating attributions:", updateError);
      // Rollback: delete the payout
      await supabase.from("reseller_payouts").delete().eq("id", payout.id);
      return new Response(
        JSON.stringify({ error: "Failed to update attributions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payout ${payout.id} created successfully for €${totalCommission}`);

    return new Response(
      JSON.stringify({
        payout,
        attributions_count: attributions.length,
        total_commission: totalCommission,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-reseller-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
