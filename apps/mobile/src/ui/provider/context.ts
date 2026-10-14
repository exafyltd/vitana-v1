/**
 * VTID-05176 — theme context and the hooks every primitive reads.
 * Without a provider the hooks fall back to the light theme and the
 * direction React Native reports, so a primitive never crashes outside one.
 */
import { createContext, useContext } from 'react';
import { I18nManager } from 'react-native';
import { resolveColors, tokens, type ColorScheme, type SemanticColors, type TenantId, type VitanaTokens } from '../theme';

export type Direction = 'ltr' | 'rtl';

export type Theme = {
  scheme: ColorScheme;
  tenant: TenantId | undefined;
  colors: SemanticColors;
  radius: VitanaTokens['radius'];
  space: VitanaTokens['space'];
  type: { fontSize: VitanaTokens['fontSize']; fontFamily: VitanaTokens['fontFamily'] };
  elevation: VitanaTokens['elevation'][ColorScheme];
  motion: VitanaTokens['motion'];
  direction: Direction;
  reducedMotion: boolean;
};

export function buildTheme(scheme: ColorScheme, direction: Direction, reducedMotion: boolean, tenant?: TenantId): Theme {
  return {
    scheme,
    tenant,
    colors: resolveColors(scheme, tenant),
    radius: tokens.radius,
    space: tokens.space,
    type: { fontSize: tokens.fontSize, fontFamily: tokens.fontFamily },
    elevation: tokens.elevation[scheme],
    motion: tokens.motion,
    direction,
    reducedMotion,
  };
}

export const ThemeContext = createContext<Theme | null>(null);

/** True inside the outermost VitanaUIProvider (change 7: one host per app). */
export const UIRootContext = createContext(false);

export function useTheme(): Theme {
  return useContext(ThemeContext) ?? buildTheme('light', I18nManager.isRTL ? 'rtl' : 'ltr', false);
}

export function useDirection(): Direction {
  return useTheme().direction;
}

/** The OS "reduce motion" setting as seen by the provider (SR-22). */
export function useReducedMotion(): boolean {
  return useTheme().reducedMotion;
}
