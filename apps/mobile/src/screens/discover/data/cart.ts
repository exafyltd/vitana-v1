/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — native twin of the
 * part of `src/hooks/useUniversalCart.ts` + `src/lib/universal-cart-client.ts`
 * (class B: Supabase session + `import.meta.env`) the shared add-to-cart
 * control needs. Same query keys, retry rules and gateway calls:
 *
 *   GET  /universal-cart          the active cart + items (["universal-cart","cart"])
 *   GET  /universal-cart/budget   the monthly budget summary (["universal-cart","budget"])
 *   POST /universal-cart/items    add an item; invalidates cart + budget
 *
 * A 403 `cart_unavailable_for_role` surfaces as `roleBlocked` instead of an
 * error, exactly like the web hook. The `product-cart-checkout` lane extends
 * this module (patch / remove / checkout) through `src/ports/add-to-cart.ts`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartJson, UniversalCartApiError, UniversalCartRoleError } from './client';

export { UniversalCartApiError, UniversalCartRoleError };

export type UniversalCartItemType = 'supplement' | 'partner_product';
export type UniversalCartSourceSurface = 'web' | 'mobile' | 'voice' | 'autopilot' | 'community' | 'video_shop';
export type UniversalCartItemStatus = 'active' | 'removed' | 'completed' | 'expired';

export interface UniversalCart {
  id: string;
  user_id: string;
  tenant_id: string | null;
  status: 'active' | 'archived';
  source_context: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UniversalCartItem {
  id: string;
  cart_id: string;
  item_type: UniversalCartItemType;
  product_id: string;
  merchant_id: string | null;
  quantity: number;
  unit_price_cents_snapshot: number | null;
  currency_snapshot: string | null;
  source_surface: UniversalCartSourceSurface | null;
  source_ref: string | null;
  status: UniversalCartItemStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GetCartResponse {
  ok: true;
  cart: UniversalCart | null;
  items: UniversalCartItem[];
}

export interface BudgetSummary {
  ok: true;
  monthly_cap_cents: number | null;
  spent_this_month_cents: number;
  cart_active_subtotal_cents: number;
  currency: string;
  status: 'under' | 'near' | 'over';
}

export interface AddItemInput {
  product_id: string;
  item_type: UniversalCartItemType;
  quantity?: number;
  source_surface?: UniversalCartSourceSurface;
  source_ref?: string;
  merchant_id?: string;
  unit_price_cents_snapshot?: number;
  currency_snapshot?: string;
  autopilot_rec_id?: string;
  source_video_id?: string;
  source_creator_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AddItemResponse {
  ok: true;
  cart_id: string;
  item: UniversalCartItem;
  action: 'created' | 'quantity_bumped';
  cart_created: boolean;
}

export const universalCartQueryKeys = {
  all: ['universal-cart'] as const,
  cart: () => [...universalCartQueryKeys.all, 'cart'] as const,
  budget: () => [...universalCartQueryKeys.all, 'budget'] as const,
};

export const getCart = () => cartJson<GetCartResponse>('/universal-cart', { method: 'GET' });
export const getBudget = () => cartJson<BudgetSummary>('/universal-cart/budget', { method: 'GET' });
export const addCartItem = (input: AddItemInput) => cartJson<AddItemResponse>('/universal-cart/items', { method: 'POST', body: input });

const retry = (failureCount: number, error: unknown) => {
  if (error instanceof UniversalCartRoleError) return false;
  if (error instanceof UniversalCartApiError && error.status === 401) return false;
  return failureCount < 1;
};

export function useUniversalCart(opts?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const enabled = opts?.enabled ?? true;
  const cartQuery = useQuery({ queryKey: universalCartQueryKeys.cart(), queryFn: getCart, enabled, retry, staleTime: 30_000 });
  const roleBlocked = cartQuery.error instanceof UniversalCartRoleError ? { role: cartQuery.error.role } : null;
  const budgetQuery = useQuery({ queryKey: universalCartQueryKeys.budget(), queryFn: getBudget, enabled: enabled && !roleBlocked, retry, staleTime: 30_000 });

  const items = cartQuery.data?.items ?? [];
  const activeItems = items.filter((it) => it.status === 'active');
  const cartItems = activeItems.filter((it) => !it.metadata?.saved);
  const savedItems = activeItems.filter((it) => !!it.metadata?.saved);
  const cartCount = roleBlocked ? 0 : cartItems.reduce((sum, it) => sum + (it.quantity ?? 0), 0);

  const addMutation = useMutation({
    mutationFn: (input: AddItemInput) => addCartItem(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });
      void qc.invalidateQueries({ queryKey: universalCartQueryKeys.budget() });
    },
  });

  return {
    cart: cartQuery.data?.cart ?? null,
    items,
    cartItems,
    savedItems,
    cartCount,
    budget: budgetQuery.data ?? null,
    budgetLoading: budgetQuery.isLoading,
    isLoading: cartQuery.isLoading,
    error: cartQuery.error,
    roleBlocked,
    refresh: async () => {
      await cartQuery.refetch();
    },
    addItem: (input: AddItemInput) => addMutation.mutateAsync(input),
    isAdding: addMutation.isPending,
  };
}
