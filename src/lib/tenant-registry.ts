/**
 * VTID-05151 — the tenant registry.
 *
 * The app used to compile its tenants in by name (`TenantType = "maxina" |
 * "alkalma"`, TENANT_CONFIGS) and rendered every other tenant as Maxina. The
 * registry is now data: the platform's public read function
 * `list_public_tenants()` (vitana-platform migration 20261014000600) returns
 * every active community with a whitelisted set of public fields, readable
 * before sign-in.
 *
 * This module is pure: types, validation, lookups and the routing decisions
 * every consumer used to hardcode. The React side lives in
 * src/hooks/useTenantRegistry.ts.
 *
 * COMPILED_MAXINA_FALLBACK is a safety net for ONE case: the registry call
 * failed (network, 5xx, function not yet applied). It is never used for an
 * unknown slug — an unknown slug is unknown.
 */
import { supabase } from '@/integrations/supabase/client';
import { canonicalTenantSlug, RETIRED_TENANT_SLUGS } from '@/lib/retired-tenants';
import reservedSlugsFile from '@/generated/reserved-tenant-slugs.json';

export type TenantSlug = string;

export interface TenantBrand {
  accent?: string;
  bg?: string;
  fg?: string;
  logo_path?: string;
  favicon_path?: string;
  og_image_path?: string;
}

export interface TenantLanding {
  /** locale (e.g. "de", "en") → tagline */
  tagline?: Record<string, string>;
  intro?: boolean;
  auto_switch_on_visit?: boolean;
  post_login_path?: string;
  oauth?: boolean;
}

/** One row of `list_public_tenants()` / `resolve_tenant()`. */
export interface TenantEntry {
  tenant_id: string;
  slug: TenantSlug;
  name: string;
  display_name: string;
  open_signup: boolean;
  brand: TenantBrand;
  landing: TenantLanding;
  /** null = every platform GA locale */
  locales: string[] | null;
}

export type RegistrySource = 'rpc' | 'snapshot' | 'fallback';

export interface TenantRegistry {
  source: RegistrySource;
  tenants: TenantEntry[];
}

/** A tenant slug as provisioned: lower-case, 2–40 chars, letters/digits/hyphens. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** localStorage key of the registry snapshot for synchronous callers. */
export const REGISTRY_SNAPSHOT_KEY = 'tenant_registry_v1';

/**
 * Today's Maxina, as the app compiled it in before VTID-05151 (brand colours
 * from the old TENANT_CONFIGS, landing behaviour from the old routing
 * branches). Used only when the registry call fails. tenant_id is unknown here;
 * useTenant resolves it from the session or the tenants row.
 */
export const COMPILED_MAXINA_FALLBACK: Readonly<TenantEntry> = Object.freeze({
  tenant_id: '',
  slug: 'maxina',
  name: 'Maxina',
  display_name: 'Maxina',
  open_signup: true,
  brand: Object.freeze({ accent: '#FF7BAC', bg: '#FFF5F8', fg: '#1A1A1A' }),
  landing: Object.freeze({ intro: true, auto_switch_on_visit: true, post_login_path: '/onboarding/welcome', oauth: true }),
  locales: null,
}) as Readonly<TenantEntry>;

export const FALLBACK_REGISTRY: TenantRegistry = Object.freeze({
  source: 'fallback',
  tenants: [COMPILED_MAXINA_FALLBACK as TenantEntry],
}) as TenantRegistry;

export interface ResolvedTenant {
  tenant_id: string;
  /**
   * Always "" — kept on purpose. Before VTID-05151 the merged config always
   * yielded id:"" and AppLayout keys the sidebar state on `tenant?.id ||
   * "global"`; a real UUID here would reset every member's sidebar state.
   * The UUID is in `tenantId` / `tenant_id`.
   */
  id: "";
  tenantId: string;
  slug: string;
  /** The display name (registry display_name). */
  name: string;
  displayName: string;
  openSignup: boolean;
  landing: TenantLanding;
  brandAccent?: string;
  brandBg?: string;
  brandFg?: string;
}

