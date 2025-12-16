import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PACKAGE-CHECKOUT] ${step}${detailsStr}`);
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

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

    // Parse request body
    const { 
      package_id, 
      buyer_email, 
      buyer_name,
    } = await req.json();
    
    logStep("Request received", { package_id });

    if (!package_id) {
      throw new Error("Missing required field: package_id");
    }

    // Use provided buyer info or authenticated user info
    const finalBuyerEmail = buyer_email || buyerEmail;
    const finalBuyerName = buyer_name || buyerName;

    if (!finalBuyerEmail) {
      throw new Error("Buyer email is required");
    }

    // Fetch package details with items
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("business_packages")
      .select(`
        *,
        items:package_items(*)
      `)
      .eq("id", package_id)
      .single();

    if (pkgError || !pkg) {
      logStep("Package not found", { error: pkgError });
      throw new Error("Package not found");
    }

    if (pkg.status !== 'published') {
      throw new Error("This package is not available for purchase");
    }

    logStep("Package found", { title: pkg.title, price_cents: pkg.price_cents });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: finalBuyerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://vitana.app";

    // Determine checkout mode based on package type
    const isSubscription = pkg.package_type === 'subscription';
    
    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("package_purchases")
      .insert({
        package_id: pkg.id,
        buyer_id: user?.id || null,
        buyer_email: finalBuyerEmail,
        buyer_name: finalBuyerName,
        amount_paid_cents: pkg.price_cents,
        currency: pkg.currency,
        status: "pending",
        payment_method: "stripe",
        metadata: {
          package_title: pkg.title,
          package_type: pkg.package_type,
          items_count: pkg.items?.length || 0,
        }
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Failed to create purchase record", { error: purchaseError });
      throw new Error("Failed to create purchase record");
    }

    logStep("Purchase record created", { purchaseId: purchase.id });

    // Build line item description from included items
    const itemDescriptions = (pkg.items || [])
      .map((item: any) => `${item.quantity}x ${item.item_title}`)
      .join(', ');

    // Create Stripe Checkout session
    let session;
    
    if (isSubscription) {
      // For subscriptions, we need to create a price first or use price_data
      const billingIntervalMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
        'weekly': 'week',
        'monthly': 'month',
        'quarterly': 'month', // Will set interval_count to 3
        'yearly': 'year',
      };
      
      const interval = billingIntervalMap[pkg.billing_interval || 'monthly'] || 'month';
      const intervalCount = pkg.billing_interval === 'quarterly' ? 3 : 1;

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : finalBuyerEmail,
        line_items: [
          {
            price_data: {
              currency: pkg.currency.toLowerCase(),
              product_data: {
                name: pkg.title,
                description: itemDescriptions || pkg.description || `Subscription package`,
                images: pkg.image_url ? [pkg.image_url] : [],
              },
              unit_amount: pkg.price_cents,
              recurring: {
                interval,
                interval_count: intervalCount,
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${origin}/packages/success?purchase_id=${purchase.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/business/services?cancelled=true`,
        metadata: {
          purchase_id: purchase.id,
          package_id: pkg.id,
          type: "package_subscription",
        },
      });
    } else {
      // One-time payment for bundles and programs
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : finalBuyerEmail,
        line_items: [
          {
            price_data: {
              currency: pkg.currency.toLowerCase(),
              product_data: {
                name: pkg.title,
                description: itemDescriptions || pkg.description || `Package includes ${pkg.items?.length || 0} items`,
                images: pkg.image_url ? [pkg.image_url] : [],
              },
              unit_amount: pkg.price_cents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/packages/success?purchase_id=${purchase.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/business/services?cancelled=true`,
        metadata: {
          purchase_id: purchase.id,
          package_id: pkg.id,
          type: "package_purchase",
        },
      });
    }

    logStep("Stripe session created", { sessionId: session.id, mode: isSubscription ? 'subscription' : 'payment' });

    // Update purchase with stripe session id
    await supabaseAdmin
      .from("package_purchases")
      .update({ 
        stripe_session_id: session.id,
        metadata: {
          ...purchase.metadata,
          stripe_mode: isSubscription ? 'subscription' : 'payment',
        }
      })
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
