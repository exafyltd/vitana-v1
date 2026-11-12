/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — the auth
 * screens' own port: the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Checkbox, notifySuccess, withAlpha), the brand / status colours from
 * `@vitana/tokens` the web portal, confirm, reset and OAuth pages paint with
 * (`ruby`, `category-2/3/4`, `status-success(-subtle)`, `status-warning`) and
 * the lucide icons those pages draw. Screen files read these only through
 * this port, never from `@vitana/*` directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Lock,
  MailCheck,
  ShieldQuestion,
  Sparkles,
  XCircle,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme, withAlpha } from '@vitana/ui';

export { Checkbox, notifySuccess, notifyError, useReducedMotion, withAlpha } from '@vitana/ui';
export type { CheckedState } from '@vitana/ui';

export type AuthPalette = {
  ruby: string;
  category2: string;
  category3: string;
  category4: string;
  success: string;
  successSubtle: string;
  warning: string;
  /** The portal's dark overlay over the backdrop (MaxinaPortal.tsx `bg-background/50` layers). */
  overlay: string;
};

/** The brand and status colours for the member's colour scheme. */
export function useAuthPalette(): AuthPalette {
  const { scheme, colors } = useTheme();
  return {
    ruby: color('ruby', scheme),
    category2: color('category-2', scheme),
    category3: color('category-3', scheme),
    category4: color('category-4', scheme),
    success: color('status-success', scheme),
    successSubtle: color('status-success-subtle', scheme),
    warning: color('status-warning', scheme),
    overlay: withAlpha(colors.background, 0.4),
  };
}

const ICONS: Record<string, ComponentType<LucideProps>> = {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Heart,
  Lock,
  MailCheck,
  ShieldQuestion,
  Sparkles,
  XCircle,
};

export const AUTH_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name. Decorative: hidden from accessibility. `flipRtl` mirrors a direction arrow (web `rtl:-scale-x-100`). */
export function AuthIcon({ name, size = 20, color: tint, flipRtl }: { name: string; size?: number; color?: string; flipRtl?: boolean }) {
  const { colors, direction } = useTheme();
  const Glyph = ICONS[name];
  return (
    <View
      testID={`auth-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: flipRtl && direction === 'rtl' ? [{ scaleX: -1 }] : undefined }}
    >
      {Glyph ? <Glyph size={size} color={tint ?? colors.foreground} /> : null}
    </View>
  );
}
