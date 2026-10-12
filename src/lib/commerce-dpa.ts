/**
 * VTID-05091 — the data processing agreement (AVV), as the supplier reads and
 * signs it on Vitanaland (gateway: VTID-05090).
 *
 * Same shape as the partner terms (commerce-terms.ts): the gateway serves the
 * version in force (GET /partner-onboarding/:orgId/dpa) in one language at a
 * time — the one asked for, German when that translation is missing. German is
 * binding and its text (with the signing declaration) is what the content hash
 * covers, so the hash is the same whichever language is on screen. Signing
 * sends back exactly the version and that hash, the language on screen, the
 * typed name and role, and `declaration_confirmed: true`. Only the supplier's
 * own session can sign — the gateway refuses an AI assistant's delegated token.
 *
 * Until legal publishes a version the gateway answers `published: false` and
 * nothing can be signed. No agreement text lives here: it always comes from
 * the API, as authored.
 */
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';
import { BINDING_TERMS_LOCALE, TERMS_LOCALES } from '@/lib/commerce-terms';

export { TERMS_LANGUAGE_NAMES as DPA_LANGUAGE_NAMES, termsBlocks as dpaBlocks } from '@/lib/commerce-terms';

export const BINDING_DPA_LOCALE = BINDING_TERMS_LOCALE;
/** The gateway's limits for the typed name and role (VTID-05090 parseSignBody). */
export const MAX_SIGNER_NAME = 200;
export const MAX_SIGNER_ROLE = 120;

export interface DpaText {
  title: string;
  body_md: string;
  /** The declaration the signer ticks, authored by legal per language; null when the version has none. */
  signing_declaration: string | null;
}

export interface PartnerDpa {
  id: string;
  version: string;
  published_at: string;
  content_sha256: string;
  binding_locale: string;
  /** The binding German text. */
  binding: DpaText;
  /** The language on screen and its text. */
  locale: string;
  text: DpaText;
  direction: 'ltr' | 'rtl';
  /** The language asked for is missing, so German is shown. */
  fallback: boolean;
  /** The declaration in the language on screen (null → the app's catalogue fallback). */
  signing_declaration: string | null;
  available_locales: string[];
  shown_locale: string;
}

export type DpaStatus =
  | { kind: 'not_published'; required: boolean }
  | { kind: 'unsigned'; required: boolean; dpa: PartnerDpa; resign: boolean }
  | { kind: 'signed'; required: boolean; dpa: PartnerDpa; signedAt: string | null; signedVersion: string };

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

type Json = Record<string, unknown>;

const asText = (v: unknown): DpaText => {
  const o = (v && typeof v === 'object' ? v : {}) as Json;
  return {
    title: String(o.title ?? ''),
    body_md: String(o.body_md ?? ''),
    signing_declaration: str(o.signing_declaration),
  };
};

/** Reads the gateway answer. Exported for tests. */
export function parseDpaStatus(body: unknown): DpaStatus {
  const b = (body && typeof body === 'object' ? body : {}) as Json;
  const required = b.required === true;
  const d = (b.dpa && typeof b.dpa === 'object' ? b.dpa : null) as Json | null;
  if (!b.published || !d || typeof d.version !== 'string' || typeof d.content_sha256 !== 'string') {
    return { kind: 'not_published', required };
  }
  const binding = asText(d.binding);
  const locale = typeof d.locale === 'string' ? d.locale : typeof d.shown_locale === 'string' ? d.shown_locale : BINDING_DPA_LOCALE;
  const available = Array.isArray(d.available_locales)
    ? (d.available_locales as unknown[]).filter((l): l is string => typeof l === 'string' && (TERMS_LOCALES as readonly string[]).includes(l))
    : [BINDING_DPA_LOCALE];
  const text = d.text ? asText(d.text) : binding;
  const dpa: PartnerDpa = {
    id: String(d.id ?? ''),
    version: d.version,
    published_at: String(d.published_at ?? ''),
    content_sha256: d.content_sha256,
    binding_locale: String(d.binding_locale ?? BINDING_DPA_LOCALE),
    binding,
    locale,
    text,
    direction: d.direction === 'rtl' ? 'rtl' : 'ltr',
    fallback: d.fallback === true,
    signing_declaration: str(d.signing_declaration) ?? text.signing_declaration,
    available_locales: available.length ? available : [BINDING_DPA_LOCALE],
    shown_locale: typeof d.shown_locale === 'string' ? d.shown_locale : locale,
  };
  if (b.signed === true) {
    return {
      kind: 'signed',
      required,
      dpa,
      signedAt: typeof b.signed_at === 'string' ? b.signed_at : null,
      signedVersion: typeof b.signed_version === 'string' ? b.signed_version : dpa.version,
    };
  }
  return { kind: 'unsigned', required, dpa, resign: b.resign_required === true };
}

