/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the port
 * of the Vitana Index detail (`/health/vitana-index`) and biology
 * (`/health/my-biology`) screens, beside health-hub's `src/ports/health.tsx`:
 *
 *  - the N2 kit parts those screens draw beyond the health port (Select for
 *    the metric / category pickers, Textarea and Label for the add-supplement
 *    form);
 *  - the pure Unified Card System catalog bits the Index page's card strip
 *    needs (`src/components/vitana/vitana-card-catalog.ts`, already in core);
 *  - the supplement category catalogue (`supplementCategories.ts`, a new
 *    class-A re-export, packages/core/src/supplement-categories.ts);
 *  - the lucide glyphs the two web pages draw that the health port lacks.
 *
 * Screen files read these only through this port, never from `@vitana/*`
 * directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowRight,
  Bell,
  Bot,
  Brain,
  Bug,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Circle,
  Clapperboard,
  Compass,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  Heart,
  ImagePlus,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  Moon,
  MoreHorizontal,
  PenLine,
  Pill,
  Plus,
  RefreshCw,
  Rocket,
  Route,
  Scale,
  Scan,
  Sparkles,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Watch,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

/** The page-surface tokens the Index hero and the biology page draw (`--surface-page*`, `--surface-sunken`). */
export function useSurfaceColors(): { page: string; pageFrom: string; pageTo: string; sunken: string } {
  const { scheme } = useTheme();
  return {
    page: color('surface-page', scheme),
    pageFrom: color('surface-page-from', scheme),
    pageTo: color('surface-page-to', scheme),
    sunken: color('surface-sunken', scheme),
  };
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
  Label,
} from '@vitana/ui';

export {
  CARD_SCREENS,
  CARD_DEEP_LINKS,
  FEATURE_CARD_DISMISS_TTL_MS,
  featureCardDismissKey,
  isServerCardPlaced,
  isServerDismissedCard,
  isVitanaCardType,
  cardCategory,
  type CardScreen,
  type VitanaCardType,
} from '@vitana/core/vitana-card-catalog';

export { SUPPLEMENT_CATEGORIES, getAllCategories, getCategoryGroups } from '@vitana/core/supplement-categories';

/** The glyphs VitanaIndexDetail.tsx, MyBiology.tsx and the components they mount (card strip, dialogs) draw. */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  AlertTriangle,
  Apple,
  ArrowRight,
  Bell,
  Bot,
  Brain,
  Bug,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  Circle,
  Clapperboard,
  Compass,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  Heart,
  ImagePlus,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Mic,
  Moon,
  MoreHorizontal,
  PenLine,
  Pill,
  Plus,
  RefreshCw,
  Rocket,
  Route,
  Scale,
  Scan,
  Sparkles,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Watch,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const BIOLOGY_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function BiologyIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`biology-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={color ?? colors.foreground} />
    </View>
  );
}
