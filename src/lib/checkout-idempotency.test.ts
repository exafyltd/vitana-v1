/**
 * VTID-03919 — the property that matters here is a money property, so these
 * tests are written against the failure rather than the implementation:
 * pressing Checkout twice must not be able to debit the wallet twice.
 */
import { describe, expect, it } from 'vitest';
import {
  cartSignature,
  mintIdempotencyKey,
  nextIdempotency,
  type CheckoutIdempotencyState,
} from './checkout-idempotency';

/** Deterministic key source, so a test never depends on crypto being present. */
function counter() {
  let n = 0;
  return () => `key-${(n += 1)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('checkout idempotency', () => {
  it('reuses the key when the cart has not changed — the double-charge case', () => {
    const mint = counter();
    const lines = [{ id: 'a', quantity: 1 }];

    const first = nextIdempotency(null, lines, mint);
    const retry = nextIdempotency(first, lines, mint);

    expect(retry.key).toBe(first.key);
    expect(retry).toBe(first); // same object: nothing re-minted
  });

  it('mints a new key once the cart contents change', () => {
    const mint = counter();
    const before = nextIdempotency(null, [{ id: 'a', quantity: 1 }], mint);
    const after = nextIdempotency(before, [{ id: 'a', quantity: 2 }], mint);

    expect(after.key).not.toBe(before.key);
  });

  it('mints a new key when a line is removed', () => {
    // Specifically why the key is not simply "one per attempt": the gateway
    // reuses intent rows under the old checkout_id, so a removed line would
    // still be sitting there pending.
    const mint = counter();
    const before = nextIdempotency(
      null,
      [{ id: 'a', quantity: 1 }, { id: 'b', quantity: 1 }],
      mint,
    );
    const after = nextIdempotency(before, [{ id: 'a', quantity: 1 }], mint);

    expect(after.key).not.toBe(before.key);
  });

  it('mints a new key when a line is added', () => {
    const mint = counter();
    const before = nextIdempotency(null, [{ id: 'a', quantity: 1 }], mint);
    const after = nextIdempotency(
      before,
      [{ id: 'a', quantity: 1 }, { id: 'b', quantity: 1 }],
      mint,
    );

    expect(after.key).not.toBe(before.key);
  });

  it('is unaffected by the order rows come back in', () => {
    // A refetch that returns the same rows in a different order must not
    // rotate the key — that would silently reopen the double-charge window
    // on exactly the retry path this exists to protect.
    const mint = counter();
    const first = nextIdempotency(
      null,
      [{ id: 'b', quantity: 2 }, { id: 'a', quantity: 1 }],
      mint,
    );
    const reordered = nextIdempotency(
      first,
      [{ id: 'a', quantity: 1 }, { id: 'b', quantity: 2 }],
      mint,
    );

    expect(reordered.key).toBe(first.key);
  });

  it('starts fresh after the previous attempt succeeded (ref cleared to null)', () => {
    const mint = counter();
    const lines = [{ id: 'a', quantity: 1 }];
    const spent = nextIdempotency(null, lines, mint);

    // The page sets the ref to null once the request lands; the same cart
    // must then get a NEW key, or the next purchase replays the last one.
    const next = nextIdempotency(null, lines, mint);

    expect(next.key).not.toBe(spent.key);
  });

  it('treats an empty cart as its own signature rather than matching anything', () => {
    const mint = counter();
    const withItems = nextIdempotency(null, [{ id: 'a', quantity: 1 }], mint);
    const emptied = nextIdempotency(withItems, [], mint);

    expect(emptied.key).not.toBe(withItems.key);
    expect(cartSignature([])).toBe('');
  });

  it('cannot confuse two carts whose ids concatenate the same way', () => {
    // 'a:1' + 'b:2' must not collide with 'a:1|b' + '2' or similar.
    expect(cartSignature([{ id: 'a', quantity: 1 }, { id: 'b', quantity: 2 }]))
      .not.toBe(cartSignature([{ id: 'a', quantity: 1 }, { id: 'b:2', quantity: 2 }]));
  });

  it('mints a real UUID — the server rejects anything else with a 400', () => {
    // CheckoutBody is z.string().uuid().optional(); a non-UUID would read as
    // a checkout outage rather than a validation slip.
    for (let i = 0; i < 20; i += 1) {
      expect(mintIdempotencyKey()).toMatch(UUID_RE);
    }
  });

  it('mints distinct keys', () => {
    const keys = new Set(Array.from({ length: 200 }, () => mintIdempotencyKey()));
    expect(keys.size).toBe(200);
  });

  it('still mints a valid UUID when crypto.randomUUID throws', () => {
    // A non-secure origin (a plain-http LAN preview) throws here. Falling over
    // would take checkout down entirely, which is worse than the bug.
    const original = globalThis.crypto?.randomUUID;
    if (!original) return; // nothing to override in this environment
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: () => {
          throw new Error('not a secure context');
        },
      });
      expect(mintIdempotencyKey()).toMatch(UUID_RE);
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: original,
      });
    }
  });

  it('carries the signature forward so the caller can store one object', () => {
    const state: CheckoutIdempotencyState = nextIdempotency(
      null,
      [{ id: 'a', quantity: 3 }],
      counter(),
    );
    expect(state.signature).toBe('a:3');
  });
});
