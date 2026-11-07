/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the AI coach screens' own
 * port: the N2 kit parts they render beyond `src/ports/ui.tsx` (Input,
 * Progress, Tooltip), the colours the web cards take from tokens (the
 * CrossoverCard category accents of `src/index.css` `.icon-<category>` /
 * `.card-<category>`, the calendar / health / status colours), the lucide
 * glyphs the web cards draw, and the AI page data the web renders directly
 * (`@vitana/core/ai-mocks`, the pure `src/mocks/ai.ts`). Screen files read
 * these only through this port, never from `@vitana/*` directly
 * (tests/ports.test.ts), like src/ports/memory.tsx.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  Apple,
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  DollarSign,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Lightbulb,
  MapPin,
  MessageCircle,
  Mic,
  Moon,
  Phone,
  Plane,
  Play,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Video,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme, withAlpha } from '@vitana/ui';

/** A token colour at an alpha (the web's `/10`, `/20` modifiers): `#rrggbb` → `rgba()`, `hsl()` through the kit's withAlpha. */
export function alpha(c: string, a: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c.trim());
  if (!m) return withAlpha(c, a);
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`;
}

export { Input, Progress, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, notifySuccess, useReducedMotion } from '@vitana/ui';
export type { InputProps } from '@vitana/ui';
export {
  todayActions,
  memoryHighlights,
  inspiration,
  lifestylePatterns,
  indexMovement,
  socialEngagement,
  correlations,
  recommendations,
  chat,
} from '@vitana/core/ai-mocks';

/** The CrossoverCard categories the AI coach pages use (web `HealthCategoryColor`). */
export type CoachCategory = 'ai' | 'autopilot' | 'calendar' | 'vitana' | 'mental' | 'nutrition' | 'hydration' | 'exercise' | 'sleep';

/**
 * Token per category: `src/index.css` `.icon-<category>` / `.card-<category>`
 * (--sys-ai-accent, --sys-autopilot-accent, --util-calendar-accent,
 * --sys-vitana-accent, --pill-<pillar>-accent) — the same hues the web
 * CrossoverCard colour map spells out inline.
 */
const CATEGORY_TOKEN: Record<CoachCategory, string> = {
  ai: 'sys-ai-accent',
  autopilot: 'sys-autopilot-accent',
  calendar: 'util-calendar-accent',
  vitana: 'sys-vitana-accent',
  mental: 'pill-mental-accent',
  nutrition: 'pill-nutrition-accent',
  hydration: 'pill-hydration-accent',
  exercise: 'pill-exercise-accent',
  sleep: 'pill-sleep-accent',
};

export type CoachPalette = {
  category: Record<CoachCategory, string>;
  calendarPrimary: string;
  calendarSecondary: string;
  calendarAccent: string;
  calendarSuccess: string;
  healthSuccess: string;
  healthWarning: string;
  statusSuccess: string;
  statusInfo: string;
  statusWarning: string;
  /** The reward dot (web `from-purple-500 to-purple-600`): the purple `--domain-discover-accent` token. */
  reward: string;
  alpha: (c: string, a: number) => string;
};

export function useCoachPalette(): CoachPalette {
  const { scheme } = useTheme();
  const c = (name: string) => color(name, scheme);
  const category = Object.fromEntries(Object.entries(CATEGORY_TOKEN).map(([k, v]) => [k, c(v)])) as Record<CoachCategory, string>;
  return {
    category,
    calendarPrimary: c('calendar-primary'),
    calendarSecondary: c('calendar-secondary'),
    calendarAccent: c('calendar-accent'),
    calendarSuccess: c('calendar-success'),
    healthSuccess: c('health-success'),
    healthWarning: c('health-warning'),
    statusSuccess: c('status-success'),
    statusInfo: c('status-info'),
    statusWarning: c('status-warning'),
    reward: c('domain-discover-accent'),
    alpha,
  };
}

/** The lucide glyphs the web AI coach cards draw. */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  Apple,
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  Lightbulb,
  MapPin,
  MessageCircle,
  Mic,
  Moon,
  Phone,
  Plane,
  Play,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Video,
  Zap,
};

export const COACH_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name (unknown → `Circle`). Decorative: hidden from accessibility. */
export function CoachIcon({ name, size = 16, color: tint, fill }: { name: string; size?: number; color?: string; fill?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`coach-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} fill={fill ?? 'none'} />
    </View>
  );
}
