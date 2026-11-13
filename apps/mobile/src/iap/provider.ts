/**
 * VTID-05680 — vendor-neutral purchase port (interface only; no vendor chosen).
 *
 * Same shape as `push/provider.ts`: an interface, a no-op default and an installer. No store SDK,
 * product id, key, receipt or network call belongs here; product ids are caller-supplied strings.
 * Callers use the facade in `./index`, which enforces the `iap_enabled` flag.
 */

export interface PurchaseProduct {
  id: string;
  title: string;
  /** Minor units (e.g. cents) plus ISO currency; null when the store gives no price. */
  price: { amountMinor: number; currency: string } | null;
}

export interface Entitlement {
  id: string;
}

export type PurchaseResult =
  | { status: 'purchased'; entitlements: Entitlement[] }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'unavailable' }
  | { status: 'failed' };

export type RestoreResult =
  | { status: 'restored'; entitlements: Entitlement[] }
  | { status: 'unavailable' }
  | { status: 'failed' };

export interface PurchaseProvider {
  /** False when the build has no purchase backend (the no-op, or a provider not configured). */
  isAvailable(): boolean;
  listProducts(ids: string[]): Promise<PurchaseProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<RestoreResult>;
  getEntitlements(): Promise<Entitlement[]>;
}

export const NoopPurchaseProvider: PurchaseProvider = {
  isAvailable: () => false,
  listProducts: async () => [],
  purchase: async () => ({ status: 'unavailable' }),
  restore: async () => ({ status: 'unavailable' }),
  getEntitlements: async () => [],
};

let current: PurchaseProvider = NoopPurchaseProvider;

export function getPurchaseProvider(): PurchaseProvider {
  return current;
}

/** A later, owner-approved lane installs a real provider here. `null` restores the no-op. */
export function setPurchaseProvider(provider: PurchaseProvider | null): void {
  current = provider ?? NoopPurchaseProvider;
}
