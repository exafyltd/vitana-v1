/**
 * VTID-03919 — the client half of checkout idempotency.
 *
 * THE BUG THIS EXISTS TO CLOSE
 *
 * `POST /api/v1/universal-cart/checkout` takes an OPTIONAL `idempotency_key`
 * and falls back to `randomUUID()` server-side when it is absent. The gateway
 * uses that value as the `checkout_id`, which becomes the wallet debit's
 * `reference_id`, and `wallet_ledger_entries` carries
 * `UNIQUE (reference_type, reference_id, entry_type)` precisely so a replayed
 * debit is rejected rather than charged twice.
 *
 * The frontend never sent a key. So every retry — a double-click, a flaky
 * network, a user pressing Checkout again after an error — minted a FRESH
 * checkout_id server-side, giving the debit a fresh reference_id, and that
 * uniqueness constraint never engaged. The whole safety mechanism was in
 * place and unreachable, and `duplicate: true` (which the cart UI already
 * renders a toast for) could not be produced by this client at all.
 *
 * WHY THE KEY IS SCOPED TO THE CART'S CONTENTS, NOT JUST "ONE PER ATTEMPT"
 *
 * Reusing a key forever would be wrong in the other direction. The gateway
 * writes intent rows keyed `${checkout_id}:${cart_item_id}` and, on a replay,
 * reuses the rows it already finds under that prefix. If the user removed a
 * line and retried under the same key, the removed line's pending row would
 * still be sitting there under that checkout_id.
 *
 * So the key is stable for exactly as long as the thing being paid for is:
 * same cart contents -> same key (a retry is a retry), contents changed ->
 * new key (a different purchase), succeeded -> cleared (the next checkout is
 * genuinely new).
 */

/** The fields of a cart line that change what is being bought. */
export interface CheckoutIdempotencyLine {
  id: string;
  quantity: number;
}

/**
 * A stable fingerprint of what the cart currently contains.
 *
 * Sorted by id so the server's row order cannot change the signature on its
 * own — two reads of an unchanged cart must fingerprint identically, or the
 * key rotates on a refetch and the double-charge window reopens quietly.
 */
export function cartSignature(lines: readonly CheckoutIdempotencyLine[]): string {
  return lines
    .map((l) => `${l.id}:${l.quantity}`)
    .sort()
    .join('|');
}

/** What the caller holds between attempts (a ref, in React). */
export interface CheckoutIdempotencyState {
  key: string;
  signature: string;
}

/**
 * Decide the key for the attempt about to be made.
 *
 * Returns the state to store AND the key to send — the caller stores the
 * whole thing, so a retry of the same cart passes back the same state and
 * gets the same key.
 *
 * `mintKey` is injected so tests do not depend on `crypto.randomUUID`, which
 * is absent in some jsdom versions. The server validates the key as a UUID
 * (`z.string().uuid()`), so a caller must supply one — a non-UUID would be
 * rejected with 400 and look like a checkout outage.
 */
export function nextIdempotency(
  previous: CheckoutIdempotencyState | null,
  lines: readonly CheckoutIdempotencyLine[],
  mintKey: () => string,
): CheckoutIdempotencyState {
  const signature = cartSignature(lines);
  if (previous && previous.signature === signature) return previous;
  return { key: mintKey(), signature };
}

/**
 * A UUID for the key.
 *
 * `crypto.randomUUID` needs a secure context; every surface this ships on is
 * HTTPS, but a non-secure origin (a plain-http LAN preview) would throw and
 * take checkout down entirely, so there is a fallback. It is deliberately
 * NOT presented as cryptographically strong — nothing here needs that. The
 * key only has to be unique enough that two different purchases never
 * collide, and `crypto.getRandomValues` covers that wherever it exists.
 */
export function mintIdempotencyKey(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      // fall through to the manual path
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 version 4 / variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
