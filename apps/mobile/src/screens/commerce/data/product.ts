/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * native twin of `useMarketplaceProduct` (src/hooks/useMarketplace.ts:174-190,
 * class B: web Supabase session + `import.meta.env`) and the product page's
 * `useRecommendationId` (src/pages/discover/ProductDetail.tsx:54-67).
 *
 *   GET /discover/product/:id   key ["marketplace-product", id], staleTime 60 s;
 *                               404 → { ok:false, error:'not_found' } (not an
 *                               error), any other non-2xx throws.
 *
 * The web keeps the `?rec=` id in sessionStorage (`vitana.rec.<id>`) for the
 * browser session; the native twin keeps it for the app process (the same
 * lifetime: gone on a cold start).
 */
import { useQuery } from '@tanstack/react-query';
import { discoverJson, type MarketplaceProduct } from '../../../ports/commerce';

export interface MarketplaceProductResponse {
  ok: boolean;
  product?: MarketplaceProduct;
  error?: string;
}

export const marketplaceProductKey = (id: string | null | undefined) => ['marketplace-product', id] as const;

export async function fetchMarketplaceProduct(id: string): Promise<MarketplaceProductResponse> {
  const res = await discoverJson<MarketplaceProductResponse>(`/discover/product/${id}`);
  if (res.status === 404) return { ok: false, error: 'not_found' };
  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
  return res.body;
}

export function useMarketplaceProduct(id: string | null | undefined, opts: { enabled?: boolean } = {}) {
  return useQuery<MarketplaceProductResponse>({
    queryKey: marketplaceProductKey(id),
    queryFn: () => {
      if (!id) throw new Error('missing product id');
      return fetchMarketplaceProduct(id);
    },
    enabled: !!id && opts.enabled !== false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** `sessionStorage` `vitana.rec.<productId>` for the app process. */
const recIds = new Map<string, string>();

/** The recommendation id for this product: the `?rec=` param (remembered), else a remembered one. */
export function recommendationId(productId: string | undefined, urlRecId: string | null | undefined): string | null {
  if (urlRecId && productId) recIds.set(productId, urlRecId);
  if (urlRecId) return urlRecId;
  if (!productId) return null;
  return recIds.get(productId) ?? null;
}

/** Test seam: forget remembered ids. */
export function __clearRecommendationIdsForTests(): void {
  recIds.clear();
}
