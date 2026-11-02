/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the Discover
 * screens' own port: the pure helpers from `@vitana/core/discover` and
 * `@vitana/core/discover-category` (generated verbatim from the web files,
 * packages/core/extract.json), the N2 kit parts the screens render beyond
 * `src/ports/ui.tsx` (Dialog, Sheet, Drawer, Select, Input, Textarea,
 * Separator, the toasts), the `--category-*` / status / pill colour tokens and
 * the lucide icons the web Discover screens draw. Screen and data files read
 * these only through this port, never from `@vitana/*` directly
 * (tests/ports.test.ts), like src/ports/memory.tsx.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowLeft,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Bookmark,
  Brain,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Coffee,
  CreditCard,
  Crown,
  Dna,
  DollarSign,
  Download,
  Droplet,
  Dumbbell,
  ExternalLink,
  Filter,
  Flame,
  FlaskConical,
  Flower2,
  Gem,
  Gift,
  GraduationCap,
  Grid3X3,
  Heart,
  HeartPulse,
  Infinity as InfinityIcon,
  Info,
  LayoutGrid,
  Leaf,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Microscope,
  Moon,
  Package,
  Percent,
  Pill,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Stethoscope,
  Tag,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

export {
  SUBCATEGORY_I18N_KEY,
  hasPersonalizationSignal,
  formatPrice,
  toEurCents,
  SECTION_CONFIGS,
  ITEMS_PER_SECTION,
  FETCH_LIMIT,
  MOBILE_DISCOVER_CATEGORIES,
  CART_PRODUCT_UUID_RE,
  HOLD_THRESHOLD_MS,
  shopFeedQueryKeys,
  BATCHED_TYPES,
  FLUSH_INTERVAL_MS,
  MAX_BATCH,
  type ReasonSource,
  type ShopSectionMeta,
} from '@vitana/core/discover';
export { SECTION_META, type CategorySectionMeta } from '@vitana/core/discover-category';

export {
  notify,
  notifySuccess,
  notifyError,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Textarea,
  Separator,
} from '@vitana/ui';

/** The `--category-*`, pill, domain and system colour tokens the Discover screens tint with. */
export type DiscoverTone =
  | 'category-1'
  | 'category-2'
  | 'category-3'
  | 'category-4'
  | 'category-5'
  | 'category-6'
  | 'category-7'
  | 'category-8'
  | 'domain-health-accent'
  | 'domain-community-accent'
  | 'pill-exercise-accent'
  | 'pill-mental-accent'
  | 'pill-nutrition-accent'
  | 'pill-sleep-accent'
  | 'sys-vitana-accent'
  | 'sys-ai-accent';

/** A colour token for the member's colour scheme (`#rrggbb`). */
export function useToneColor(tone: DiscoverTone): string {
  const { scheme } = useTheme();
  return color(tone, scheme);
}

/** Resolves any number of tones at once (for lists). */
export function useTonePalette(): (tone: DiscoverTone) => string {
  const { scheme } = useTheme();
  return (tone) => color(tone, scheme);
}

/** `#rrggbb` (or an `hsl()` token) at an alpha — the web's `/10`-style modifiers. */
export function alpha(value: string, a: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const hsl = /^hsl\(([^)]+)\)$/.exec(value.trim());
  if (hsl) return `hsla(${hsl[1]}, ${a})`;
  return value;
}

/**
 * The web paints the collection / category icons with Tailwind palette
 * gradients (`from-violet-500 to-purple-600`), which are not design tokens.
 * Natively each gradient takes the `--category-*` token of its starting hue
 * (one solid fill, every value from @vitana/tokens).
 */
export function toneForGradient(gradient: string | null | undefined): DiscoverTone {
  const hue = /from-([a-z]+)-/.exec(gradient ?? '')?.[1] ?? '';
  if (['violet', 'purple', 'fuchsia'].includes(hue)) return 'category-2';
  if (['blue', 'indigo'].includes(hue)) return 'category-3';
  if (['pink', 'rose'].includes(hue)) return 'category-4';
  if (['amber', 'orange', 'yellow'].includes(hue)) return 'category-5';
  if (['green', 'lime', 'emerald'].includes(hue)) return 'category-6';
  if (['sky', 'cyan'].includes(hue)) return 'category-7';
  if (hue === 'teal') return 'category-1';
  if (hue === 'red') return 'category-8';
  return 'category-3';
}

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  AlertTriangle,
  Apple,
  ArrowLeft,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Bookmark,
  Brain,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Coffee,
  CreditCard,
  Crown,
  Dna,
  DollarSign,
  Download,
  Droplet,
  Dumbbell,
  ExternalLink,
  Filter,
  Flame,
  FlaskConical,
  Flower2,
  Gem,
  Gift,
  GraduationCap,
  Grid3X3,
  Heart,
  HeartPulse,
  Infinity: InfinityIcon,
  Info,
  LayoutGrid,
  Leaf,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Microscope,
  Moon,
  Package,
  Percent,
  Pill,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Stethoscope,
  Tag,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const DISCOVER_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; hidden from accessibility (the control carries the label). */
export function DiscoverIcon({ name, size = 16, color: tint, fill, testID }: { name: string; size?: number; color?: string; fill?: string; testID?: string }) {
  const Glyph = ICONS[name];
  return (
    <View testID={testID ?? `icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      {Glyph ? <Glyph size={size} color={tint} fill={fill ?? 'none'} /> : null}
    </View>
  );
}
