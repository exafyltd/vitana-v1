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
  ShoppingAgentRoleError,
  isLlmUnavailableError,
  proposeAgentCart as apiProposeAgentCart,
} from "@/lib/shopping-agent-client";
import { universalCartQueryKeys } from "@/hooks/useUniversalCart";

export interface UseShoppingAgentReturn {
  propose: (input: ProposeAgentCartInput) => Promise<ProposeAgentCartResponse>;
  isProposing: boolean;
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

  const proposeMutation = useMutation({
    mutationFn: (input: ProposeAgentCartInput) => apiProposeAgentCart(input),
    // The items were written server-side into the active universal cart, so
    // invalidate the cart query and let it refetch — single source of truth.
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() }),
  });

  return {
    propose: (input) => proposeMutation.mutateAsync(input),
    isProposing: proposeMutation.isPending,
    error: proposeMutation.error,
    roleBlocked: detectRoleBlock(proposeMutation.error),
    llmUnavailable: isLlmUnavailableError(proposeMutation.error),
    reset: () => proposeMutation.reset(),
  };
}
