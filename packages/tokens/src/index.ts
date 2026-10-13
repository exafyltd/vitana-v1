/**
 * VTID-05183 — @vitana/tokens (Native app Wave 1 N1, plan change 10).
 *
 * Everything except the two helpers below is generated from the web's own
 * sources (src/index.css, tailwind.config.ts) by
 * `node scripts/native/gen-tokens.mjs`; never edit tokens here. A new or
 * changed token is a Spotlight contract change made in src/index.css first.
 */
import { cssVars, resolved } from './tokens.generated';

export * from './tokens.generated';

export type ColorScheme = 'light' | 'dark';

/** Tenant brand overlay — the shape of `tenantBrand(slug)` from @vitana/core/tenants. */
export interface BrandOverlay {
  brandAccent: string;
  brandBg: string;
  brandFg: string;
}

/**
 * The custom-property map NativeWind's `vars()` takes, for one scheme. A brand
 * overlay sets `--brand-accent/-bg/-fg` exactly as the web does at runtime
 * (src/hooks/useTenant.tsx: `root.style.setProperty('--brand-accent', …)`).
 */
export function themeVars(scheme: ColorScheme, brand?: BrandOverlay | null): Record<string, string> {
  const vars: Record<string, string> = { ...cssVars[scheme] };
  if (brand) {
    vars['--brand-accent'] = brand.brandAccent;
    vars['--brand-bg'] = brand.brandBg;
    vars['--brand-fg'] = brand.brandFg;
  }
  return vars;
}

/** A colour variable resolved to `#rrggbb` for one scheme (`'--primary'` or `'primary'`). Unknown → throws. */
export function color(name: string, scheme: ColorScheme): string {
  const key = name.startsWith('--') ? name : `--${name}`;
  const table: Record<string, string> = resolved[scheme];
  const value = table[key];
  if (value === undefined) throw new Error(`@vitana/tokens: no colour token ${key}`);
  return value;
}
