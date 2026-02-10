/**
 * Stripe Elements Provider
 * VTID-01230: Wraps app with Stripe context for payment processing
 */

import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY not set in environment');
}

// Initialize Stripe
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface StripeProviderProps {
  children: React.ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  if (!stripePromise) {
    // Stripe not configured - render children without Elements wrapper
    console.warn('[Stripe] Stripe not initialized - payments will not work');
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}
