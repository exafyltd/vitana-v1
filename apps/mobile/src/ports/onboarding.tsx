/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) — the
 * onboarding welcome screen's own port: the N2 kit parts it renders beyond
 * `src/ports/ui.tsx` (Switch, useReducedMotion, withAlpha), the brand / status
 * colours from `@vitana/tokens` the web page paints with (`category-4`,
 * `category-2`, `ruby`, `status-success`, `status-error`) and the lucide
 * icons it draws (Headphones, Play, CheckCircle2, XCircle). Screen files read
 * these only through this port, never from `@vitana/*` directly
 * (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { CheckCircle2, Headphones, Play, XCircle, type LucideProps } from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

export { Switch, useReducedMotion, withAlpha } from '@vitana/ui';

export type OnboardingPalette = {
  category2: string;
  category4: string;
  ruby: string;
  success: string;
  error: string;
};

/** The brand and status colours for the member's colour scheme. */
export function useOnboardingPalette(): OnboardingPalette {
  const { scheme } = useTheme();
  return {
    category2: color('category-2', scheme),
    category4: color('category-4', scheme),
    ruby: color('ruby', scheme),
    success: color('status-success', scheme),
    error: color('status-error', scheme),
  };
}

const ICONS: Record<string, ComponentType<LucideProps>> = { CheckCircle2, Headphones, Play, XCircle };

export const ONBOARDING_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name. Decorative (the web marks them `aria-hidden`): hidden from accessibility. */
export function OnboardingIcon({ name, size = 20, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name];
  return (
    <View testID={`onboarding-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {Glyph ? <Glyph size={size} color={tint ?? colors.foreground} /> : null}
    </View>
  );
}
