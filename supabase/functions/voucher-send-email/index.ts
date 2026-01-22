import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

/**
 * Self-healing: Check Stripe and update order if payment is complete but order is still pending
 */
async function selfHealPendingOrder(
  supabaseAdmin: any,
  order: any,
  stripeSecretKey: string
): Promise<{ healed: boolean; error?: string }> {
  console.log(`[voucher-send-email] Self-healing check for order ${order.id}, status: ${order.status}`);
  
  if (order.status === "paid") {
    return { healed: false }; // Already paid, no healing needed
  }
  
  if (!order.checkout_session_id) {
    console.log(`[voucher-send-email] No checkout_session_id, cannot self-heal`);
    return { healed: false, error: "Order has no checkout session. Please contact support." };
  }
  
  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    
    console.log(`[voucher-send-email] Retrieving Stripe session: ${order.checkout_session_id}`);
    const session = await stripe.checkout.sessions.retrieve(order.checkout_session_id);
    
    console.log(`[voucher-send-email] Stripe session payment_status: ${session.payment_status}`);
    
    if (session.payment_status === "paid") {
      console.log(`[voucher-send-email] Payment confirmed! Updating order to paid...`);
      
      // Update voucher_orders to paid
      const { error: orderError } = await supabaseAdmin
        .from("voucher_orders")
        .update({
          status: "paid",
          payment_intent_id: session.payment_intent as string,
        })
        .eq("id", order.id);
      
      if (orderError) {
        console.error(`[voucher-send-email] Error updating order:`, orderError);
        return { healed: false, error: "Failed to update order status" };
      }
      
      // Activate the voucher if exists
      if (order.voucher_id) {
        const { error: voucherError } = await supabaseAdmin
          .from("vouchers")
          .update({ status: "active" })
          .eq("id", order.voucher_id);
        
        if (voucherError) {
          console.error(`[voucher-send-email] Error activating voucher:`, voucherError);
        } else {
          console.log(`[voucher-send-email] Voucher ${order.voucher_id} activated`);
        }
      }
      
      console.log(`[voucher-send-email] Self-healing complete for order ${order.id}`);
      return { healed: true };
    } else {
      console.log(`[voucher-send-email] Payment not completed: ${session.payment_status}`);
      return { healed: false, error: "Payment not yet completed. Please wait or contact support." };
    }
  } catch (stripeError: any) {
    console.error(`[voucher-send-email] Stripe error during self-heal:`, stripeError);
    return { healed: false, error: `Unable to verify payment: ${stripeError.message}` };
  }
}

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
        JSON.stringify({ error: "Email service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("[voucher-send-email] STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
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

    // Fetch voucher order (use admin to ensure we get the data)
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
      console.error("[voucher-send-email] Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[voucher-send-email] Order found: status=${order.status}, checkout_session_id=${order.checkout_session_id}`);

    // Self-healing: If order is pending but has checkout_session_id, check Stripe
    if (order.status !== "paid") {
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
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, full_name")
      .eq("user_id", user.id)
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
      <img src="https://vitana-v1.lovable.app/images/maxina-logo.png" alt="MAXINA" style="height: 64px; width: auto;" />
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
      from: "Vitana Gifts <noreply@vitanaland.com>",
      to: [recipientEmail],
      subject: `🎁 ${senderName} sent you a Vitana wellness voucher!`,
      html,
    });

    console.log("[voucher-send-email] Email sent:", emailResult);

    // Update order with sent info
    await supabaseAdmin
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

  } catch (error: any) {
    console.error("[voucher-send-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