export async function fetchPartnerDpa(orgId: string, locale: string): Promise<DpaStatus> {
  const q = new URLSearchParams({ locale });
  return parseDpaStatus(await adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/dpa?${q.toString()}`));
}

/**
 * The body the gateway needs: the exact version and the binding (German)
 * text's hash, the language that was on screen, the typed name and role
 * (trimmed) and the ticked declaration. Switching language never changes the
 * version or the hash.
 */
export function signBody(dpa: PartnerDpa, signerName: string, signerRole: string) {
  return {
    dpa_version: dpa.version,
    content_sha256: dpa.content_sha256,
    shown_locale: dpa.shown_locale,
    signer_name: signerName.trim(),
    signer_role: signerRole.trim(),
    declaration_confirmed: true as const,
  };
}

/** Name, role and tick are all there, within the gateway's limits. */
export function canSign(signerName: string, signerRole: string, declared: boolean): boolean {
  const n = signerName.trim();
  const r = signerRole.trim();
  return declared && n.length >= 1 && n.length <= MAX_SIGNER_NAME && r.length >= 1 && r.length <= MAX_SIGNER_ROLE;
}

/** The same legal version: switching language must not reset the tick. */
export const sameDpaVersion = (a: PartnerDpa | null, b: PartnerDpa | null) =>
  Boolean(a && b && a.id === b.id && a.version === b.version && a.content_sha256 === b.content_sha256);

/** The agreement changed while it was on screen: show the new text and ask again. */
export const isStaleDpaError = (e: unknown) => e instanceof Error && /DPA_(CONTENT|VERSION)_MISMATCH/.test(e.message);

/** The gateway's refusal codes for a signature, each with its own message. */
export const DPA_SIGN_ERRORS = [
  'DPA_SIGNATURE_REQUIRES_SUPPLIER',
  'DPA_NOT_PUBLISHED',
  'INVALID_SHOWN_LOCALE',
  'INVALID_SIGNATURE',
  'ORG_NOT_FOUND',
  'NOT_ORG_ADMIN',
  'DPA_NOT_REQUIRED',
  'DPA_COMPANY_INCOMPLETE',
  'ACCOUNT_EMAIL_REQUIRED',
] as const;
export type DpaSignErrorCode = (typeof DPA_SIGN_ERRORS)[number];

/** The refusal code in a failed sign call, or null for anything else (network, 5xx). */
export function dpaSignErrorCode(e: unknown): DpaSignErrorCode | null {
  if (!(e instanceof Error)) return null;
  return (DPA_SIGN_ERRORS as readonly string[]).includes(e.message) ? (e.message as DpaSignErrorCode) : null;
}

/**
 * Refusals after which the sheet reloads the agreement and clears the tick:
 * every 409 (the text changed, the business no longer needs a DPA, company
 * facts missing), nothing published any more, or a language the version no
 * longer carries.
 */
/** Each refusal's own message (screens.commerceportal.dpa.*). */
export const DPA_ERROR_KEYS: Record<DpaSignErrorCode, string> = {
  DPA_SIGNATURE_REQUIRES_SUPPLIER: 'screens.commerceportal.dpa.errorRequiresSupplier',
  DPA_NOT_PUBLISHED: 'screens.commerceportal.dpa.errorNotPublished',
  INVALID_SHOWN_LOCALE: 'screens.commerceportal.dpa.errorInvalidLocale',
  INVALID_SIGNATURE: 'screens.commerceportal.dpa.errorInvalidSignature',
  ORG_NOT_FOUND: 'screens.commerceportal.dpa.errorOrgNotFound',
  NOT_ORG_ADMIN: 'screens.commerceportal.dpa.errorNotOrgAdmin',
  DPA_NOT_REQUIRED: 'screens.commerceportal.dpa.errorNotRequired',
  DPA_COMPANY_INCOMPLETE: 'screens.commerceportal.dpa.errorCompanyIncomplete',
  ACCOUNT_EMAIL_REQUIRED: 'screens.commerceportal.dpa.errorAccountEmailRequired',
};

export const DPA_RELOAD_ERRORS: readonly DpaSignErrorCode[] = ['DPA_NOT_PUBLISHED', 'INVALID_SHOWN_LOCALE', 'DPA_NOT_REQUIRED', 'DPA_COMPANY_INCOMPLETE'];

export async function signPartnerDpa(orgId: string, dpa: PartnerDpa, signerName: string, signerRole: string): Promise<unknown> {
  return adminFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/dpa/sign`, {
    method: 'POST',
    body: JSON.stringify(signBody(dpa, signerName, signerRole)),
  });
}

