import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_DETAILS = {
  test: {
    name: "Test Voucher",
    color: "#10b981",
    benefits: ["Payment flow test only", "Not a real voucher", "For development testing"],
  },
  experience: {
    name: "Experience Voucher",
    color: "#8b5cf6",
    benefits: [
      "1 premium community event access",
      "Personalized wellness consultation",
      "30-day Vitana+ trial included",
      "Beautifully designed e-voucher",
    ],
  },
  exclusive: {
    name: "Exclusive Voucher",
    color: "#f59e0b",
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[voucher-send-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
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
      console.error("[voucher-send-email] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { orderId, recipientEmail, recipientName, message } = await req.json();
    
    if (!orderId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing orderId or recipientEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[voucher-send-email] Sending voucher ${orderId} to ${recipientEmail}`);

    // Fetch voucher order
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
      console.error("[voucher-send-email] Order fetch error:", orderError);
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
    const voucherCode = order.voucher?.code || order.id.slice(0, 8).toUpperCase();
    const price = `€${(order.amount_cents / 100).toFixed(2)}`;
    
    const expiresAt = order.voucher?.expires_at 
      ? new Date(order.voucher.expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "1 year from purchase";

    // Get sender's name from profile or email
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const senderName = profile?.display_name || profile?.full_name || user.email?.split("@")[0] || "A friend";

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've received a Vitana gift voucher!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="https://vitana-v1.lovable.app/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png" alt="Vitana" style="height: 48px; width: auto;" />
    </div>

    <!-- Main Card -->
    <div style="background: linear-gradient(135deg, ${tierInfo.color}15 0%, ${tierInfo.color}05 100%); border-radius: 24px; padding: 40px; border: 1px solid ${tierInfo.color}30;">
      
      <!-- Gift Message -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎁</div>
        <h1 style="margin: 0 0 8px 0; color: #18181b; font-size: 28px; font-weight: 700;">
          You've received a gift!
        </h1>
        <p style="margin: 0; color: #71717a; font-size: 16px;">
          ${senderName} sent you a Vitana wellness voucher
        </p>
      </div>

      ${message ? `
      <!-- Personal Message -->
      <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${tierInfo.color};">
        <p style="margin: 0; color: #3f3f46; font-style: italic; line-height: 1.6;">
          "${message}"
        </p>
        <p style="margin: 16px 0 0 0; color: #71717a; font-size: 14px;">
          — ${senderName}
        </p>
      </div>
      ` : ""}

      <!-- Voucher Details -->
      <div style="background: white; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, ${tierInfo.color}, ${tierInfo.color}dd); color: white; padding: 8px 20px; border-radius: 100px; font-size: 14px; font-weight: 600; margin-bottom: 16px;">
          ${tierInfo.name}
        </div>
        
        <div style="font-size: 36px; font-weight: 700; color: #18181b; margin-bottom: 8px;">
          ${price}
        </div>
        
        <div style="color: #71717a; font-size: 14px; margin-bottom: 24px;">
          Valid until ${expiresAt}
        </div>

        <!-- Voucher Code -->
        <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <div style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            Your Voucher Code
          </div>
          <div style="font-family: monospace; font-size: 24px; font-weight: 700; color: #18181b; letter-spacing: 2px;">
            ${voucherCode}
          </div>
        </div>

        <!-- Benefits -->
        <div style="text-align: left;">
          <div style="color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            What's included
          </div>
          ${tierInfo.benefits.map(benefit => `
            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
              <span style="color: ${tierInfo.color}; margin-right: 8px;">✓</span>
              <span style="color: #3f3f46; font-size: 14px;">${benefit}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="https://vitana-v1.lovable.app/discover?redeem=${voucherCode}" 
           style="display: inline-block; background: linear-gradient(135deg, ${tierInfo.color}, ${tierInfo.color}dd); color: white; text-decoration: none; padding: 16px 40px; border-radius: 100px; font-weight: 600; font-size: 16px;">
          Redeem Your Voucher
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        This voucher was sent via Vitana by ${senderName}
      </p>
      <p style="margin: 0;">
        Questions? Contact us at hello@vitana.app
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const recipientDisplayName = recipientName || recipientEmail.split("@")[0];
    
    const emailResult = await resend.emails.send({
      from: "Vitana Gifts <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `🎁 ${senderName} sent you a Vitana wellness voucher!`,
      html,
    });

    console.log("[voucher-send-email] Email sent:", emailResult);

    // Update order with sent info
    await supabase
      .from("voucher_orders")
      .update({
        metadata: {
          ...((order.metadata as object) || {}),
          email_sent_to: recipientEmail,
          email_sent_at: new Date().toISOString(),
          recipient_name: recipientName,
        },
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Voucher sent to ${recipientEmail}`,
        emailId: emailResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[voucher-send-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
