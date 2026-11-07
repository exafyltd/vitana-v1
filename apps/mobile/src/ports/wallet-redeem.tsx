/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — the voucher-redeem
 * screen's own UI port: the lucide glyphs the web redeem page and its two
 * voucher components draw (`RedeemVoucher.tsx`, `RedemptionLanding.tsx`,
 * `RedemptionConfirm.tsx`), the kit's `withAlpha` (the web `bg-primary/10`
 * tints) and `useButtonForeground`. Screen files read these only through this
 * port, never from `@vitana/*` directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { AlertCircle, Calendar, Check, CheckCircle, Circle, Gift, Sparkles, Star, Users, type LucideProps } from 'lucide-react-native';
import { useButtonForeground, useTheme } from '@vitana/ui';

export { withAlpha } from '@vitana/ui';

const ICONS: Record<string, ComponentType<LucideProps>> = { AlertCircle, Calendar, Check, CheckCircle, Gift, Sparkles, Star, Users };

/** The icon names this port can draw. */
export const REDEEM_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function RedeemIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`redeem-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Gift className="w-5 h-5" />`). */
export function RedeemButtonIcon({ name, size = 20 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <RedeemIcon name={name} size={size} color={foreground ?? undefined} />;
}

/** The kit button's label colour (for the claim button's spinner). */
export { useButtonForeground };
