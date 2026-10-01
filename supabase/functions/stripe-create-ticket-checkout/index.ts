import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  RESERVATION_MINUTES,
  STRIPE_SESSION_MINUTES,
  isFreePurchase,
  payableMinorUnits,
  toMinorUnits,
  validateQuantity,
} from "../_shared/ticket-checkout-logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-TICKET-CHECKOUT] ${step}${detailsStr}`);
};

// Map reserve_event_tickets exceptions to buyer-facing messages.
const reservationErrorMessage = (raw?: string): string => {
  if (!raw) return "Failed to create purchase record";
  const sold = raw.match(/INSUFFICIENT_TICKETS:(\d+)/);
  if (sold) return Number(sold[1]) > 0 ? `Only ${sold[1]} tickets available` : "Sold out";
  if (raw.includes("SALES_NOT_STARTED")) return "Ticket sales have not started yet";
  if (raw.includes("SALES_ENDED")) return "Ticket sales have ended";
  if (raw.includes("TICKET_TYPE_NOT_FOUND")) return "Ticket type not found";
  return "Failed to create purchase record";
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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let user = null;
    let buyerEmail = "";
    let buyerName = "";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      if (user?.email) {
        buyerEmail = user.email;
        buyerName = user.user_metadata?.full_name || user.email.split("@")[0];
      }
    }

    // Parse request body - including UTM params for reseller attribution
    const { 
      event_id, 
      ticket_type_id, 
      quantity: rawQuantity, 
      buyer_email, 
      buyer_name,
      discount_code,
      utm_source,
      utm_medium,
      utm_campaign 
    } = await req.json();
    
    logStep("Request received", { event_id, ticket_type_id, quantity: rawQuantity, discount_code, utm_source, utm_medium, utm_campaign });

    if (!event_id || !ticket_type_id || !rawQuantity) {
      throw new Error("Missing required fields: event_id, ticket_type_id, quantity");
    }
    const quantity = validateQuantity(rawQuantity);

    // Derive reseller code from utm_source if present
    let resellerCode: string | null = null;
    if (utm_source && utm_source.startsWith("reseller_")) {
      resellerCode = utm_source.replace("reseller_", "");
      logStep("Reseller code detected", { resellerCode });
    }

    // Use provided buyer info or authenticated user info
    const finalBuyerEmail = buyer_email || buyerEmail;
    const finalBuyerName = buyer_name || buyerName;

    if (!finalBuyerEmail) {
      throw new Error("Buyer email is required");
    }

    // Initialize Stripe early so we can parallelize
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parallelize independent calls: ticket type, Stripe customer, discount validation
    const [ticketTypeResult, customersResult, discountResult] = await Promise.all([
      supabaseAdmin
        .from("event_ticket_types")
        .select(`
          *,
          event:global_community_events(id, title, start_time, location, image_url, created_by)
        `)
        .eq("id", ticket_type_id)
        .single(),
      stripe.customers.list({ email: finalBuyerEmail, limit: 1 }),
      discount_code
        ? supabaseAdmin
            .from("user_discount_codes")
            .select("*")
            .eq("code", discount_code)
            .is("used_at", null)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const { data: ticketType, error: ticketError } = ticketTypeResult;

    if (ticketError || !ticketType) {
      logStep("Ticket type not found", { error: ticketError });
      throw new Error("Ticket type not found");
    }

    logStep("Ticket type found", { name: ticketType.name, price: ticketType.price });

    // Availability (sold + live reservations) and the sale window are enforced
    // atomically in reserve_event_tickets below, under a row lock on the ticket type.
    if (!ticketType.is_active || ticketType.event_id !== event_id) {
      throw new Error("Ticket type not found");
    }

    // Generate unique QR code token
    const qrCodeToken = crypto.randomUUID() + "-" + Date.now().toString(36);

    let customerId;
    if (customersResult.data.length > 0) {
      customerId = customersResult.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Stripe amounts are minor units; zero-decimal currencies (JPY, ...) are not x100.
    const unitAmount = toMinorUnits(ticketType.price, ticketType.currency);

    // Process discount result from parallel call
    let validatedDiscount: any = null;
    let stripeCouponId: string | undefined;
    if (discount_code) {
      const { data: discountData, error: discountError } = discountResult;
      logStep("Validating discount code", { discount_code });

      if (discountError || !discountData) {
        logStep("Invalid discount code", { error: discountError });
        throw new Error("Invalid or expired discount code");
      }

      // Verify code belongs to the authenticated user (if logged in)
      if (user && discountData.user_id !== user.id) {
        throw new Error("This discount code doesn't belong to you");
      }

      validatedDiscount = discountData;
      logStep("Discount code validated", { percent: discountData.discount_percent });

      // Use deterministic coupon ID for direct retrieval instead of listing all coupons
      const couponId = `maxina-${discountData.discount_percent}pct`;
      try {
        await stripe.coupons.retrieve(couponId);
        stripeCouponId = couponId;
      } catch {
        // Coupon doesn't exist, create it
        const coupon = await stripe.coupons.create({
          id: couponId,
          percent_off: discountData.discount_percent,
          duration: 'once',
          name: `MAXINA-${discountData.discount_percent}PCT`,
        });
        stripeCouponId = coupon.id;
      }
      logStep("Stripe coupon ready", { couponId: stripeCouponId });
    }

    // Atomically check availability and create the pending purchase, which also
    // holds a time-boxed reservation against the ticket type's capacity.
    const { data: purchase, error: purchaseError } = await supabaseAdmin.rpc("reserve_event_tickets", {
      p_event_id: event_id,
      p_ticket_type_id: ticket_type_id,
      p_buyer_id: user?.id || null,
      p_buyer_email: finalBuyerEmail,
      p_buyer_name: finalBuyerName,
      p_quantity: quantity,
      p_qr_code_token: qrCodeToken,
      p_reserve_minutes: RESERVATION_MINUTES,
      p_metadata: {
        event_title: ticketType.event.title,
        ticket_type_name: ticketType.name,
        // Store UTM params for attribution
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        reseller_code: resellerCode || null,
      },
    });

    if (purchaseError || !purchase) {
      logStep("Failed to reserve tickets", { error: purchaseError });
      throw new Error(reservationErrorMessage(purchaseError?.message));
    }

    logStep("Purchase reserved", { purchaseId: purchase.id });

    const origin = req.headers.get("origin") || "https://vitana.app";

    // Free ticket type or 100% discount: no card needed, and Stripe Checkout
    // rejects a zero total, so complete the purchase here.
    const payableMinor = payableMinorUnits(
      ticketType.price,
      ticketType.currency,
      quantity,
      validatedDiscount?.discount_percent,
    );
    if (isFreePurchase(payableMinor)) {
      const { error: completeError } = await supabaseAdmin.rpc("complete_ticket_purchase", {
        p_purchase_id: purchase.id,
        p_payment_intent_id: null,
        p_session_id: null,
        p_metadata: { free_ticket: true, discount_code: validatedDiscount?.code || null },
      });
      if (completeError) {
        await supabaseAdmin.rpc("release_ticket_reservation", { p_purchase_id: purchase.id, p_status: "cancelled" });
        throw new Error("Failed to issue free ticket");
      }
      if (validatedDiscount?.id) {
        await supabaseAdmin
          .from("user_discount_codes")
          .update({ used_at: new Date().toISOString(), used_on_purchase_id: purchase.id })
          .eq("id", validatedDiscount.id)
          .is("used_at", null);
      }
      logStep("Free ticket issued", { purchaseId: purchase.id });
      return new Response(
        JSON.stringify({
          free: true,
          url: `${origin}/tickets/success?purchase_id=${purchase.id}`,
          purchase_id: purchase.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Create Stripe Checkout session with UTM/reseller metadata for webhook
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : finalBuyerEmail,
      line_items: [
        {
          price_data: {
            currency: ticketType.currency.toLowerCase(),
            product_data: {
              name: `${ticketType.event.title} - ${ticketType.name}`,
              description: ticketType.description || `Ticket for ${ticketType.event.title}`,
              images: ticketType.event.image_url ? [ticketType.event.image_url] : [],
            },
            unit_amount: unitAmount,
          },
          quantity,
        },
      ],
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_MINUTES * 60,
      success_url: `${origin}/tickets/success?purchase_id=${purchase.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/comm/events-meetups?event=${event_id}&cancelled=true`,
      metadata: {
        purchase_id: purchase.id,
        event_id,
        ticket_type_id,
        type: "event_ticket",
        quantity: String(quantity),
        utm_source: utm_source || "",
        utm_medium: utm_medium || "",
        utm_campaign: utm_campaign || "",
        reseller_code: resellerCode || "",
        discount_code: validatedDiscount?.code || "",
        discount_code_id: validatedDiscount?.id || "",
      },
    };

    // Apply discount coupon if validated
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
      logStep("Applying discount to session", { couponId: stripeCouponId });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (stripeError) {
      // No session means nothing can ever complete this purchase: free the reservation.
      await supabaseAdmin.rpc("release_ticket_reservation", { p_purchase_id: purchase.id, p_status: "cancelled" });
      throw stripeError;
    }

    logStep("Stripe session created", { sessionId: session.id });

    // Awaited: an un-awaited write can be dropped when the isolate ends with the response.
    const { error: sessionLinkError } = await supabaseAdmin
      .from("event_ticket_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);
    if (sessionLinkError) logStep("Failed to store stripe_session_id", { error: sessionLinkError });

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        purchase_id: purchase.id
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
