/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the pure Commerce Portal
 * rules the native business / commerce-mode screens reuse from the web:
 * gateway API bases, supplier registration (short-name derivation + retry),
 * "Set up with AI" draft/review/apply, company suggestions, catalogue product
 * save, the MCP consent parsing, the setup-hub checklist, partner terms,
 * CSV-import outcomes, sales setup, categories, countries, connection steps
 * and the health-order helpers.
 *
 * Generated verbatim through packages/core/extract.json (NOT `export * from
 * '@/lib/…'`): every one of these web files also imports the web Supabase
 * client, the gateway base (`import.meta.env`) or React components, so only
 * the named IO-free declarations are copied. The data calls themselves are
 * re-implemented natively (apps/mobile/src/screens/business/data, design §3b).
 */
export * from './extracted/commerce-host.generated';
export * from './extracted/commerce-ai-setup.generated';
export * from './extracted/commerce-register.generated';
export * from './extracted/commerce-catalogue.generated';
export * from './extracted/commerce-suggestions.generated';
export * from './extracted/commerce-mcp.generated';
export * from './extracted/commerce-data.generated';
