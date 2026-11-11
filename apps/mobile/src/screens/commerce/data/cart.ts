/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * rest of `src/hooks/useUniversalCart.ts` + `src/lib/universal-cart-client.ts`
 * (class B) the cart page needs, on top of the discover lane's twin (the cart
 * + budget queries, read through src/ports/add-to-cart.ts, never re-owned).
 * Same gateway calls, query keys and invalidation as the web:
 *
 *   GET    /universal-cart                 ["universal-cart","cart"]   (discover twin)
 *   GET    /universal-cart/budget          ["universal-cart","budget"] (discover twin)
 *   PATCH  /universal-cart/items/:id       { quantity } | { metadata }
 *   DELETE /universal-cart/items/:id       { removal_reason }? (no body without one)
 *   POST   /universal-cart/checkout        { idempotency_key }
 *
 * Every mutation invalidates the cart and the budget (the subtotal changes).
 * Checkout errors carry the gateway's code (`UniversalCartApiError.code`); a
 * 402 INSUFFICIENT_BALANCE keeps the whole body as `detail`
 * (balance_minor / required_minor / currency).
 *
 * iOS IAP gate flag (requirements R5, highest priority): the checkout is a
 * wallet-debit purchase. Today's behaviour is kept — the web cart has no iOS
 * gate and the shell's `iapRestricted` (shell/logic/drawer.ts:37-38,
 * `Platform.OS === 'ios'`) hides only the wallet drawer row; the extension to
 * every digital purchase surface is program decision 5, deferred.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { cartJson, universalCartQueryKeys, UniversalCartApiError, useUniversalCart, type UniversalCartItem } from '../../../ports/commerce';

export type CheckoutCurrency = 'EUR' | 'USD';

export interface PatchItemInput {
  quantity?: number;
  metadata?: Record<string, unknown>;
}

export interface CheckoutInput {
  idempotency_key?: string;
  session_id?: string;
}

export interface CheckoutWalletOrder {
  currency: CheckoutCurrency;
  amount_minor: number;
  balance_minor: number;
  duplicate: boolean;
  order_ids: string[];
}

export interface CheckoutAffiliateRedirect {
  item_id: string;
  product_id: string;
  affiliate_url: string;
  order_id: string | null;
}

export interface CheckoutResponse {
  ok: true;
  checkout_id: string;
  wallet_order: CheckoutWalletOrder | null;
  affiliate_redirects: CheckoutAffiliateRedirect[];
  completed_item_ids: string[];
}

export interface InsufficientBalanceDetail {
  error: 'INSUFFICIENT_BALANCE';
  balance_minor: number;
  required_minor: number;
  currency: CheckoutCurrency;
}

/** web `isInsufficientBalanceError`. */
export function isInsufficientBalanceError(err: unknown): err is UniversalCartApiError & { detail: InsufficientBalanceDetail } {
  return err instanceof UniversalCartApiError && err.code === 'INSUFFICIENT_BALANCE' && !!err.detail && typeof err.detail === 'object';
}

/** UniversalCart.tsx CHECKOUT_ERROR_KEYS: codes with a dedicated translated message. */
export const CHECKOUT_ERROR_KEYS = new Set([
  'invalid_request',
  'CART_EMPTY',
  'PRODUCT_UNAVAILABLE',
  'PRICE_UNAVAILABLE',
  'MIXED_CURRENCY',
  'UNSUPPORTED_WALLET_CURRENCY',
  'WALLET_ACCOUNT_MISSING',
  'WALLET_ACCOUNT_INACTIVE',
  'INSUFFICIENT_BALANCE',
  'TENANT_REQUIRED',
  'WALLET_DEBIT_FAILED',
  'CART_READ_FAILED',
  'ORDER_WRITE_FAILED',
  'WALLET_READ_FAILED',
  'GATEWAY_MISCONFIGURED',
]);

/** UniversalCart.tsx `checkoutErrorKey`. */
export function checkoutErrorKey(code: string | undefined): string {
  if (code && CHECKOUT_ERROR_KEYS.has(code)) return `marketplaceCheckout.errors.${code}`;
  return 'marketplaceCheckout.errors.unknown';
}

/**
 * The idempotency key: a v4 UUID (the gateway validates `z.string().uuid()`).
 * The web mints with `crypto.randomUUID`; Hermes has no Web Crypto, so the
 * native minter is expo-crypto's `randomUUID` — the same RFC 4122 v4 value.
 */
export function mintCheckoutKey(): string {
  return randomUUID();
}

export const patchCartItem = (itemId: string, input: PatchItemInput) =>
  cartJson<{ ok: true; item: UniversalCartItem }>(`/universal-cart/items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: input });

export const removeCartItem = (itemId: string, removalReason?: string) =>
  cartJson<{ ok: true; item: UniversalCartItem }>(`/universal-cart/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    body: removalReason ? { removal_reason: removalReason } : undefined,
  });

export const checkoutCart = (input: CheckoutInput = {}) => cartJson<CheckoutResponse>('/universal-cart/checkout', { method: 'POST', body: input });

/** The page's `useUniversalCart()` surface: the discover twin's reads plus patch / remove / checkout. */
export function useCommerceCart() {
  const qc = useQueryClient();
  const base = useUniversalCart();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });
    void qc.invalidateQueries({ queryKey: universalCartQueryKeys.budget() });
  };
  const patch = useMutation({ mutationFn: (a: { itemId: string; input: PatchItemInput }) => patchCartItem(a.itemId, a.input), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (a: { itemId: string; removalReason?: string }) => removeCartItem(a.itemId, a.removalReason), onSuccess: invalidate });
  const checkout = useMutation({ mutationFn: (input: CheckoutInput) => checkoutCart(input), onSuccess: invalidate });
  return {
    ...base,
    patchItem: (itemId: string, input: PatchItemInput) => patch.mutateAsync({ itemId, input }),
    removeItem: (itemId: string, removalReason?: string) => remove.mutateAsync({ itemId, removalReason }),
    checkout: (input?: CheckoutInput) => checkout.mutateAsync(input ?? {}),
    isPatching: patch.isPending,
    isRemoving: remove.isPending,
    isCheckingOut: checkout.isPending,
  };
}
