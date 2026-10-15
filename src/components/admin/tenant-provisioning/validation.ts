/**
 * VTID-05221 — pure client-side validators for the exafy-admin "New community"
 * panel. Every rule mirrors the gateway's own request schemas
 * (vitana-platform services/gateway/src/services/tenant-provisioning/schemas.ts:
 * ProvisionTenantSchema, TenantBrandPackPatchSchema), so a value that passes
 * here is one the server accepts. The server stays the authority: it re-checks
 * everything, plus slug availability (SLUG_TAKEN) and the readiness gate.
 *
 * Validators return an error key relative to
 * `tenantProvisioning.validation.*`, or null when the value is valid.
 * The builders return request bodies holding only the fields the admin set.
 */
import reservedSlugsFile from '@/generated/reserved-tenant-slugs.json';
import type { ProvisionTenantInput, TenantBrandPackPatch } from '@/lib/tenant-provisioning-api';

/** Byte-identical copy of schemas.ts SLUG_RE. */
export const TENANT_SLUG_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/** schemas.ts EMAIL_RE. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** schemas.ts HEX_COLOR. */
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
/** schemas.ts LOCALE. */
const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
/** schemas.ts currency: ISO 4217, upper case. */
const CURRENCY_RE = /^[A-Z]{3}$/;
/** schemas.ts JEV_MONTHLY_BUDGET_MAX_USD. */
export const JEV_BUDGET_MAX_USD = 500;

const SLUG_MIN = 3;
const SLUG_MAX = 32;
const NAME_MAX = 80;
const LEGAL_LINE_MAX = 200;
const EMAIL_MAX = 254;
const TIMEZONE_MAX = 64;
const LOCALES_MAX = 20;
const FACT_MAX = 200;
const FACT_LIST_MAX = 8;
const OVERRIDE_MIN = 10;
const OVERRIDE_MAX = 500;

export type ValidationKey =
  | 'required'
  | 'tooLong'
  | 'slugLength'
  | 'slugFormat'
  | 'slugReserved'
  | 'email'
  | 'hexColor'
  | 'colorsIncomplete'
  | 'budgetRange'
  | 'locale'
  | 'localeList'
  | 'currency'
  | 'factTooLong'
  | 'factListTooLong'
  | 'anchorNameRequired'
  | 'overrideReasonLength'
  | 'nothingToUpdate';

const RESERVED = new Set<string>((reservedSlugsFile as { reserved: string[] }).reserved.map((s) => s.toLowerCase()));

/** True when the slug is a top-level route or platform prefix (provision_tenant refuses it). */
export function isReservedTenantSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

export function validateSlug(raw: string): ValidationKey | null {
  const slug = raw.trim();
  if (!slug) return 'required';
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return 'slugLength';
  if (!TENANT_SLUG_RE.test(slug)) return 'slugFormat';
  if (isReservedTenantSlug(slug)) return 'slugReserved';
  return null;
}

/** Trimmed text, 1..max. Empty is `required` only when the field is required. */
export function validateText(raw: string, max: number, required: boolean): ValidationKey | null {
  const v = raw.trim();
  if (!v) return required ? 'required' : null;
  if (v.length > max) return 'tooLong';
  return null;
}

export function validateEmail(raw: string, required: boolean): ValidationKey | null {
  const v = raw.trim();
  if (!v) return required ? 'required' : null;
  if (v.length > EMAIL_MAX || !EMAIL_RE.test(v)) return 'email';
  return null;
}

/** Optional `#RRGGBB`; empty is valid (not set). */
export function validateHexColor(raw: string): ValidationKey | null {
  const v = raw.trim();
  if (!v) return null;
  return HEX_COLOR_RE.test(v) ? null : 'hexColor';
}

/** Optional Jev monthly budget in USD, 0..500; empty is valid (not set). */
export function validateBudget(raw: string): ValidationKey | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^\d+(\.\d+)?$/.test(v)) return 'budgetRange';
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > JEV_BUDGET_MAX_USD) return 'budgetRange';
  return null;
}

export function validateLocale(raw: string): ValidationKey | null {
  const v = raw.trim();
  if (!v) return null;
  return LOCALE_RE.test(v) ? null : 'locale';
}

