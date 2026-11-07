/**
 * VTID-05512 — the client half of checkout idempotency (src/lib/checkout-idempotency.ts,
 * VTID-03919), class A (imports nothing). The native cart reuses the web rule
 * as is: same cart contents → same key, contents changed → new key, success →
 * cleared. The key minter is injected by the caller (natively expo-crypto).
 */
export { cartSignature, nextIdempotency, mintIdempotencyKey } from '@/lib/checkout-idempotency';
export type { CheckoutIdempotencyLine, CheckoutIdempotencyState } from '@/lib/checkout-idempotency';
