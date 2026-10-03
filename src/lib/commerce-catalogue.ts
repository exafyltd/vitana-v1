/**
 * VTID-04795 — products are saved to the registered business, not to the
 * person: `POST /partner-onboarding/:orgId/catalogue/products`, the same
 * endpoint (and the same product rules) the CSV import already uses. The
 * business's shop record is created on first use (`PUT …/catalogue/merchant`,
 * which fills name, country and website from the business itself), so a new
 * supplier is never asked for their business name again.
 */
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';

type Fetcher = (path: string, init?: RequestInit) => Promise<any>;

export async function addOrgProduct(
  orgId: string,
  product: Record<string, unknown>,
  merchantVertical: string,
  fetcher: Fetcher,
) {
  const url = `${PARTNER_ONBOARDING_API}/${orgId}/catalogue/products`;
  const init = { method: 'POST', body: JSON.stringify(product) };
  try {
    return await fetcher(url, init);
  } catch (err) {
    if (!(err instanceof Error && /NO_MERCHANT/.test(err.message))) throw err;
    await fetcher(`${PARTNER_ONBOARDING_API}/${orgId}/catalogue/merchant`, {
      method: 'PUT',
      body: JSON.stringify({ vertical_key: merchantVertical }),
    });
    return fetcher(url, init);
  }
}
