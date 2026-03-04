

# Plan: Speed Up Stripe Ticket Checkout Edge Function

## Root Cause
The `stripe-create-ticket-checkout` edge function makes 7-8 sequential network calls (4 to Stripe, 4 to Supabase), each taking 200-800ms. Combined with cold start (~1-2s), total time can reach 5-8 seconds.

## Optimizations

### File: `supabase/functions/stripe-create-ticket-checkout/index.ts`

**1. Parallelize independent calls** — Run operations that don't depend on each other concurrently using `Promise.all`:

```typescript
// Before: sequential
const { data: ticketType } = await supabaseAdmin.from("event_ticket_types")...
const customers = await stripe.customers.list(...)
const { data: discountData } = await supabaseAdmin.from("user_discount_codes")...

// After: parallel
const [ticketTypeResult, customersResult, discountResult] = await Promise.all([
  supabaseAdmin.from("event_ticket_types").select(...).eq(...).single(),
  stripe.customers.list({ email: finalBuyerEmail, limit: 1 }),
  discount_code 
    ? supabaseAdmin.from("user_discount_codes").select("*").eq("code", discount_code).is("used_at", null).gt("expires_at", new Date().toISOString()).maybeSingle()
    : Promise.resolve({ data: null, error: null }),
]);
```

**2. Fire-and-forget the final update** — The last DB update (saving `stripe_session_id` back to the purchase) isn't needed before returning the URL to the user. Use `waitUntil` or just don't await it:

```typescript
// Don't await — response can be sent immediately
supabaseAdmin
  .from("event_ticket_purchases")
  .update({ stripe_session_id: session.id })
  .eq("id", purchase.id);
```

**3. Skip coupon list scan** — Instead of listing up to 100 coupons and searching, use a deterministic coupon ID so we can retrieve directly:

```typescript
const couponId = `maxina-${discountData.discount_percent}pct`;
try {
  await stripe.coupons.retrieve(couponId);
} catch {
  await stripe.coupons.create({ id: couponId, percent_off: discountData.discount_percent, duration: 'once', name: couponId });
}
```

## Expected Impact
- Parallelizing 3 calls saves ~600-1500ms
- Fire-and-forget saves ~200-400ms  
- Coupon lookup optimization saves ~300-500ms
- **Total: ~1-2.5 seconds faster**

Cold start is unavoidable with Supabase Edge Functions, but these changes should reduce total time from ~5-8s to ~3-5s.

## Scope
- 1 edge function file modified
- No frontend changes
- No database changes

