/**
 * VTID-05680 — facade over the purchase port. The flag is enforced here: with `iap_enabled` OFF the
 * no-op answers even when another provider is installed. A provider error never reaches the caller.
 * Nothing imports this module yet.
 */
import { isIapEnabled } from './flag';
import {
  NoopPurchaseProvider,
  getPurchaseProvider,
  type Entitlement,
  type PurchaseProduct,
  type PurchaseProvider,
  type PurchaseResult,
  type RestoreResult,
} from './provider';

export { IAP_FLAG_NAME, isIapEnabled, setIapFlagResolver } from './flag';
export { NoopPurchaseProvider, getPurchaseProvider, setPurchaseProvider } from './provider';
export type {
  Entitlement,
  PurchaseProduct,
  PurchaseProvider,
  PurchaseResult,
  RestoreResult,
} from './provider';

function active(): PurchaseProvider {
  return isIapEnabled() ? getPurchaseProvider() : NoopPurchaseProvider;
}

export function isIapAvailable(): boolean {
  try {
    return active().isAvailable();
  } catch {
    return false;
  }
}

export async function listProducts(ids: string[]): Promise<PurchaseProduct[]> {
  try {
    return await active().listProducts(ids);
  } catch {
    return [];
  }
}

export async function purchase(productId: string): Promise<PurchaseResult> {
  try {
    return await active().purchase(productId);
  } catch {
    return { status: 'failed' };
  }
}

export async function restore(): Promise<RestoreResult> {
  try {
    return await active().restore();
  } catch {
    return { status: 'failed' };
  }
}

export async function getEntitlements(): Promise<Entitlement[]> {
  try {
    return await active().getEntitlements();
  } catch {
    return [];
  }
}
