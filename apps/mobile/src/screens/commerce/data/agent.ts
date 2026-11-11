/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * native twin of `src/hooks/useShoppingAgent.ts` + `src/lib/shopping-agent-client.ts`
 * (class B: the web Supabase session + `import.meta.env`). Same calls, same
 * headers as the cart (Bearer + `X-Vitana-Active-Role: community`):
 *
 *   POST /shopping-agent/propose  { prompt, max_items? }  → items written server-side (origin 'agent')
 *   POST /shopping-agent/reorder  { max_items? }          → items written server-side (origin 'reorder')
 *
 * The cart renders from the refetched cart (single source of truth), never
 * from the response, so both invalidate the cart and the budget. 403
 * `cart_unavailable_for_role` → `roleBlocked`, 502 `llm_unavailable` →
 * `llmUnavailable`, anything else → `error`.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { getAccessToken } from '../../../auth/client';
import { ACTIVE_ROLE_HEADER, universalCartQueryKeys } from '../../../ports/commerce';

export interface ProposeAgentCartInput {
  prompt: string;
  max_items?: number;
}

export interface ReorderAgentCartInput {
  max_items?: number;
}

export interface AgentProposedItem {
  item_id: string;
  product_id: string;
  title: string;
  rationale: string;
  safety_flags: string[];
  confidence: number;
}

export interface AgentCartResponse {
  ok: true;
  run_id: string;
  proposed: AgentProposedItem[];
  advisory: string[];
}

export class ShoppingAgentRoleError extends Error {
  readonly role: string | null;
  constructor(role: string | null) {
    super('cart_unavailable_for_role');
    this.name = 'ShoppingAgentRoleError';
    this.role = role;
  }
}

export class ShoppingAgentApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = 'ShoppingAgentApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function isLlmUnavailableError(err: unknown): boolean {
  return err instanceof ShoppingAgentApiError && err.code === 'llm_unavailable';
}

/** web `shoppingAgentFetch`. */
export async function shoppingAgentJson<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ShoppingAgentApiError(401, 'unauthenticated', null, 'Not authenticated');
  const res = await getGateway()(path, {
    method: 'POST',
    headers: { [ACTIVE_ROLE_HEADER]: 'community', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  const asObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!res.ok) {
    if (res.status === 403 && asObj?.error === 'cart_unavailable_for_role') throw new ShoppingAgentRoleError((asObj?.role as string | null) ?? null);
    const code = asObj && typeof asObj.error === 'string' ? asObj.error : `http_${res.status}`;
    const detail = asObj && 'detail' in asObj ? asObj.detail : asObj;
    throw new ShoppingAgentApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

export const proposeAgentCart = (input: ProposeAgentCartInput) => shoppingAgentJson<AgentCartResponse>('/shopping-agent/propose', input);
export const reorderAgentCart = (input: ReorderAgentCartInput = {}) => shoppingAgentJson<AgentCartResponse>('/shopping-agent/reorder', input);

const roleBlock = (err: unknown) => (err instanceof ShoppingAgentRoleError ? { role: err.role } : null);

export function useShoppingAgent() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: universalCartQueryKeys.cart() });
    void qc.invalidateQueries({ queryKey: universalCartQueryKeys.budget() });
  };
  const propose = useMutation({ mutationFn: (input: ProposeAgentCartInput) => proposeAgentCart(input), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: (input: ReorderAgentCartInput) => reorderAgentCart(input), onSuccess: invalidate });
  return {
    propose: (input: ProposeAgentCartInput) => propose.mutateAsync(input),
    isProposing: propose.isPending,
    reorder: (input?: ReorderAgentCartInput) => reorder.mutateAsync(input ?? {}),
    isReordering: reorder.isPending,
    error: reorder.error ?? propose.error,
    roleBlocked: roleBlock(propose.error) ?? roleBlock(reorder.error),
    llmUnavailable: isLlmUnavailableError(propose.error),
  };
}
