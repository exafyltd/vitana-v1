import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

/**
 * Handle reseller attribution when a ticket is purchased via a reseller link
 */
async function handleResellerAttribution(
  supabaseClient: any,
  purchaseId: string,
  eventId: string,
  totalAmount: number,
  sessionMetadata: Record<string, any>
) {
  const utmSource = sessionMetadata?.utm_source || "";
  const resellerCode = sessionMetadata?.reseller_code || "";

  // Guard: Skip if no reseller info
  if (!utmSource.startsWith("reseller_") && !resellerCode) {
    console.log("[RESELLER-ATTRIBUTION] No reseller attribution needed for purchase:", purchaseId);
    return;
  }

  const cleanResellerCode = resellerCode || utmSource.replace("reseller_", "");
  if (!cleanResellerCode) {
    console.log("[RESELLER-ATTRIBUTION] Could not extract reseller code");
    return;
  }

  console.log("[RESELLER-ATTRIBUTION] Processing attribution for reseller:", cleanResellerCode);

  try {
    // 1) Lookup reseller profile by reseller_code
    const { data: resellerProfile, error: resellerError } = await supabaseClient
      .from("reseller_profiles")
      .select("id, commission_rate, tenant_id, user_id")
      .eq("reseller_code", cleanResellerCode)
      .eq("status", "active")
      .maybeSingle();

    if (resellerError || !resellerProfile) {
      console.warn("[RESELLER-ATTRIBUTION] No active reseller profile found for code:", cleanResellerCode, resellerError);
      return;
    }

    console.log("[RESELLER-ATTRIBUTION] Found reseller profile:", resellerProfile.id);

    // 2) Get event's default commission rate
    const { data: eventData, error: eventError } = await supabaseClient
      .from("global_community_events")
      .select("id, default_reseller_commission_rate")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.warn("[RESELLER-ATTRIBUTION] Error fetching event:", eventError);
    }

    // 3) Determine commission rate (event default → reseller default → 0)
    const commissionRate =
      eventData?.default_reseller_commission_rate ??
      resellerProfile.commission_rate ??
      0;

    if (!commissionRate || commissionRate <= 0) {
      console.log("[RESELLER-ATTRIBUTION] No commission rate configured, skipping attribution");
      return;
    }

    const saleAmount = Number(totalAmount);
    if (!saleAmount || saleAmount <= 0) {
      console.log("[RESELLER-ATTRIBUTION] Invalid sale amount:", saleAmount);
      return;
    }

    const commissionAmount = +(saleAmount * (commissionRate / 100)).toFixed(2);

    console.log("[RESELLER-ATTRIBUTION] Calculated attribution:", {
      saleAmount,
      commissionRate,
      commissionAmount,
    });

    // 4) Create attribution record
    const { error: insertError } = await supabaseClient
      .from("reseller_attributions")
      .insert({
        reseller_id: resellerProfile.id,
        ticket_purchase_id: purchaseId,
        event_id: eventId,
        sale_amount: saleAmount,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        status: "pending",
        utm_source: utmSource || null,
        utm_medium: sessionMetadata?.utm_medium || null,
        utm_campaign: sessionMetadata?.utm_campaign || null,
      });

    if (insertError) {
      // Check if it's a duplicate (unique constraint on ticket_purchase_id)
      if (insertError.code === "23505") {
        console.log("[RESELLER-ATTRIBUTION] Attribution already exists for purchase:", purchaseId);
      } else {
        console.error("[RESELLER-ATTRIBUTION] Error inserting attribution:", insertError);
      }
      return;
    }

    console.log("[RESELLER-ATTRIBUTION] Successfully created attribution:", {
      resellerCode: cleanResellerCode,
      resellerId: resellerProfile.id,
      purchaseId,
      saleAmount,
      commissionAmount,
      commissionRate,
    });

  } catch (err) {
    console.error("[RESELLER-ATTRIBUTION] Unexpected error:", err);
  }
}

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  
  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature provided' }),
      { status: 400 }
    );
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log('Webhook event received:', event.type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      
      console.log('Processing completed session:', session.id, 'metadata:', meta);

      // Check the type of checkout
      const checkoutType = meta.type;
      const bookingType = meta.booking_type;
      
      // Handle EVENT TICKET purchases
      if (checkoutType === 'event_ticket') {
        const purchaseId = meta.purchase_id;
        const ticketTypeId = meta.ticket_type_id;
        const eventId = meta.event_id;
        const quantity = parseInt(meta.quantity || '1');
        
        if (purchaseId) {
          console.log('Processing ticket purchase:', purchaseId);
          
          // Update ticket purchase status to completed
          const { error: purchaseError } = await supabaseClient
            .from('event_ticket_purchases')
            .update({
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent as string,
              metadata: {
                stripe_session_id: session.id,
                payment_completed_at: new Date().toISOString(),
                // Preserve UTM/reseller info
                utm_source: meta.utm_source || null,
                utm_medium: meta.utm_medium || null,
                utm_campaign: meta.utm_campaign || null,
                reseller_code: meta.reseller_code || null,
              }
            })
            .eq('id', purchaseId);

          if (purchaseError) {
            console.error('Error updating ticket purchase status:', purchaseError);
          } else {
            console.log('Ticket purchase completed:', purchaseId);
            
            // Get the purchase total_amount for attribution
            const { data: purchaseData } = await supabaseClient
              .from('event_ticket_purchases')
              .select('total_amount')
              .eq('id', purchaseId)
              .single();

            // Handle reseller attribution if applicable
            if (purchaseData && eventId) {
              await handleResellerAttribution(
                supabaseClient,
                purchaseId,
                eventId,
                purchaseData.total_amount,
                meta
              );
            }
            
            // Update quantity_sold on the ticket type
            if (ticketTypeId) {
              const { error: updateError } = await supabaseClient
                .rpc('increment_ticket_sold', { 
                  p_ticket_type_id: ticketTypeId, 
                  p_quantity: quantity 
                });
              
              // Fallback if RPC doesn't exist - direct update
              if (updateError) {
                console.log('RPC not found, using direct update');
                const { data: ticketType } = await supabaseClient
                  .from('event_ticket_types')
                  .select('quantity_sold')
                  .eq('id', ticketTypeId)
                  .single();
                
                if (ticketType) {
                  await supabaseClient
                    .from('event_ticket_types')
                    .update({ quantity_sold: ticketType.quantity_sold + quantity })
                    .eq('id', ticketTypeId);
                }
              }
            }
          }
        }
      }
      // Handle PROVIDER APPOINTMENT bookings
      else if (bookingType === 'provider_appointment') {
        const appointmentId = meta.appointment_id;
        
        if (appointmentId) {
          console.log('Processing provider appointment booking:', appointmentId);
          
          const { error: appointmentError } = await supabaseClient
            .from('provider_appointments')
            .update({
              status: 'scheduled',
              payment_intent_id: session.payment_intent as string,
              metadata: {
                stripe_session_id: session.id,
                payment_completed_at: new Date().toISOString(),
              }
            })
            .eq('id', appointmentId);

          if (appointmentError) {
            console.error('Error updating appointment status:', appointmentError);
          } else {
            console.log('Appointment status updated to scheduled:', appointmentId);
          }
        }
      }
      // Handle CART checkout (existing logic)
      else {
        // Update checkout session status
        const { error: updateError } = await supabaseClient
          .from('checkout_sessions')
          .update({
            status: 'completed',
            payment_intent_id: session.payment_intent as string,
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id);

        if (updateError) {
          console.error('Error updating checkout session:', updateError);
          throw updateError;
        }

        // Clear user's cart
        const { data: checkoutSession } = await supabaseClient
          .from('checkout_sessions')
          .select('user_id, id')
          .eq('stripe_session_id', session.id)
          .single();

        if (checkoutSession) {
          // Create CJ order in background for products from CJDropshipping
          EdgeRuntime.waitUntil(
            (async () => {
              try {
                console.log('Creating CJ order for checkout:', checkoutSession.id);
                
                const response = await fetch(
                  `${Deno.env.get('SUPABASE_URL')}/functions/v1/cj-create-order`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      checkoutSessionId: checkoutSession.id,
                    }),
                  }
                );

                if (!response.ok) {
                  const error = await response.json();
                  console.error('Failed to create CJ order:', error);
                } else {
                  const result = await response.json();
                  console.log('CJ order created successfully:', result);
                }
              } catch (error) {
                console.error('Error creating CJ order:', error);
              }
            })()
          );

          // Clear cart
          const { error: deleteError } = await supabaseClient
            .from('cart_items')
            .delete()
            .eq('user_id', checkoutSession.user_id);

          if (deleteError) {
            console.error('Error clearing cart:', deleteError);
          } else {
            console.log('Cart cleared for user:', checkoutSession.user_id);
          }
        }
      }
    }

    // Handle other events as needed
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const { error: updateError } = await supabaseClient
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('stripe_session_id', session.id);

      if (updateError) {
        console.error('Error updating expired session:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
