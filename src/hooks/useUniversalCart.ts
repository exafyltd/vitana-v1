/**
 * VTID-03236 — useUniversalCart hook.
 *
 * TanStack Query v5 hook over the Universal Cart gateway (VTID-03213).
 * Coexists with the legacy `useCart` hook (cart_items table) — does NOT
 * read, write, or invalidate any legacy cart query keys.
 *
 * Public surface:
 *   const {
 *     cart, items, isLoading, error, roleBlocked, refresh,
 *     addItem, patchItem, removeItem, completeItem,
 *     isAdding, isPatching, isRemoving, isCompleting,
 *   } = useUniversalCart();
 *
 *   await addItem({ product_id, item_type: 'partner_product', quantity: 1, source_surface: 'community' });
 *
 * 403 handling: when the gateway returns `cart_unavailable_for_role`, the
 * hook surfaces `roleBlocked: { role: string | null }` instead of throwing.
 * Mutations short-circuit: callers can render a community-only empty state.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AddItemInput,
  PatchItemInput,
  UniversalCart,
  UniversalCartApiError,
  UniversalCartEvent,
  UniversalCartItem,
  UniversalCartRoleError,
  addItem as apiAddItem,
  completeItem as apiCompleteItem,
  createOrFetchCart as apiCreateOrFetchCart,
  getCart as apiGetCart,
  getEvents as apiGetEvents,
  patchItem as apiPatchItem,
  removeItem as apiRemoveItem,
} from "@/lib/universal-cart-client";

// Centralized React Query keys so other code (e.g. the UniversalCart page
// or the AddToUniversalCartButton) can read the same cache.
export const universalCartQueryKeys = {
  all: ["universal-cart"] as const,
  cart: () => [...universalCartQueryKeys.all, "cart"] as const,
  events: (limit?: number) =>
    [...universalCartQueryKeys.all, "events", limit ?? 50] as const,
};

export interface UseUniversalCartReturn {
  cart: UniversalCart | null;
  items: UniversalCartItem[];
  isLoading: boolean;
  error: unknown;
  /** Non-null when the gateway returned 403 cart_unavailable_for_role. */
  roleBlocked: { role: string | null } | null;
  refresh: () => Promise<void>;
  addItem: (input: AddItemInput) => Promise<ReturnType<typeof apiAddItem>>;
  patchItem: (itemId: string, input: PatchItemInput) => Promise<ReturnType<typeof apiPatchItem>>;
  removeItem: (itemId: string, removalReason?: string) => Promise<ReturnType<typeof apiRemoveItem>>;
  completeItem: (itemId: string) => Promise<ReturnType<typeof apiCompleteItem>>;
  ensureCart: (sourceContext?: string) => Promise<ReturnType<typeof apiCreateOrFetchCart>>;
  isAdding: boolean;
  isPatching: boolean;
  isRemoving: boolean;
  isCompleting: boolean;
}

function detectRoleBlock(err: unknown): { role: string | null } | null {
  if (err instanceof UniversalCartRoleError) return { role: err.role };
  return null;
}

export function useUniversalCart(opts?: { enabled?: boolean }): UseUniversalCartReturn {
  const qc = useQueryClient();

  const cartQuery = useQuery({
    queryKey: universalCartQueryKeys.cart(),
    queryFn: () => apiGetCart(),
    enabled: opts?.enabled ?? true,
    // 403 is not a transient failure; do not auto-retry it.
    retry: (failureCount, error) => {
      if (error instanceof UniversalCartRoleError) return false;
      if (error instanceof UniversalCartApiError && error.status === 401) return false;
      return failureCount < 1;
    },
    staleTime: 30 * 1000,
  });

  const roleBlocked = detectRoleBlock(cartQuery.error);

  const invalidateCart = () => qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });

  const addMutation = useMutation({
    mutationFn: (input: AddItemInput) => apiAddItem(input),
    onSuccess: () => invalidateCart(),
  });
  const patchMutation = useMutation({
    mutationFn: (args: { itemId: string; input: PatchItemInput }) =>
      apiPatchItem(args.itemId, args.input),
    onSuccess: () => invalidateCart(),
  });
  const removeMutation = useMutation({
    mutationFn: (args: { itemId: string; removalReason?: string }) =>
      apiRemoveItem(args.itemId, args.removalReason),
    onSuccess: () => invalidateCart(),
  });
  const completeMutation = useMutation({
    mutationFn: (itemId: string) => apiCompleteItem(itemId),
    onSuccess: () => invalidateCart(),
  });

  return {
    cart: cartQuery.data?.cart ?? null,
    items: cartQuery.data?.items ?? [],
    isLoading: cartQuery.isLoading,
    error: cartQuery.error,
    roleBlocked,
    refresh: async () => { await cartQuery.refetch(); },
    addItem: (input) => addMutation.mutateAsync(input),
    patchItem: (itemId, input) => patchMutation.mutateAsync({ itemId, input }),
    removeItem: (itemId, removalReason) =>
      removeMutation.mutateAsync({ itemId, removalReason }),
    completeItem: (itemId) => completeMutation.mutateAsync(itemId),
    ensureCart: (sourceContext) => apiCreateOrFetchCart(sourceContext),
    isAdding: addMutation.isPending,
    isPatching: patchMutation.isPending,
    isRemoving: removeMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}

/**
 * Lightweight events feed; separate query so the cart view doesn't block on
 * event load and vice versa.
 */
export function useUniversalCartEvents(limit = 50): {
  events: UniversalCartEvent[];
  isLoading: boolean;
  error: unknown;
  roleBlocked: { role: string | null } | null;
} {
  const eventsQuery = useQuery({
    queryKey: universalCartQueryKeys.events(limit),
    queryFn: () => apiGetEvents(limit),
    retry: (failureCount, error) => {
      if (error instanceof UniversalCartRoleError) return false;
      return failureCount < 1;
    },
    staleTime: 30 * 1000,
  });
  return {
    events: eventsQuery.data?.events ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    roleBlocked: detectRoleBlock(eventsQuery.error),
  };
}