// ── validation ──────────────────────────────────────────────────────────

/** `#rrggbb` or undefined — a database value can never inject CSS. */
export function safeHex(v: unknown): string | undefined {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined;
}

/**
 * An in-app path or `/home`. Open-redirect guard for `post_login_path` and
 * similar data-driven targets: must start with a single `/`, no scheme, no
 * protocol-relative `//`, no backslash tricks, no control characters.
 */
export function safeInternalPath(p: unknown, fallback = '/home'): string {
  if (typeof p !== 'string') return fallback;
  const v = p.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return fallback;
  if (/^\/[^/?#]*:/.test(v)) return fallback;
  return v;
}

const ASSET_PATH_RE = /^[a-z0-9][a-z0-9-]{1,39}\/[A-Za-z0-9._/-]+$/;

/**
 * Public URL of a tenant asset (`<slug>/logo.svg`) in the `tenant-assets`
 * bucket. Only relative paths inside a tenant folder are accepted; an
 * absolute URL, `..` or anything else returns undefined. With `slug`, the
 * path must also live in that tenant's folder.
 */
export function assetUrl(path: unknown, slug?: string): string | undefined {
  if (typeof path !== 'string' || !ASSET_PATH_RE.test(path) || path.split('/').includes('..')) return undefined;
  if (slug && !path.startsWith(`${slug}/`)) return undefined;
  return supabase.storage.from('tenant-assets').getPublicUrl(path).data.publicUrl;
}

const RESERVED = new Set<string>((reservedSlugsFile as { reserved: string[] }).reserved);

/** True when `slug` is a top-level route or platform prefix (never a tenant). */
export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

function normalizeLanding(raw: unknown): TenantLanding {
  const l = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: TenantLanding = {};
  if (l.tagline && typeof l.tagline === 'object') {
    const tag: Record<string, string> = {};
    for (const [k, v] of Object.entries(l.tagline as Record<string, unknown>)) if (typeof v === 'string') tag[k] = v;
    if (Object.keys(tag).length) out.tagline = tag;
  }
  if (typeof l.intro === 'boolean') out.intro = l.intro;
  if (typeof l.auto_switch_on_visit === 'boolean') out.auto_switch_on_visit = l.auto_switch_on_visit;
  if (typeof l.post_login_path === 'string') out.post_login_path = l.post_login_path;
  if (typeof l.oauth === 'boolean') out.oauth = l.oauth;
  return out;
}

function normalizeBrand(raw: unknown): TenantBrand {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: TenantBrand = {};
  const accent = safeHex(b.accent);
  const bg = safeHex(b.bg);
  const fg = safeHex(b.fg);
  if (accent) out.accent = accent;
  if (bg) out.bg = bg;
  if (fg) out.fg = fg;
  for (const k of ['logo_path', 'favicon_path', 'og_image_path'] as const) if (typeof b[k] === 'string') out[k] = b[k] as string;
  return out;
}

/** Validate one RPC row; anything malformed is dropped (null). */
export function normalizeEntry(raw: unknown): TenantEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.slug !== 'string' || !SLUG_RE.test(r.slug)) return null;
  if (typeof r.tenant_id !== 'string' || typeof r.name !== 'string') return null;
  return {
    tenant_id: r.tenant_id,
    slug: r.slug,
    name: r.name,
    display_name: typeof r.display_name === 'string' && r.display_name ? r.display_name : r.name,
    open_signup: r.open_signup === true,
    brand: normalizeBrand(r.brand),
    landing: normalizeLanding(r.landing),
    locales: Array.isArray(r.locales) ? r.locales.filter((x): x is string => typeof x === 'string') : null,
  };
}

// ── fetching ────────────────────────────────────────────────────────────

