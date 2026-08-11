import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY (post-audit hardening): staff-review gate for reseller payouts.
// create-reseller-payout lets a reseller self-request a payout for their own
// unpaid attributions (status='pending'); credit-reseller-payout now only
// credits payouts in status='approved'. This function is the only way to
// make that transition — it requires the caller to be an exafy_admin.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (caller.app_metadata?.exafy_admin !== true) {
      console.error(`Forbidden: User ${caller.email} attempted to approve a reseller payout without exafy_admin`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Exafy admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payout_id, notes } = await req.json();

    if (!payout_id) {
      return new Response(
        JSON.stringify({ error: "payout_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: payout, error: payoutError } = await supabase
      .from("reseller_payouts")
      .select("id, status")
      .eq("id", payout_id)
      .single();

    if (payoutError || !payout) {
      return new Response(
        JSON.stringify({ error: "Payout not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payout.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Cannot approve payout with status: ${payout.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("reseller_payouts")
      .update({ status: "approved", notes: notes ?? null })
      .eq("id", payout_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error approving payout:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to approve payout" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payout ${payout_id} approved by admin ${caller.email}`);

    return new Response(
      JSON.stringify({ payout: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in approve-reseller-payout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
