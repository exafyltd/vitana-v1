import { canonicalTenantSlug } from '@/lib/retired-tenants';

// VTID-04836: earthlinks was retired into maxina — see resolveTicketTenant().
export const TICKET_TENANTS = ['vitana', 'maxina', 'alkalma'] as const;
export type TicketTenant = (typeof TICKET_TENANTS)[number];

/**
 * Resolve a tenant value (possibly a raw slug from a record) to a ticket
 * theme. A retired tenant (VTID-04836: 'earthlinks') renders with its
 * successor's theme (Maxina); anything unknown renders as VITANA.
 * Lives outside EventTicket.tsx so that file only exports components
 * (react-refresh/only-export-components).
 */
export function resolveTicketTenant(tenant: string | null | undefined): TicketTenant {
  const slug = canonicalTenantSlug(tenant);
  return slug && (TICKET_TENANTS as readonly string[]).includes(slug) ? (slug as TicketTenant) : 'vitana';
}
