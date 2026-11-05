/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — the N2 parts and the
 * lucide glyphs the subscriptions screens render, through their own port so
 * the screen files never import `@vitana/ui` or `lucide-react-native` directly
 * (tests/ports.test.ts). Kept apart from `ports/ui.tsx` so the sibling wallet
 * lanes, built in parallel, do not edit the same lines.
 *
 * `Accordion*` is the web shadcn accordion's twin (WhySubscribeFAQ) and
 * `Progress` the web progress bar's twin (FeatureComparisonTable).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Gift,
  Settings,
  Shield,
  ShieldOff,
  Sparkles,
  Sprout,
  ToggleRight,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@vitana/ui';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Progress } from '@vitana/ui';

const GLYPHS = {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Gift,
  Settings,
  Shield,
  ShieldOff,
  Sparkles,
  Sprout,
  ToggleRight,
  X,
  Zap,
} satisfies Record<string, ComponentType<LucideProps>>;

export type BillingGlyph = keyof typeof GLYPHS;

/** A decorative glyph (hidden from assistive tech, like the web's `aria-hidden` icons). */
export function BillingIcon({ name, size = 16, color }: { name: BillingGlyph; size?: number; color?: string }) {
  const theme = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View testID={`billing-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={color ?? theme.colors.foreground} />
    </View>
  );
}
