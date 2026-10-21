/**
 * VTID-05242 (mt-frontend-brand/brand-surface) — member-facing brand values
 * come from the active tenant, with Maxina as the compiled fallback.
 *
 * Two things live here:
 *
 *  - `activeTenantSlug()` / `useActiveTenantSlug()`: the slug a member-facing
 *    surface (voucher redemption, the OAuth retry in AuthGuard) should use
 *    instead of a literal `'maxina'`. Order: the active tenant (useTenant) →
 *    the extra candidates the caller passes (e.g. the persisted slug) → the
 *    custom-domain mapping → `maxina`. `useTenantPortal()` turns that slug
 *    into the portal path, brand name and logo the voucher screens render.
 *  - `useTenantMeta()`: sets `document.title` and the favicon href from the
 *    registry entry of the active tenant. Mounted once in AppHooksInitializer
 *    (src/App.tsx).
 *
 * Maxina stays byte-identical: for Maxina, or when no registry tenant is
 * active, `useTenantMeta()` writes nothing — index.html and each page's own
 * <SEO> keep owning the title and favicon exactly as before. Only a
 * non-Maxina registry tenant overrides them, and the override is undone when
 * that tenant is no longer active.
 *
 * Deliberately NO OG / <meta> mutation (round-1 R1-F4): share-card crawlers
 * do not run JS, so per-tenant share cards belong to the server-side OG
 * workers (lane email-brand-code).
 */
import { useEffect, useMemo, useRef } from 'react';
import { DOMAIN_TENANT_MAP } from '@/config/domain-tenant-mapping';
import { useTenantSafe } from '@/hooks/useTenant';
import { useTenantRegistry } from '@/hooks/useTenantRegistry';
import { canonicalTenantSlug } from '@/lib/retired-tenants';
import {
  SLUG_RE,
  assetUrl,
  currentRegistrySync,
  findBySlug,
  isReservedSlug,
  tenantLoginRoute,
  type TenantRegistry,
} from '@/lib/tenant-registry';

/** The compiled default tenant (the slug every surface used to hardcode). */
export const MAXINA_SLUG = 'maxina';

/** Maxina's compiled title and favicon — the values in index.html. */
export const MAXINA_META: Readonly<{ title: string; faviconHref: string }> = Object.freeze({
  title: 'VITANA Platform',
  faviconHref: '/favicon.ico',
});

function cleanSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = canonicalTenantSlug(value.trim().toLowerCase());
  return s && SLUG_RE.test(s) && !isReservedSlug(s) ? s : null;
}

/** The tenant a custom domain maps to (`vitanaland.com` → `maxina`), or null. */
export function hostTenantSlug(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  return cleanSlug(DOMAIN_TENANT_MAP[hostname.toLowerCase()]);
}

/**
 * The first valid slug of: the active tenant, the caller's extra candidates,
 * the custom-domain mapping; else `maxina`. A malformed or reserved value is
 * skipped, never used as a path.
 */
export function activeTenantSlug(input: {
  tenantSlug?: string | null;
  candidates?: Array<string | null | undefined>;
  hostname?: string | null;
}): string {
  for (const c of [input.tenantSlug, ...(input.candidates ?? [])]) {
    const s = cleanSlug(c);
    if (s) return s;
  }
  return hostTenantSlug(input.hostname) ?? MAXINA_SLUG;
}

function currentHostname(): string | null {
  return typeof window !== 'undefined' ? window.location.hostname : null;
}

/** `activeTenantSlug()` for the active tenant of this render (works outside a TenantProvider). */
export function useActiveTenantSlug(candidates: Array<string | null | undefined> = []): string {
  const ctx = useTenantSafe();
  return activeTenantSlug({ tenantSlug: ctx?.tenant?.slug, candidates, hostname: currentHostname() });
}

/** Maxina's compiled header logo (voucher redemption). */
export const MAXINA_LOGO: Readonly<{ src: string; alt: string }> = Object.freeze({
  src: '/images/maxina-logo.png',
  alt: 'MAXINA',
});

export interface TenantPortal {
  slug: string;
  isMaxina: boolean;
  /** `/<slug>` for a registry or legacy portal, else `/maxina`. */
  portalPath: string;
  /** Registry display name; '' for Maxina (callers keep their Maxina copy). */
  brandName: string;
  /** Maxina's compiled logo for Maxina; the tenant's registry logo otherwise, null when it has none. */
  logoUrl: string | null;
}

