/**
 * Phase 1 — useShoppingAgent hook.
 *
 * TanStack Query v5 mutation over the Shopping Agent gateway. On success the
 * gateway has already written the proposed items into the user's active
 * universal cart (metadata.origin === 'agent'), so we invalidate the universal
 * cart query key (imported from useUniversalCart) — the cart refetches and the
 * new agent items appear via the cart list, the single source of truth. We do
 * NOT render the cart from the propose response directly.
 *
 * Public surface:
 *   const { propose, isProposing, error, roleBlocked, llmUnavailable, reset } =
 *     useShoppingAgent();
 *   const res = await propose({ prompt, max_items });
 *
 * 403 / 502 handling: the gateway's `cart_unavailable_for_role` (403) and
 * `llm_unavailable` (502) are surfaced distinctly via `roleBlocked` and
 * `llmUnavailable` so the UI can render the right message instead of failing
 * silently.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ProposeAgentCartInput,
  ProposeAgentCartResponse,
  ReorderAgentCartInput,
  ReorderAgentCartResponse,
  ShoppingAgentRoleError,
  isLlmUnavailableError,
  proposeAgentCart as apiProposeAgentCart,
  reorderAgentCart as apiReorderAgentCart,
} from "@/lib/shopping-agent-client";
import { universalCartQueryKeys } from "@/hooks/useUniversalCart";

export interface UseShoppingAgentReturn {
  propose: (input: ProposeAgentCartInput) => Promise<ProposeAgentCartResponse>;
  isProposing: boolean;
  /**
   * Phase 2 — drop the user's previously-purchased items back into the active
   * cart as proposals (metadata.origin === 'reorder'). Like propose, the items
   * are written server-side; render from the refetched cart, not the response.
   */
  reorder: (input?: ReorderAgentCartInput) => Promise<ReorderAgentCartResponse>;
  isReordering: boolean;
  error: unknown;
  /** Non-null when the gateway returned 403 cart_unavailable_for_role. */
  roleBlocked: { role: string | null } | null;
  /** True when the gateway returned 502 llm_unavailable (no AI provider). */
  llmUnavailable: boolean;
  reset: () => void;
}

function detectRoleBlock(err: unknown): { role: string | null } | null {
  if (err instanceof ShoppingAgentRoleError) return { role: err.role };
  return null;
}

export function useShoppingAgent(): UseShoppingAgentReturn {
  const qc = useQueryClient();

  // The items are written server-side into the active universal cart, so we
  // invalidate the cart query (single source of truth) AND the budget query
  // (the new lines change the active subtotal → meter must update).
  const invalidateCartAndBudget = () => {
    qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });
    qc.invalidateQueries({ queryKey: universalCartQueryKeys.budget() });
  };

  const proposeMutation = useMutation({
    mutationFn: (input: ProposeAgentCartInput) => apiProposeAgentCart(input),
    onSuccess: invalidateCartAndBudget,
  });

  const reorderMutation = useMutation({
    mutationFn: (input: ReorderAgentCartInput) => apiReorderAgentCart(input),
    onSuccess: invalidateCartAndBudget,
  });

  return {
    propose: (input) => proposeMutation.mutateAsync(input),
    isProposing: proposeMutation.isPending,
    reorder: (input) => reorderMutation.mutateAsync(input ?? {}),
    isReordering: reorderMutation.isPending,
    // Surface the most recent of the two mutations' state for the shared
    // roleBlocked / error banners (both fail the same way).
    error: reorderMutation.error ?? proposeMutation.error,
    roleBlocked:
      detectRoleBlock(proposeMutation.error) ??
      detectRoleBlock(reorderMutation.error),
    llmUnavailable: isLlmUnavailableError(proposeMutation.error),
    reset: () => {
      proposeMutation.reset();
      reorderMutation.reset();
    },
  };
}
