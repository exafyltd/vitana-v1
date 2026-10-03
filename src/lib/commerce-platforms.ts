/**
 * VTID-04796 — what a supplier sees for a connection: the platform's name,
 * never the internal connector / provider IDs (those stay in Developer
 * settings). Company names are not translated; an unknown connector reads
 * as "Custom API".
 */
const PLATFORM_NAMES: Record<string, string> = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  magento: 'Magento',
  bigcommerce: 'BigCommerce',
  smart_fhir: 'FHIR',
};

/** The platform's name, or null when it is a custom integration. */
export function platformName(connectorId: string | null | undefined): string | null {
  return (connectorId && PLATFORM_NAMES[connectorId]) || null;
}
