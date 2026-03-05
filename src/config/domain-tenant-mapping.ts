/**
 * Maps custom domain hostnames to their corresponding tenant slugs.
 * When a user visits a mapped domain, they'll be redirected to that tenant's intro.
 */
export const DOMAIN_TENANT_MAP: Record<string, string> = {
  'vitanaland.com': 'maxina',
  'www.vitanaland.com': 'maxina',
  'e.vitanaland.com': 'maxina',
  // Future tenant domains:
  // 'alkalma.health': 'alkalma',
  // 'earthlinks.org': 'earthlinks',
};
