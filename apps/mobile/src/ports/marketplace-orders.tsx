/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — the
 * marketplace / doctors & coaches / provider / orders / my-tickets screens'
 * own port: the N2 kit parts they render beyond `src/ports/ui.tsx` (Dialog,
 * Drawer, Select, Textarea, Label, Separator, notifySuccess), the category /
 * status colours from `@vitana/tokens` (`--category-2..4`, `--status-*`, the
 * tokens the web classes `bg-category-3/15`, `text-status-success` read), the
 * pure `src/lib/exchangeRates.ts` helpers through `@vitana/core` and the
 * lucide glyphs the web screens draw. Screen files read these only through
 * this port (tests/ports.test.ts), like src/ports/memory.tsx.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  ArrowLeft,
  Award,
  Bell,
  Bookmark,
  Brain,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  Gift,
  GraduationCap,
  Hash,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  TrendingUp,
  Users,
  Verified,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme, withAlpha } from '@vitana/ui';

export {
  notifySuccess,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Label,
  Separator,
} from '@vitana/ui';
export { getExchangeRate, formatCurrency } from '@vitana/core/exchangeRates';

/** A token colour of a fixed scheme (the ticket pass is theme-independent). */
export const tokenColor = (name: string, scheme: 'light' | 'dark'): string => color(name, scheme);

/** A token colour at an alpha (the web's `/15`-style modifiers). */
export function alpha(c: string, a: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  return withAlpha(c, a);
}

export type CommercePalette = {
  category2: string;
  category3: string;
  category4: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  error: string;
  errorSubtle: string;
  info: string;
  /** `bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to`. */
  pageGradient: string;
};

/** The category and status colours for the member's colour scheme. */
export function useCommercePalette(): CommercePalette {
  const { scheme } = useTheme();
  const c = (name: string) => color(name, scheme);
  return {
    category2: c('category-2'),
    category3: c('category-3'),
    category4: c('category-4'),
    success: c('status-success'),
    successSubtle: c('status-success-subtle'),
    warning: c('status-warning'),
    warningSubtle: c('status-warning-subtle'),
    error: c('status-error'),
    errorSubtle: c('status-error-subtle'),
    info: c('status-info'),
    pageGradient: `linear-gradient(135deg, ${c('surface-page-from')} 0%, ${c('surface-page-via')} 50%, ${c('surface-page-to')} 100%)`,
  };
}

const ICONS: Record<string, ComponentType<LucideProps>> = {
  ArrowLeft,
  Award,
  Bell,
  Bookmark,
  Brain,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  Gift,
  GraduationCap,
  Hash,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  TrendingUp,
  Users,
  Verified,
  X,
};

/** The icon names this port can draw. */
export const COMMERCE_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name (an unknown name draws `Circle`). Decorative: hidden from a11y. */
export function CommerceIcon({ name, size = 16, color: tint, fill }: { name: string; size?: number; color?: string; fill?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`mo-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} fill={fill ?? 'none'} />
    </View>
  );
}
