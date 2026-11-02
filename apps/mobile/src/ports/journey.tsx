/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the My Journey
 * screen's own port: the N2 kit parts it renders beyond `src/ports/ui.tsx`
 * (Progress, Checkbox, Input, Label, Textarea, Separator, the responsive
 * dialog, the drawer and the side sheet, notify*), the token colours the web
 * classes name (`category-*`, `status-*`), the lucide glyphs the web journey
 * components draw, and the pure helpers `@vitana/core` re-exports for this
 * lane (horizon buckets, Index projection and tiers, goal phases, the journey
 * ring + goal trend, the Audiobook season order). Screen files read these only
 * through this port, never from `@vitana/*` directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Download,
  Clock,
  Compass,
  Crown,
  Flag,
  Flame,
  Gift,
  Heart,
  HeartPulse,
  Info,
  Loader2,
  Mail,
  Medal,
  Mic,
  Minus,
  Moon,
  MousePointerClick,
  PartyPopper,
  Plane,
  Play,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  WifiOff,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useButtonForeground, useTheme } from '@vitana/ui';

export { useReducedMotion } from '@vitana/ui';

export {
  notify,
  notifySuccess,
  notifyError,
  Progress,
  Checkbox,
  Input,
  Label,
  Textarea,
  Separator,
  Dialog,
  DialogContent,
  DialogContentNoAnimation,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@vitana/ui';

// ── @vitana/core: the pure helpers this lane re-exports ────────────────────
export { bucketFromWaveId, bucketActions, HORIZON_BUCKETS, type HorizonBucket } from '@vitana/core/horizon-buckets';
export { trend7d } from '@vitana/core/vitana-projection';
export { buildPhases, type RingPhase } from '@vitana/core/goal-phases';
export { getVitanaIndexTier, type VitanaIndexTier } from '@vitana/core/vitana-index-tiers';
export { AUDIOBOOK_SEASONS, seasonNumber } from '@vitana/core/audiobook-queue';
export { FEATURE_CARD_DISMISS_TTL_MS, featureCardDismissKey, CARD_STYLE } from '@vitana/core/vitana-card-catalog';
export {
  buildJourneyRing,
  computeGoalTrend,
  type MyJourneyGoal,
  type MyJourneyJourney,
  type MyJourneyResponse,
  type JourneyRingModel,
  type GoalPlanStep,
  type GoalPlanView,
  type ClarificationAnswer,
  type GoalTrend,
} from '@vitana/core/journey';
export type { AutopilotAction, AutopilotActionStatus, AutopilotCategory, AutopilotPriority, ContributionVector, ExecutionResult, VitanaPillarKey } from '@vitana/core/types';

// ── token colours ────────────────────────────────────────────────────────
/** The web palette names the journey components use (`text-category-2`, …). */
export type JourneyTone = 'category-2' | 'category-3' | 'category-4' | 'category-7';

/** A `--category-*` token for the current scheme (`#rrggbb`). */
export function useToneColor(tone: JourneyTone): string {
  const { scheme } = useTheme();
  return color(tone, scheme);
}

/** `#rrggbb` (or an `hsl()` token) at an alpha — the web's `/15`-style modifiers. */
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

// ── icons ────────────────────────────────────────────────────────────────
const ICONS: Record<string, ComponentType<LucideProps>> = {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Download,
  Clock,
  Compass,
  Crown,
  Flag,
  Flame,
  Gift,
  Heart,
  HeartPulse,
  Info,
  Loader2,
  Mail,
  Medal,
  Mic,
  Minus,
  Moon,
  MousePointerClick,
  PartyPopper,
  Plane,
  Play,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  WifiOff,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const JOURNEY_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function JourneyIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`journey-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Icon className="h-4 w-4 me-2" />`). */
export function ButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <JourneyIcon name={name} size={size} color={foreground ?? undefined} />;
}
