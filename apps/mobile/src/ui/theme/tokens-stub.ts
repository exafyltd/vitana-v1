/**
 * VTID-05176 — TEMPORARY stand-in for `@vitana/tokens` (Native app Wave 1, N2).
 *
 * This file is the module shape N1's tokens package must export (plan
 * "Interfaces for other lanes"): `TOKENS_VERSION`, the types below and
 * `tokens: VitanaTokens`. Until N1 lands, `@vitana/tokens` resolves here
 * (tsconfig.json `paths`, jest `moduleNameMapper`). When N1 lands, both aliases
 * point at N1's package and this file is deleted; tests/ui/tokens-contract.test.ts
 * runs against whatever the alias resolves to.
 *
 * Values are copied from the web app, with their source line:
 *   colours  — src/index.css `:root` (light) and `.dark` (dark)
 *   radii    — tailwind.config.ts:274-280 (`--radius: 0.5rem`, index.css:43) + Tailwind defaults
 *   shadows  — index.css:195-196 / :232-233 (`--sp-elevation-1/2`) + Tailwind default shadow-sm/md/lg
 *   type     — Tailwind default font sizes; families tailwind.config.ts:47-56
 * Colours are React-Native-parsable `hsl(h, s%, l%)` strings.
 */
export const TOKENS_VERSION = '0.0.0-n2-stub';

export type ColorScheme = 'light' | 'dark';

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

const hsl = (h: number, s: number, l: number): string => `hsl(${h}, ${s}%, ${l}%)`;

const shadow = (color: string, opacity: number, y: number, blur: number, elevation: number): ShadowStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur / 2,
  elevation,
});

// Tailwind's shadow-sm/md/lg are rgb(0 0 0 / α) in both themes.
const BLACK = hsl(0, 0, 0);

export const tokens: VitanaTokens = {
  color: {
    // src/index.css:15-41, :202-209
    light: {
      background: hsl(0, 0, 100),
      foreground: hsl(222.2, 84, 4.9),
      card: hsl(0, 0, 100),
      cardForeground: hsl(222.2, 84, 4.9),
      popover: hsl(0, 0, 100),
      popoverForeground: hsl(222.2, 84, 4.9),
      primary: hsl(222.2, 47.4, 11.2),
      primaryForeground: hsl(210, 40, 98),
      secondary: hsl(210, 40, 96.1),
      secondaryForeground: hsl(222.2, 47.4, 11.2),
      muted: hsl(210, 40, 96.1),
      mutedForeground: hsl(215.4, 16.3, 46.9),
      accent: hsl(210, 40, 96.1),
      accentForeground: hsl(222.2, 47.4, 11.2),
      destructive: hsl(0, 84.2, 60.2),
      destructiveForeground: hsl(210, 40, 98),
      border: hsl(214.3, 31.8, 91.4),
      input: hsl(214.3, 31.8, 91.4),
      ring: hsl(222.2, 84, 4.9),
      statusSuccess: hsl(142, 71, 35),
      statusSuccessSubtle: hsl(141, 76, 94),
      statusWarning: hsl(32, 95, 44),
      statusWarningSubtle: hsl(48, 100, 92),
      statusError: hsl(0, 72, 51),
      statusErrorSubtle: hsl(0, 86, 96),
      statusInfo: hsl(217, 91, 50),
      statusInfoSubtle: hsl(214, 95, 94),
    },
    // src/index.css:234-241, :260-285
    dark: {
      background: hsl(222.2, 84, 4.9),
      foreground: hsl(210, 40, 98),
      card: hsl(222.2, 84, 4.9),
      cardForeground: hsl(210, 40, 98),
      popover: hsl(222.2, 84, 4.9),
      popoverForeground: hsl(210, 40, 98),
      primary: hsl(210, 40, 98),
      primaryForeground: hsl(222.2, 47.4, 11.2),
      secondary: hsl(217.2, 32.6, 17.5),
      secondaryForeground: hsl(210, 40, 98),
      muted: hsl(217.2, 32.6, 17.5),
      mutedForeground: hsl(215, 20.2, 65.1),
      accent: hsl(217.2, 32.6, 17.5),
      accentForeground: hsl(210, 40, 98),
      destructive: hsl(0, 62.8, 30.6),
      destructiveForeground: hsl(210, 40, 98),
      border: hsl(217.2, 32.6, 17.5),
      input: hsl(217.2, 32.6, 17.5),
      ring: hsl(212.7, 26.8, 83.9),
      statusSuccess: hsl(142, 69, 58),
      statusSuccessSubtle: hsl(143, 64, 14),
      statusWarning: hsl(43, 96, 56),
      statusWarningSubtle: hsl(32, 81, 15),
      statusError: hsl(0, 91, 71),
      statusErrorSubtle: hsl(0, 63, 18),
      statusInfo: hsl(213, 94, 68),
      statusInfoSubtle: hsl(217, 60, 18),
    },
  },
  // Tenant colour overrides arrive with N1 (tenantBrand); none in the stub.
  tenants: {},
  // tailwind.config.ts:274-280 — lg = --radius (8), md = lg − 2, sm = lg − 4; vcard index.css:193-194.
  radius: { sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, full: 9999, vcard: 18, vcardSm: 12 },
  space: (steps: number) => steps * 4,
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
  // tailwind.config.ts:47-56 — sans is the system stack (undefined = platform default);
  // Cormorant is bundled and loaded by N3 (program decision 8).
  fontFamily: { sans: undefined, editorial: 'Cormorant' },
  elevation: {
    // index.css:195-196 (e1/e2); Tailwind shadow-sm / shadow-md / shadow-lg.
    light: {
      e1: shadow(hsl(222, 47, 11), 0.06, 2, 6, 2),
      e2: shadow(hsl(222, 47, 11), 0.1, 6, 20, 6),
      sm: shadow(BLACK, 0.05, 1, 2, 1),
      md: shadow(BLACK, 0.1, 4, 6, 3),
      lg: shadow(BLACK, 0.1, 10, 15, 8),
    },
    // index.css:232-233
    dark: {
      e1: shadow(BLACK, 0.35, 2, 6, 2),
      e2: shadow(BLACK, 0.45, 6, 20, 6),
      sm: shadow(BLACK, 0.05, 1, 2, 1),
      md: shadow(BLACK, 0.1, 4, 6, 3),
      lg: shadow(BLACK, 0.1, 10, 15, 8),
    },
  },
  // SR-22: 150 ms cross-fade; sheet.tsx:38 (duration-300 close), dialog zoom/fade (tailwindcss-animate 200 ms).
  motion: { crossFadeMs: 150, sheetMs: 300, dialogMs: 200 },
};