/** The `dpa` step of the onboarding checklist (GET /partner-onboarding/:orgId → checklist.steps). */
export interface DpaChecklistStep {
  required: boolean;
  status: string;
  missing?: string[];
  detail?: Record<string, unknown>;
}

/** Picks the `dpa` step out of the checklist the hub already loads. */
export function dpaStepOf(checklist: unknown): DpaChecklistStep | null {
  const steps = (checklist as { steps?: unknown } | null | undefined)?.steps;
  if (!Array.isArray(steps)) return null;
  const s = steps.find((x) => x && typeof x === 'object' && (x as { key?: unknown }).key === 'dpa') as Record<string, unknown> | undefined;
  if (!s) return null;
  return {
    required: s.required === true,
    status: typeof s.status === 'string' ? s.status : 'todo',
    missing: Array.isArray(s.missing) ? (s.missing as unknown[]).filter((m): m is string => typeof m === 'string') : undefined,
    detail: s.detail && typeof s.detail === 'object' ? (s.detail as Record<string, unknown>) : undefined,
  };
}

export type DpaRowState =
  | { kind: 'pending_legal' }
  | { kind: 'todo'; version: string | null }
  | { kind: 'resign'; version: string }
  | { kind: 'signed'; version: string | null; signedAt: string | null };

/**
 * What the hub's DPA row shows. Nothing when the checklist does not require a
 * DPA for this business. The DPA read (version, date) wins when it loaded;
 * otherwise the checklist step alone decides.
 */
export function deriveDpaRow(step: DpaChecklistStep | null, status: DpaStatus | null): DpaRowState | null {
  if (!step || !step.required) return null;
  if (status) {
    if (status.kind === 'not_published') return { kind: 'pending_legal' };
    if (status.kind === 'signed') return { kind: 'signed', version: status.signedVersion, signedAt: status.signedAt };
    return status.resign ? { kind: 'resign', version: status.dpa.version } : { kind: 'todo', version: status.dpa.version };
  }
  if (step.missing?.includes('dpa_not_published')) return { kind: 'pending_legal' };
  if (step.status === 'done') return { kind: 'signed', version: null, signedAt: null };
  const v = step.detail?.current_version;
  return { kind: 'todo', version: typeof v === 'string' ? v : null };
}
