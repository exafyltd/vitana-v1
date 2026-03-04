import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-TICKET-CHECKOUT] ${step}${detailsStr}`);
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
      quantity, 
      buyer_email, 
      buyer_name,
      discount_code,
      utm_source,
      utm_medium,
      utm_campaign 
    } = await req.json();
    
    logStep("Request received", { event_id, ticket_type_id, quantity, discount_code, utm_source, utm_medium, utm_campaign });

    if (!event_id || !ticket_type_id || !quantity) {
      throw new Error("Missing required fields: event_id, ticket_type_id, quantity");
    }

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

    // Fetch ticket type and event details
    const { data: ticketType, error: ticketError } = await supabaseAdmin
      .from("event_ticket_types")
      .select(`
        *,
        event:global_community_events(id, title, start_time, location, image_url, created_by)
      `)
      .eq("id", ticket_type_id)
      .single();

    if (ticketError || !ticketType) {
      logStep("Ticket type not found", { error: ticketError });
      throw new Error("Ticket type not found");
    }

    logStep("Ticket type found", { name: ticketType.name, price: ticketType.price });

    // Check availability
    const availableQuantity = ticketType.quantity_available - ticketType.quantity_sold;
    if (quantity > availableQuantity) {
      throw new Error(`Only ${availableQuantity} tickets available`);
    }

    // Check sale dates
    const now = new Date();
    if (ticketType.sale_start_date && new Date(ticketType.sale_start_date) > now) {
      throw new Error("Ticket sales have not started yet");
    }
    if (ticketType.sale_end_date && new Date(ticketType.sale_end_date) < now) {
      throw new Error("Ticket sales have ended");
    }

    // Generate unique QR code token
    const qrCodeToken = crypto.randomUUID() + "-" + Date.now().toString(36);

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: finalBuyerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const unitAmount = Math.round(ticketType.price * 100); // Convert to cents
    const totalAmount = unitAmount * quantity;

    // Validate discount code if provided
    let validatedDiscount: any = null;
    let stripeCouponId: string | undefined;
    if (discount_code) {
      logStep("Validating discount code", { discount_code });
      const { data: discountData, error: discountError } = await supabaseAdmin
        .from("user_discount_codes")
        .select("*")
        .eq("code", discount_code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

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

      // Create or find a Stripe coupon for this discount
      const couponName = `MAXINA-${discountData.discount_percent}PCT`;
      try {
        // Try to retrieve existing coupon
        const existingCoupons = await stripe.coupons.list({ limit: 100 });
        const existing = existingCoupons.data.find(c => c.name === couponName && c.percent_off === discountData.discount_percent);
        if (existing) {
          stripeCouponId = existing.id;
        } else {
          const coupon = await stripe.coupons.create({
            percent_off: discountData.discount_percent,
            duration: 'once',
            name: couponName,
          });
          stripeCouponId = coupon.id;
        }
        logStep("Stripe coupon ready", { couponId: stripeCouponId });
      } catch (couponError: any) {
        logStep("Error creating coupon", { error: couponError.message });
        throw new Error("Failed to apply discount");
      }
    }

    // Create pending purchase record with UTM/reseller metadata
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("event_ticket_purchases")
      .insert({
        event_id,
        ticket_type_id,
        buyer_id: user?.id || null,
        buyer_email: finalBuyerEmail,
        buyer_name: finalBuyerName,
        quantity,
        unit_price: ticketType.price,
        total_amount: ticketType.price * quantity,
        currency: ticketType.currency,
        status: "pending",
        qr_code_token: qrCodeToken,
        ticket_number: "", // Will be auto-generated by trigger
        metadata: {
          event_title: ticketType.event.title,
          ticket_type_name: ticketType.name,
          // Store UTM params for attribution
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          reseller_code: resellerCode || null,
        }
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Failed to create purchase record", { error: purchaseError });
      throw new Error("Failed to create purchase record");
    }

    logStep("Purchase record created", { purchaseId: purchase.id });

    const origin = req.headers.get("origin") || "https://vitana.app";

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

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Stripe session created", { sessionId: session.id });

    // Update purchase with stripe session id
    await supabaseAdmin
      .from("event_ticket_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

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