/** Splits a comma / whitespace separated locale list ("de, en"). */
export function parseLocaleList(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateLocaleList(raw: string): ValidationKey | null {
  const list = parseLocaleList(raw);
  if (list.length === 0) return null;
  if (list.length > LOCALES_MAX || list.some((l) => !LOCALE_RE.test(l))) return 'localeList';
  return null;
}

export function validateCurrency(raw: string): ValidationKey | null {
  const v = raw.trim();
  if (!v) return null;
  return CURRENCY_RE.test(v) ? null : 'currency';
}

/** One fact per line; blank lines are ignored. */
export function parseFactList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateFactList(raw: string): ValidationKey | null {
  const list = parseFactList(raw);
  if (list.length > FACT_LIST_MAX) return 'factListTooLong';
  if (list.some((f) => f.length > FACT_MAX)) return 'factTooLong';
  return null;
}

function validateFact(raw: string): ValidationKey | null {
  return raw.trim().length > FACT_MAX ? 'factTooLong' : null;
}

function pruneErrors<T extends string>(
  errors: Partial<Record<T, ValidationKey | null>>,
): Partial<Record<T, ValidationKey>> {
  const out: Partial<Record<T, ValidationKey>> = {};
  for (const [k, v] of Object.entries(errors) as [T, ValidationKey | null][]) {
    if (v) out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 1 — ProvisionTenantSchema
// ---------------------------------------------------------------------------

export interface ProvisionFormValues {
  slug: string;
  name: string;
  displayName: string;
  adminEmail: string;
  allMembersGroupName: string;
  defaultLocale: string;
  enabledLocales: string;
  timezone: string;
  currency: string;
  jevBudget: string;
}

export type ProvisionField = keyof ProvisionFormValues;
export type ProvisionFormErrors = Partial<Record<ProvisionField, ValidationKey>>;

export function emptyProvisionForm(): ProvisionFormValues {
  return {
    slug: '',
    name: '',
    displayName: '',
    adminEmail: '',
    allMembersGroupName: '',
    defaultLocale: '',
    enabledLocales: '',
    timezone: '',
    currency: '',
    jevBudget: '',
  };
}

export function validateProvisionForm(v: ProvisionFormValues): ProvisionFormErrors {
  return pruneErrors<ProvisionField>({
    slug: validateSlug(v.slug),
    name: validateText(v.name, NAME_MAX, true),
    displayName: validateText(v.displayName, NAME_MAX, false),
    adminEmail: validateEmail(v.adminEmail, true),
    allMembersGroupName: validateText(v.allMembersGroupName, NAME_MAX, true),
    defaultLocale: validateLocale(v.defaultLocale),
    enabledLocales: validateLocaleList(v.enabledLocales),
    timezone: validateText(v.timezone, TIMEZONE_MAX, false),
    currency: validateCurrency(v.currency),
    jevBudget: validateBudget(v.jevBudget),
  });
}

/** POST /api/v1/admin/tenants body: required fields always, optional ones only when set. */
export function buildProvisionBody(v: ProvisionFormValues): ProvisionTenantInput {
  const body: ProvisionTenantInput = {
    slug: v.slug.trim(),
    name: v.name.trim(),
    admin_email: v.adminEmail.trim(),
    all_members_group_name: v.allMembersGroupName.trim(),
  };
  if (v.displayName.trim()) body.display_name = v.displayName.trim();
  if (v.jevBudget.trim()) body.jev_monthly_budget_usd = Number(v.jevBudget.trim());
  if (v.defaultLocale.trim()) body.default_locale = v.defaultLocale.trim();
  const locales = parseLocaleList(v.enabledLocales);
  if (locales.length) body.enabled_locales = locales;
  if (v.timezone.trim()) body.timezone = v.timezone.trim();
  if (v.currency.trim()) body.currency = v.currency.trim();
  return body;
}

// ---------------------------------------------------------------------------
// Step 2 — TenantBrandPackPatchSchema (minus the step-1 overlap fields)
// ---------------------------------------------------------------------------

export const LANDING_CTAS = ['invite_only', 'signup', 'waitlist'] as const;
export type LandingCta = (typeof LANDING_CTAS)[number];

export interface BrandPackFormValues {
  colorAccent: string;
  colorBg: string;
  colorFg: string;
  legalEntityLine: string;
  supportEmail: string;
  senderName: string;
  senderEmail: string;
  landingCta: LandingCta | '';
  openSignup: boolean;
  /** True once the admin touched the open sign-up switch (only then is it sent). */
  openSignupTouched: boolean;
  communityName: string;
  communityPronunciation: string;
  anchorName: string;
  anchorPronunciation: string;
  anchorRole: string;
  storyFacts: string;
  offerFacts: string;
  tone: string;
  overrideReason: string;
}

export type BrandPackField = keyof BrandPackFormValues;
export type BrandPackFormErrors = Partial<Record<BrandPackField | 'form', ValidationKey>>;

export function emptyBrandPackForm(): BrandPackFormValues {
  return {
    colorAccent: '',
    colorBg: '',
    colorFg: '',
    legalEntityLine: '',
    supportEmail: '',
    senderName: '',
    senderEmail: '',
    landingCta: '',
    openSignup: false,
    openSignupTouched: false,
    communityName: '',
    communityPronunciation: '',
    anchorName: '',
    anchorPronunciation: '',
    anchorRole: '',
    storyFacts: '',
    offerFacts: '',
    tone: '',
    overrideReason: '',
  };
}

const COLOR_FIELDS = ['colorAccent', 'colorBg', 'colorFg'] as const;

/**
 * `overrideRequired` is true only after the server answered TENANT_NOT_READY
 * for an open sign-up request; the reason is then needed while open sign-up
 * stays on.
 */
export function validateBrandPackForm(v: BrandPackFormValues, overrideRequired: boolean): BrandPackFormErrors {
  const anyColor = COLOR_FIELDS.some((f) => v[f].trim());
  const colorError = (f: (typeof COLOR_FIELDS)[number]): ValidationKey | null =>
    validateHexColor(v[f]) ?? (anyColor && !v[f].trim() ? 'colorsIncomplete' : null);
  const anyAnchor = Boolean(v.anchorName.trim() || v.anchorPronunciation.trim() || v.anchorRole.trim());
  const needsOverride = overrideRequired && v.openSignup;
  const reason = v.overrideReason.trim();

  const errors = pruneErrors<BrandPackField | 'form'>({
    colorAccent: colorError('colorAccent'),
    colorBg: colorError('colorBg'),
    colorFg: colorError('colorFg'),
    legalEntityLine: validateText(v.legalEntityLine, LEGAL_LINE_MAX, false),
    supportEmail: validateEmail(v.supportEmail, false),
    senderName: validateText(v.senderName, NAME_MAX, false),
    senderEmail: validateEmail(v.senderEmail, false),
    communityName: validateFact(v.communityName),
    communityPronunciation: validateFact(v.communityPronunciation),
    anchorName: anyAnchor && !v.anchorName.trim() ? 'anchorNameRequired' : validateFact(v.anchorName),
    anchorPronunciation: validateFact(v.anchorPronunciation),
    anchorRole: validateFact(v.anchorRole),
    storyFacts: validateFactList(v.storyFacts),
    offerFacts: validateFactList(v.offerFacts),
    tone: validateFactList(v.tone),
    overrideReason:
      needsOverride && (reason.length < OVERRIDE_MIN || reason.length > OVERRIDE_MAX) ? 'overrideReasonLength' : null,
    form: null,
  });
  if (Object.keys(errors).length === 0 && Object.keys(buildBrandPackPatch(v, overrideRequired)).length === 0) {
    errors.form = 'nothingToUpdate';
  }
  return errors;
}

/** PATCH /api/v1/admin/tenants/:id body: only the fields the admin set. */
export function buildBrandPackPatch(v: BrandPackFormValues, overrideRequired: boolean): TenantBrandPackPatch {
  const patch: TenantBrandPackPatch = {};
  if (COLOR_FIELDS.some((f) => v[f].trim())) {
    patch.brand = { colors: { accent: v.colorAccent.trim(), bg: v.colorBg.trim(), fg: v.colorFg.trim() } };
  }
  if (v.legalEntityLine.trim()) patch.legal_entity_line = v.legalEntityLine.trim();
  if (v.supportEmail.trim()) patch.support_email = v.supportEmail.trim();
  if (v.senderName.trim()) patch.sender_name = v.senderName.trim();
  if (v.senderEmail.trim()) patch.sender_email = v.senderEmail.trim();
  if (v.landingCta) patch.landing = { cta: v.landingCta };
  if (v.openSignupTouched) patch.open_signup = v.openSignup;

  const facts: NonNullable<TenantBrandPackPatch['persona_facts']> = {};
  if (v.communityName.trim()) facts.community_name = v.communityName.trim();
  if (v.communityPronunciation.trim()) facts.community_pronunciation = v.communityPronunciation.trim();
  if (v.anchorName.trim()) {
    facts.anchor_person = {
      name: v.anchorName.trim(),
      ...(v.anchorPronunciation.trim() ? { pronunciation: v.anchorPronunciation.trim() } : {}),
      ...(v.anchorRole.trim() ? { role: v.anchorRole.trim() } : {}),
    };
  }
  const story = parseFactList(v.storyFacts);
  if (story.length) facts.story_facts = story;
  const offer = parseFactList(v.offerFacts);
  if (offer.length) facts.offer_facts = offer;
  const tone = parseFactList(v.tone);
  if (tone.length) facts.tone = tone;
  if (Object.keys(facts).length) patch.persona_facts = facts;

  // override_reason alone is "nothing to update" on the server; send it only
  // with the open sign-up request it justifies.
  if (overrideRequired && v.openSignup && v.overrideReason.trim() && Object.keys(patch).length) {
    patch.override_reason = v.overrideReason.trim();
  }
  return patch;
}
