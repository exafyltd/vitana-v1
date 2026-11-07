/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — the public
 * screens' own port: the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Accordion, Checkbox, the sonner-compatible `toast` for already-translated
 * text), the category / ruby / status colours from `@vitana/tokens` (the same
 * `--category-N` / `--ruby` / `--status-*` tokens the web Index, MaxinaSupport
 * and Apply pages use) and the lucide icons those pages draw. Screen files read
 * these only through this port, never from `@vitana/*` directly
 * (tests/ports.test.ts), like src/ports/memory.tsx.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  CreditCard,
  ExternalLink,
  Heart,
  HelpCircle,
  LogIn,
  Mail,
  MapPin,
  Shield,
  ShoppingBag,
  Sparkles,
  Terminal,
  Ticket,
  Trash2,
  User,
  UserPlus,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Checkbox, withAlpha } from '@vitana/ui';
export type { CheckedState } from '@vitana/ui';
export { toast } from '@vitana/ui/sonner';

export type CategoryKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PublicPalette = {
  category: Record<CategoryKey, string>;
  ruby: string;
  success: string;
  successSubtle: string;
  warning: string;
  scheme: 'light' | 'dark';
};

const CATEGORIES: readonly CategoryKey[] = [1, 2, 3, 4, 5, 6, 7];

/** The category, ruby and status colours for the member's colour scheme. */
export function usePublicPalette(): PublicPalette {
  const { scheme } = useTheme();
  const category = Object.fromEntries(CATEGORIES.map((n) => [n, color(`category-${n}`, scheme)])) as PublicPalette['category'];
  return {
    category,
    ruby: color('ruby', scheme),
    success: color('status-success', scheme),
    successSubtle: color('status-success-subtle', scheme),
    warning: color('status-warning', scheme),
    scheme,
  };
}

/** The dark-scheme semantic colours (the web intro renders inside a `dark` scope in both themes). */
export function darkColor(name: string): string {
  return color(name, 'dark');
}

/** The lucide glyphs the web public / legal / apply / intro pages draw. */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  Heart,
  HelpCircle,
  LogIn,
  Mail,
  MapPin,
  Shield,
  ShoppingBag,
  Sparkles,
  Terminal,
  Ticket,
  Trash2,
  User,
  UserPlus,
};

export const PUBLIC_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name (unknown → Circle). Decorative: hidden from accessibility. */
export function PublicIcon({ name, size = 20, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`public-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}