/**
 * `list_public_tenants()` over GET (STABLE function; the staging read-only
 * guard aborts non-GET Supabase calls). Throws on error — the caller decides
 * about the fallback.
 */
export async function fetchTenantRegistry(): Promise<TenantEntry[]> {
  // The function is newer than the generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('list_public_tenants', undefined, { get: true });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(normalizeEntry).filter((e): e is TenantEntry => !!e);
}

/** `resolve_tenant(p_slug)` over GET: the entry, or null for an unknown slug. Throws on error. */
export async function fetchTenantBySlug(slug: string): Promise<TenantEntry | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('resolve_tenant', { p_slug: slug }, { get: true });
  if (error) throw error;
  const rows = ((data ?? []) as unknown[]).map(normalizeEntry).filter((e): e is TenantEntry => !!e);
  return rows[0] ?? null;
}

// ── snapshot (synchronous callers) ──────────────────────────────────────

// Render-path callers (the top bar) read the snapshot on every render; parse once per stored value.
let snapshotCache: { raw: string; tenants: TenantEntry[] | null } | null = null;

export function readRegistrySnapshot(): TenantEntry[] | null {
  try {
    const raw = localStorage.getItem(REGISTRY_SNAPSHOT_KEY);
    if (!raw) return null;
    if (snapshotCache?.raw === raw) return snapshotCache.tenants;
    const parsed = JSON.parse(raw) as { tenants?: unknown[] };
    const tenants = Array.isArray(parsed?.tenants)
      ? parsed.tenants.map(normalizeEntry).filter((e): e is TenantEntry => !!e)
      : [];
    snapshotCache = { raw, tenants: tenants.length ? tenants : null };
    return snapshotCache.tenants;
  } catch {
    return null;
  }
}

export function writeRegistrySnapshot(tenants: TenantEntry[]): void {
  try {
    localStorage.setItem(REGISTRY_SNAPSHOT_KEY, JSON.stringify({ at: Date.now(), tenants }));
  } catch {
    // Storage unavailable (private mode, quota): the snapshot is a convenience.
  }
}

/** The registry for code that cannot wait: snapshot, else the compiled Maxina fallback. */
export function currentRegistrySync(): TenantRegistry {
  const snap = readRegistrySnapshot();
  return snap ? { source: 'snapshot', tenants: snap } : FALLBACK_REGISTRY;
}

// ── lookups ─────────────────────────────────────────────────────────────

export function findBySlug(reg: TenantRegistry, slug: string | null | undefined): TenantEntry | undefined {
  if (!slug) return undefined;
  const s = canonicalTenantSlug(slug.trim().toLowerCase());
  return reg.tenants.find((t) => t.slug === s);
}

export function findById(reg: TenantRegistry, tenantId: string | null | undefined): TenantEntry | undefined {
  if (!tenantId) return undefined;
  return reg.tenants.find((t) => t.tenant_id && t.tenant_id === tenantId);
}

/** The registry slug a pathname belongs to (first segment, retired slugs mapped), or null. */
export function tenantSlugFromPath(pathname: string, reg: TenantRegistry): string | null {
  const seg = pathname.split('?')[0].replace(/^\/+/, '').split('/')[0];
  if (!seg) return null;
  return findBySlug(reg, seg)?.slug ?? null;
}

/** True for a tenant portal path: `/<registry slug>` or below it, or a retired tenant's path. */
export function isTenantPortalPath(pathname: string, reg: TenantRegistry): boolean {
  const seg = pathname.split('?')[0].replace(/^\/+/, '').split('/')[0].toLowerCase();
  if (!seg) return false;
  return seg in RETIRED_TENANT_SLUGS || !!findBySlug(reg, seg);
}

// ── routing decisions (formerly hardcoded per tenant) ───────────────────

/** Sign-in portal for a tenant: `/<slug>` for a registry slug, else `fallback`. */
export function tenantLoginRoute(slug: string | null | undefined, reg: TenantRegistry, fallback: string): string {
  const entry = findBySlug(reg, slug);
  return entry ? `/${entry.slug}` : fallback;
}

