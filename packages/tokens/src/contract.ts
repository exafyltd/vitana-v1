/**
 * VTID-05183 — the `@vitana/tokens` contract the native UI kit reads
 * (VTID-05176, N2 plan "Interfaces for other lanes"; the kit's
 * src/ui/theme/index.ts imports exactly these names, and
 * apps/mobile/tests/ui/tokens-contract.test.ts checks them).
 *
 * Not tokens: a view over the generated ones. Every value the web declares
 * comes from tokens.generated.ts (src/index.css + tailwind.config.ts). The
 * constants below are the Tailwind defaults the web uses without declaring them
 * in tailwind.config.ts (so the generator has nothing to read), plus the two
 * React Native-only numbers (Android `elevation`) and the motion durations of
 * the web primitives, each with its source.
 */
import type { ColorScheme } from './index';
import { cssVars, fonts, radius as radii, shadows } from './tokens.generated';

/** Version of this contract's shape (bump on a breaking change). */
export const TOKENS_VERSION = '1.0.0';

/** React Native shadow style (iOS shadow* + Android elevation). */
export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type TenantId = 'maxina' | 'alkalma';

export interface SemanticColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  statusSuccess: string;
  statusSuccessSubtle: string;
  statusWarning: string;
  statusWarningSubtle: string;
  statusError: string;
  statusErrorSubtle: string;
  statusInfo: string;
  statusInfoSubtle: string;
}

export interface VitanaTokens {
  color: Record<ColorScheme, SemanticColors>;
  tenants?: Partial<Record<TenantId, Partial<Record<ColorScheme, Partial<SemanticColors>>>>>;
  radius: { sm: number; md: number; lg: number; xl: number; '2xl': number; full: number; vcard: number; vcardSm: number };
  /** 4 px scale (SR-15). */
  space: (steps: number) => number;
  fontSize: { xs: number; sm: number; base: number; lg: number; xl: number; '2xl': number };
  fontFamily: { sans: string | undefined; editorial: string };
  elevation: Record<ColorScheme, { e1: ShadowStyle; e2: ShadowStyle; sm: ShadowStyle; md: ShadowStyle; lg: ShadowStyle }>;
  motion: { crossFadeMs: 150; sheetMs: number; dialogMs: number };
}

const SEMANTIC_KEYS: (keyof SemanticColors)[] = [
  'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground',
  'primary', 'primaryForeground', 'secondary', 'secondaryForeground', 'muted', 'mutedForeground',
  'accent', 'accentForeground', 'destructive', 'destructiveForeground', 'border', 'input', 'ring',
  'statusSuccess', 'statusSuccessSubtle', 'statusWarning', 'statusWarningSubtle',
  'statusError', 'statusErrorSubtle', 'statusInfo', 'statusInfoSubtle',
];

/** `cardForeground` → `--card-foreground`. */
const cssVarOf = (key: string): string => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** An index.css HSL triplet (`222.2 84% 4.9%`) as a React-Native-parsable `hsl(222.2, 84%, 4.9%)`. */
function hslOf(scheme: ColorScheme, key: keyof SemanticColors): string {
  const name = cssVarOf(key);
  const triplet = (cssVars[scheme] as Record<string, string>)[name];
  const parts = triplet === undefined ? [] : triplet.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`@vitana/tokens: ${name} (${scheme}) is not an HSL triplet`);
  return `hsl(${parts.join(', ')})`;
}

function semantic(scheme: ColorScheme): SemanticColors {
  return Object.fromEntries(SEMANTIC_KEYS.map((k) => [k, hslOf(scheme, k)])) as unknown as SemanticColors;
}

const shadow = (color: string, opacity: number, y: number, blur: number, elevation: number): ShadowStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur / 2,
  elevation,
});

type ParsedShadow = { css: string; opacity: number; offsetY: number; blur: number };

/** The shadow's own `hsl(h s% l% / α)` colour as an opaque `hsl(h, s%, l%)` (the alpha is `shadowOpacity`). */
function shadowHsl(css: string): string {
  const m = /hsl\(\s*([\d.]+)\s+([\d.]+%)\s+([\d.]+%)/.exec(css);
  if (!m) throw new Error(`@vitana/tokens: no hsl() colour in shadow ${css}`);
  return `hsl(${m[1]}, ${m[2]}, ${m[3]})`;
}

const fromGenerated = (s: ParsedShadow, elevation: number): ShadowStyle =>
  shadow(shadowHsl(s.css), s.opacity, s.offsetY, s.blur, elevation);

// Tailwind's default shadow-sm / shadow-md / shadow-lg: rgb(0 0 0 / α) in both themes.
const BLACK = 'hsl(0, 0%, 0%)';
const tailwindShadows = {
  sm: shadow(BLACK, 0.05, 1, 2, 1),
  md: shadow(BLACK, 0.1, 4, 6, 3),
  lg: shadow(BLACK, 0.1, 10, 15, 8),
};

function elevation(scheme: ColorScheme) {
  return {
    // boxShadow vcard / vcard-raised (index.css --sp-elevation-1/2); Android elevation 2 / 6.
    e1: fromGenerated(shadows.vcard[scheme], 2),
    e2: fromGenerated(shadows['vcard-raised'][scheme], 6),
    ...tailwindShadows,
  };
}

export const tokens: VitanaTokens = {
  color: { light: semantic('light'), dark: semantic('dark') },
  // Tenant colour is the brand overlay (`themeVars(scheme, tenantBrand(slug))`);
  // the web has no per-tenant semantic colour overrides.
  tenants: {},
  // sm/md/lg/vcard from tailwind.config.ts (generated); xl/2xl/full are Tailwind's defaults.
  radius: {
    sm: radii.sm.px,
    md: radii.md.px,
    lg: radii.lg.px,
    xl: 12,
    '2xl': 16,
    full: 9999,
    vcard: radii.vcard.px,
    vcardSm: radii['vcard-sm'].px,
  },
  space: (steps: number) => steps * 4,
  // Tailwind's default font sizes (text-xs … text-2xl).
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
  // sans extends Tailwind's default system stack (undefined = the platform font);
  // editorial is the first family of tailwind.config.ts `fontFamily.editorial`.
  fontFamily: { sans: undefined, editorial: fonts.editorial.families[0] },
  elevation: { light: elevation('light'), dark: elevation('dark') },
  // SR-22: 150 ms cross-fade; sheet.tsx:38 (duration-300 close), dialog zoom/fade (tailwindcss-animate 200 ms).
  motion: { crossFadeMs: 150, sheetMs: 300, dialogMs: 200 },
};
