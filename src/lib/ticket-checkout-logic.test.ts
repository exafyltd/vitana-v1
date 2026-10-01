// VTID-04757: event-ticket purchase hardening — pure logic + source contracts.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_TICKETS_PER_PURCHASE,
  RESERVATION_MINUTES,
  STRIPE_SESSION_MINUTES,
  isFreePurchase,
  payableMinorUnits,
  toMinorUnits,
  validateQuantity,
} from '../../supabase/functions/_shared/ticket-checkout-logic';

const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

describe('toMinorUnits', () => {
  it('multiplies by 100 for decimal currencies', () => {
    expect(toMinorUnits(99, 'EUR')).toBe(9900);
    expect(toMinorUnits(12.5, 'usd')).toBe(1250);
  });
  it('does not multiply zero-decimal currencies (JPY was charged 100x)', () => {
    expect(toMinorUnits(5000, 'JPY')).toBe(5000);
    expect(toMinorUnits(5000, 'jpy')).toBe(5000);
  });
  it('rounds float noise', () => {
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999);
  });
});

describe('validateQuantity', () => {
  it('accepts whole numbers 1..max', () => {
    expect(validateQuantity(1)).toBe(1);
    expect(validateQuantity('3')).toBe(3);
    expect(validateQuantity(MAX_TICKETS_PER_PURCHASE)).toBe(MAX_TICKETS_PER_PURCHASE);
  });
  it.each([0, -1, 1.5, 11, 'abc', null, undefined, NaN])('rejects %p', (bad) => {
    expect(() => validateQuantity(bad)).toThrow();
  });
});

describe('payable amount and the free path', () => {
  it('applies a percent discount like the Stripe coupon', () => {
    expect(payableMinorUnits(100, 'EUR', 2, 25)).toBe(15000);
  });
  it('treats a free ticket type as free (Stripe rejects a zero total)', () => {
    expect(isFreePurchase(payableMinorUnits(0, 'EUR', 3, null))).toBe(true);
  });
  it('treats a 100% discount as free', () => {
    expect(isFreePurchase(payableMinorUnits(99, 'EUR', 1, 100))).toBe(true);
  });
  it('does not treat a paid ticket as free', () => {
    expect(isFreePurchase(payableMinorUnits(99, 'EUR', 1, null))).toBe(false);
  });
  it('clamps out-of-range discounts', () => {
    expect(payableMinorUnits(10, 'EUR', 1, 150)).toBe(0);
    expect(payableMinorUnits(10, 'EUR', 1, -20)).toBe(1000);
  });
});

describe('reservation timing', () => {
  it('holds the seat at least as long as the Stripe session lives', () => {
    expect(STRIPE_SESSION_MINUTES).toBeGreaterThanOrEqual(30); // Stripe minimum
    expect(RESERVATION_MINUTES).toBeGreaterThan(STRIPE_SESSION_MINUTES);
  });
});

describe('source contracts', () => {
  const webhook = read('supabase/functions/stripe-webhook/index.ts');
  const checkout = read('supabase/functions/stripe-create-ticket-checkout/index.ts');
  const success = read('src/pages/TicketPurchaseSuccess.tsx');
  const migration = read('supabase/migrations/20261001120000_vtid_04757_ticket_purchase_hardening.sql');

  it('webhook no longer increments quantity_sold itself (the trigger owns it)', () => {
    expect(webhook).not.toContain('increment_ticket_sold');
    expect(webhook).not.toMatch(/quantity_sold\s*:/);
  });
  it('webhook completes tickets through the idempotent RPC and only when paid', () => {
    expect(webhook).toContain("rpc('complete_ticket_purchase'");
    expect(webhook).toContain("payment_status !== 'paid'");
  });
  it('webhook releases reservations on expiry and returns seats on full refund', () => {
    expect(webhook).toContain("rpc('release_ticket_reservation'");
    expect(webhook).toContain("event.type === 'charge.refunded'");
    expect(webhook).toContain("rpc('refund_ticket_purchase'");
  });
  it('checkout reserves atomically, supports free tickets, and cleans up a failed Stripe session', () => {
    expect(checkout).toContain('"reserve_event_tickets"');
    expect(checkout).toContain('isFreePurchase(');
    expect(checkout).toMatch(/release_ticket_reservation[\s\S]*throw stripeError/);
    expect(checkout).toContain('expires_at:');
  });
  it('free path claims the discount atomically before completing, and never needs Stripe', () => {
    const free = checkout.slice(checkout.indexOf('if (isFreePurchase('), checkout.indexOf('Free ticket issued'));
    expect(free.indexOf('.select("id")')).toBeGreaterThan(-1);
    expect(free.indexOf('.is("used_at", null)')).toBeLessThan(free.indexOf('"complete_ticket_purchase"'));
    expect(free).not.toMatch(/stripe\./i);
    // Stripe is only initialised after the free branch has returned.
    expect(checkout.indexOf('new Stripe(')).toBeGreaterThan(checkout.indexOf('Free ticket issued'));
    expect(checkout.indexOf('STRIPE_SECRET_KEY')).toBeGreaterThan(checkout.indexOf('Free ticket issued'));
  });
  it('the success page never completes a purchase from the browser', () => {
    expect(success).not.toMatch(/\.update\(/);
    expect(success).not.toContain('"completed",\n          stripe_session_id');
    expect(success).toContain('purchase.status !== "completed"');
  });
  it('migration keeps the RPCs server-side only', () => {
    for (const fn of ['reserve_event_tickets', 'complete_ticket_purchase', 'release_ticket_reservation', 'refund_ticket_purchase']) {
      expect(migration).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role`));
      expect(migration).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`));
    }
  });
});