/**
 * Where a signed-in community member of `slug` lands. Unknown tenant → /home
 * (it used to be /maxina). A target that is a tenant portal is replaced by
 * /home, so landing can never loop back into a portal.
 */
export function communityLandingPath(slug: string | null | undefined, reg: TenantRegistry): string {
  const entry = findBySlug(reg, slug);
  if (!entry) return '/home';
  const target = safeInternalPath(entry.landing.post_login_path ?? '/onboarding/welcome');
  return isTenantPortalPath(target, reg) ? '/home' : target;
}

/** The brand name shown in chrome (sidebar header, top bar). Empty when nothing is known. */
export function tenantDisplayNameFor(slug: string | null | undefined, reg: TenantRegistry): string {
  return findBySlug(reg, slug)?.display_name ?? '';
}

/**
 * The sidebar header's tenant name (AppLayout), in the order it always used:
 * portal URL → persisted slug → active tenant → sign-up metadata → "Community".
 * `fallbackLabel` is the caller's (translated) final fallback.
 */
export function sidebarTenantName(
  input: {
    pathname: string;
    storedSlug: string | null;
    tenantName?: string | null;
    metadataSlug?: string | null;
  },
  reg: TenantRegistry,
  fallbackLabel = 'Community',
): string {
  return (
    tenantDisplayNameFor(tenantSlugFromPath(input.pathname, reg), reg) ||
    tenantDisplayNameFor(input.storedSlug, reg) ||
    input.tenantName ||
    tenantDisplayNameFor(input.metadataSlug, reg) ||
    fallbackLabel
  );
}

/** Where the sidebar logo goes after sign-out: the tenant's portal, else `/`. */
export function logoClickTarget(slug: string | null | undefined, reg: TenantRegistry): string {
  return tenantLoginRoute(slug, reg, '/');
}

// ── the active tenant (useTenant) ───────────────────────────────────────

/** Registry entry → the shape consumers read. */
export function resolvedTenantFromEntry(entry: TenantEntry, tenantId: string): ResolvedTenant {
  return {
    tenant_id: tenantId,
    id: "",
    tenantId,
    slug: entry.slug,
    name: entry.display_name,
    displayName: entry.display_name,
    openSignup: entry.open_signup,
    landing: entry.landing,
    brandAccent: safeHex(entry.brand.accent),
    brandBg: safeHex(entry.brand.bg),
    brandFg: safeHex(entry.brand.fg),
  };
}

/**
 * A tenant the registry does not list (inactive, platform, or the registry
 * call failed): neutral — its own database name, no brand, no landing. Never
 * another tenant's brand.
 */
export function neutralTenant(row: { tenant_id: string; slug: string | null; name: string }): ResolvedTenant {
  return {
    tenant_id: row.tenant_id,
    id: "",
    tenantId: row.tenant_id,
    slug: row.slug ?? "",
    name: row.name,
    displayName: row.name,
    openSignup: false,
    landing: {},
  };
}

/**
 * The active tenant: the registry entry with that id; else (registry failed
 * and only knows the compiled Maxina without an id) the registry entry with the
 * row's slug; else neutral.
 */
export function resolveActiveTenant(
  activeTenantId: string | null,
  reg: TenantRegistry,
  row: { tenant_id: string; slug: string | null; name: string } | null | undefined,
): ResolvedTenant | null {
  if (!activeTenantId) return null;
  const byId = findById(reg, activeTenantId);
  if (byId) return resolvedTenantFromEntry(byId, activeTenantId);
  if (!row) return null;
  const bySlug = findBySlug(reg, row.slug);
  if (bySlug && (!bySlug.tenant_id || bySlug.tenant_id === row.tenant_id)) return resolvedTenantFromEntry(bySlug, row.tenant_id);
  return neutralTenant(row);
}
