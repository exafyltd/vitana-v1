/**
 * VTID-05176 — the only place src/ui/** imports design tokens from. When N1's
 * `@vitana/tokens` package replaces the stub, nothing else in the kit changes.
 */
import { tokens, type ColorScheme, type SemanticColors, type ShadowStyle, type TenantId, type VitanaTokens } from '@vitana/tokens';
import { legacy as legacyColors } from './legacy-literals';

export { tokens, legacyColors };
export type { ColorScheme, SemanticColors, ShadowStyle, TenantId, VitanaTokens };

/** Semantic colours for a scheme, with the tenant's overrides (if N1 ships any) on top. */
export function resolveColors(scheme: ColorScheme, tenant?: TenantId): SemanticColors {
  const base = tokens.color[scheme];
  const override = tenant ? tokens.tenants?.[tenant]?.[scheme] : undefined;
  return override ? { ...base, ...override } : base;
}

/** A semantic colour at an alpha (for `/80`-style web modifiers). Accepts the stub's `hsl()` strings. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^hsl\(([^)]+)\)$/.exec(color.trim());
  if (m) return `hsla(${m[1]}, ${alpha})`;
  return color;
}
