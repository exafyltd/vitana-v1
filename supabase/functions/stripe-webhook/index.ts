import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

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
      
      console.log('Processing completed session:', session.id);

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
        .select('user_id')
        .eq('stripe_session_id', session.id)
        .single();

      if (checkoutSession) {
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
