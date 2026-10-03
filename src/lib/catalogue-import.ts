/**
 * VTID-04745 — CSV catalogue import for the Commerce Portal.
 *
 * Calls POST /api/v1/partner-onboarding/:orgId/catalogue/products/import
 * (gateway VTID-04731). The import is all or nothing and every product lands
 * as an inactive draft; `dry_run: true` returns the same report without
 * writing, so the partner checks a file before sending it.
 *
 * Errors come back with a stable `code` + `params` (gateway VTID-04746); the
 * portal translates the code and never shows the gateway's English sentence.
 * An unknown or missing code falls back to a generic translated message.
 */
import { supabase } from '@/integrations/supabase/client';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';
// The shared resolver: honours VITE_GATEWAY_BASE and VITE_GATEWAY_URL alike.
import { GATEWAY_BASE } from '@/lib/gateway-base';

/** Mirrors the gateway's CSV_MAX_CHARS / CSV_MAX_ROWS. */
export const CSV_MAX_CHARS = 1_000_000;
export const CSV_MAX_ROWS = 500;

/** Column names are data (what the partner types in the header), not UI text. */
export const CSV_TEMPLATE = [
  'title,description,brand,price,currency,affiliate_url,origin_country,ships_to_countries,ships_to_regions,images,availability,category',
  'Omega-3 Kapseln,90 Kapseln,Acme,19.99,EUR,https://shop.example/omega-3,DE,DE|AT|CH,,https://shop.example/omega-3.jpg,in_stock,supplements',
  'Yoga Mat,Non-slip,Acme,39.00,EUR,https://shop.example/yoga-mat,DE,,EU,,in_stock,fitness',
].join('\n');

export const FILE_ERROR_CODES = [
  'empty', 'too_large', 'no_header', 'unknown_columns', 'duplicate_columns', 'missing_column',
  'missing_price_column', 'no_rows', 'too_many_rows', 'unterminated_quote',
] as const;
export const ROW_ERROR_CODES = [
  'field_count', 'price_both', 'not_money', 'not_cents', 'amount_too_large', 'required', 'too_short',
  'too_long', 'wrong_length', 'invalid_url', 'invalid_choice', 'ships_to_required', 'invalid_value',
] as const;
/** Client-side checks, before anything is sent. */
export const LOCAL_ERROR_CODES = ['not_csv', 'file_too_large', 'unreadable'] as const;

export type ErrorParams = Record<string, string | number>;
export interface ImportRowError {
  line: number;
  field?: string;
  code?: string;
  params?: ErrorParams;
}

export type ImportOutcome =
  | { kind: 'report'; validRows: number; errors: ImportRowError[] }
  | { kind: 'imported'; imported: number }
  | { kind: 'file_error'; code: string; params: ErrorParams }
  | { kind: 'row_errors'; validRows: number; errors: ImportRowError[] }
  | { kind: 'locked' }
  | { kind: 'failed' };

const KEY = 'screens.commerceportal.catalogueImport';

/** i18n key for an error code; unknown codes fall back to a generic message. */
export function errorMessageKey(code: string | undefined, scope: 'file' | 'row'): string {
  const known: readonly string[] =
    scope === 'file' ? [...FILE_ERROR_CODES, ...LOCAL_ERROR_CODES] : ROW_ERROR_CODES;
  if (code && known.includes(code)) return `${KEY}.errors.${code}`;
  return `${KEY}.errors.${scope === 'file' ? 'file_generic' : 'invalid_value'}`;
}

/** Checked before reading or sending: a CSV by name, within the gateway's size limit. */
export function checkCsvFile(file: { name: string; size: number }): (typeof LOCAL_ERROR_CODES)[number] | null {
  if (!/\.csv$/i.test(file.name)) return 'not_csv';
  // Bytes >= characters for UTF-8, so a file over the limit in bytes may still
  // fit in characters; allow some headroom and let the gateway decide exactly.
  if (file.size > CSV_MAX_CHARS * 4) return 'file_too_large';
  return null;
}


/** Like adminFetch, but keeps the status and body of a 4xx (the import's report lives there). */
async function gatewayCall(path: string, init: RequestInit): Promise<{ status: number; body: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('NO_AUTH_TOKEN');
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** Maps the gateway's answer onto what the sheet shows. Pure, so it is tested directly. */
export function toOutcome(status: number, body: any, dryRun: boolean): ImportOutcome {
  if (status === 200 && body?.dry_run) {
    return { kind: 'report', validRows: Number(body.valid_rows) || 0, errors: (body.errors ?? []) as ImportRowError[] };
  }
  if ((status === 200 || status === 201) && !dryRun && body?.ok) {
    return { kind: 'imported', imported: Number(body.imported) || 0 };
  }
  if (status === 400 && body?.error === 'invalid_csv') {
    return { kind: 'file_error', code: String(body.code ?? ''), params: (body.params ?? {}) as ErrorParams };
  }
  if (status === 400 && body?.error === 'invalid_rows') {
    return { kind: 'row_errors', validRows: Number(body.valid_rows) || 0, errors: (body.errors ?? []) as ImportRowError[] };
  }
  if (status === 409 && body?.error === 'CATALOGUE_LOCKED') return { kind: 'locked' };
  return { kind: 'failed' };
}

/**
 * Sends the file (dry run or real). An org without a catalogue merchant yet
 * gets one created from its own registration details (the gateway fills name,
 * vertical, country and website from the org), then the call is retried once.
 */
export async function importCatalogueCsv(orgId: string, csv: string, dryRun: boolean): Promise<ImportOutcome> {
  const path = `${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/catalogue/products/import`;
  const send = () => gatewayCall(path, { method: 'POST', body: JSON.stringify({ csv, dry_run: dryRun }) });
  let r = await send();
  if (r.status === 409 && r.body?.error === 'NO_MERCHANT') {
    const m = await gatewayCall(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/catalogue/merchant`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    if (m.status >= 400) return { kind: 'failed' };
    r = await send();
  }
  return toOutcome(r.status, r.body, dryRun);
}