/** Portal path, name and logo of `slug`; Maxina's compiled values as the fallback. */
export function tenantPortalFor(slug: string, reg: TenantRegistry): TenantPortal {
  const portalPath = tenantLoginRoute(slug, reg, `/${MAXINA_SLUG}`);
  const portalSlug = portalPath.slice(1);
  if (portalSlug === MAXINA_SLUG) {
    return { slug: MAXINA_SLUG, isMaxina: true, portalPath, brandName: '', logoUrl: MAXINA_LOGO.src };
  }
  const entry = findBySlug(reg, portalSlug);
  return {
    slug: portalSlug,
    isMaxina: false,
    portalPath,
    brandName: entry?.display_name || entry?.name || portalSlug,
    logoUrl: (entry && assetUrl(entry.brand.logo_path, entry.slug)) ?? null,
  };
}

/** `tenantPortalFor()` of the active tenant (registry snapshot; no QueryClient needed). */
export function useTenantPortal(): TenantPortal {
  const slug = useActiveTenantSlug();
  return useMemo(() => tenantPortalFor(slug, currentRegistrySync()), [slug]);
}

export interface TenantMeta {
  title: string;
  faviconHref: string;
  /** false = Maxina / no registry tenant: nothing is written. */
  isOverride: boolean;
}

/** Title + favicon for `slug` from the registry; Maxina's compiled values for Maxina or an unknown slug. */
export function tenantMetaFor(slug: string | null | undefined, reg: TenantRegistry): TenantMeta {
  const entry = findBySlug(reg, slug);
  if (!entry || entry.slug === MAXINA_SLUG) return { ...MAXINA_META, isOverride: false };
  return {
    title: entry.display_name || entry.name,
    faviconHref: assetUrl(entry.brand.favicon_path, entry.slug) ?? MAXINA_META.faviconHref,
    isOverride: true,
  };
}

const ORIGINAL_HREF_ATTR = 'data-maxina-href';
let originalTitle: string | null = null;

function iconLinks(doc: Document): HTMLLinkElement[] {
  return Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
}

/** Write a tenant's title + favicon href, remembering the compiled values for the restore. */
export function applyTenantMeta(meta: TenantMeta, doc: Document = document): void {
  if (originalTitle === null) originalTitle = doc.title;
  doc.title = meta.title;
  const links = iconLinks(doc);
  if (links.length === 0) {
    const link = doc.createElement('link');
    link.rel = 'icon';
    link.setAttribute(ORIGINAL_HREF_ATTR, MAXINA_META.faviconHref);
    doc.head.appendChild(link);
    links.push(link);
  }
  for (const link of links) {
    if (!link.hasAttribute(ORIGINAL_HREF_ATTR)) link.setAttribute(ORIGINAL_HREF_ATTR, link.getAttribute('href') ?? '');
    link.setAttribute('href', meta.faviconHref);
  }
}

/** Undo `applyTenantMeta()`: the compiled title and every favicon link's own href. */
export function restoreTenantMeta(doc: Document = document): void {
  if (originalTitle !== null) {
    doc.title = originalTitle;
    originalTitle = null;
  }
  for (const link of iconLinks(doc)) {
    const original = link.getAttribute(ORIGINAL_HREF_ATTR);
    if (original === null) continue;
    link.setAttribute('href', original || MAXINA_META.faviconHref);
    link.removeAttribute(ORIGINAL_HREF_ATTR);
  }
}

/** Title + favicon of the active tenant (registry), Maxina fallback. Mounted in AppHooksInitializer. */
export function useTenantMeta(): void {
  const ctx = useTenantSafe();
  const registry = useTenantRegistry();
  const slug = ctx?.tenant?.slug;
  const meta = useMemo(() => tenantMetaFor(slug, registry), [slug, registry]);
  const applied = useRef(false);

  useEffect(() => {
    if (meta.isOverride) {
      applyTenantMeta(meta);
      applied.current = true;
    } else if (applied.current) {
      restoreTenantMeta();
      applied.current = false;
    }
  }, [meta]);

  useEffect(
    () => () => {
      if (applied.current) restoreTenantMeta();
    },
    [],
  );
}
