/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the one
 * door the pillars / conditions / education / plans / services-hub screens use
 * beyond `src/ports/ui.tsx`: the pure plan data and helpers from
 * `@vitana/core/health-plans` (the web sample plans, getMockPlan,
 * calculateAutopilotContext, the service detail sample), the plan / recipe
 * types from `@vitana/core/types`, the N2 kit parts the screens render
 * (Dialog, Sheet, Progress), the sonner-style toast (final text + action, as
 * the web Plans footer uses it), the token colours the web classes name
 * (`category-*`, `surface-sunken`, the pillar accents, `status-*`) and the
 * lucide glyphs the web screens draw. Screen files never import `@vitana/*`
 * directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  Apple,
  Award,
  Bookmark,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  CalendarX,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Download,
  Droplet,
  Droplets,
  Dumbbell,
  FileText,
  Flame,
  GraduationCap,
  Headphones,
  Heart,
  Leaf,
  Link2,
  MapPin,
  MessageSquare,
  Microscope,
  Moon,
  Package,
  Phone,
  Play,
  Plus,
  Quote,
  RotateCw,
  Search,
  Settings,
  Shield,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  TestTube,
  TestTube2,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme, withAlpha } from '@vitana/ui';

export {
  mockNutritionPlan,
  mockExercisePlan,
  mockHydrationPlan,
  mockSleepPlan,
  mockMentalPlan,
  getMockPlan,
  calculateAutopilotContext,
  mockServiceDetails,
  type MockPlan,
  type PillarSynergy,
  type AutopilotContextData,
  type ServiceDetail,
  type ServiceProvider,
} from '@vitana/core/health-plans';
export type {
  ExercisePlanData,
  Workout,
  HydrationPlanData,
  DailyHydrationData,
  SleepPlanData,
  DailySleepData,
  MentalPlanData,
  DailyMentalData,
  NutritionPlanData,
  Recipe,
} from '@vitana/core/types';
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Progress,
} from '@vitana/ui';
export { withAlpha };
export { toast } from '@vitana/ui/sonner';

export type HealthPalette = {
  category: Record<1 | 2 | 3 | 4 | 7, string>;
  surfaceSunken: string;
  pillar: Record<'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'mental', string>;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  error: string;
  info: string;
  /**
   * The web icon tiles' `from-<hue>-500/20 to-…` gradients, by leading hue,
   * as the nearest token at 20 % (raw palette hues are not tokens).
   */
  hue: Record<Hue, string>;
};

export type Hue = 'green' | 'blue' | 'red' | 'purple' | 'orange' | 'cyan' | 'pink';

/** The token colours the web health classes name, for the member's colour scheme. */
export function useHealthPalette(): HealthPalette {
  const { scheme } = useTheme();
  const c = (name: string) => color(name, scheme);
  const a = (name: string) => withAlpha(c(name), 0.2);
  return {
    hue: {
      green: a('status-success'),
      blue: a('status-info'),
      red: a('status-error'),
      purple: a('category-3'),
      orange: a('status-warning'),
      cyan: a('category-1'),
      pink: a('pill-mental-accent'),
    },
    category: { 1: c('category-1'), 2: c('category-2'), 3: c('category-3'), 4: c('category-4'), 7: c('category-7') },
    surfaceSunken: c('surface-sunken'),
    pillar: {
      nutrition: c('pill-nutrition-accent'),
      exercise: c('pill-exercise-accent'),
      hydration: c('pill-hydration-accent'),
      sleep: c('pill-sleep-accent'),
      mental: c('pill-mental-accent'),
    },
    success: c('status-success'),
    successSubtle: c('status-success-subtle'),
    warning: c('status-warning'),
    warningSubtle: c('status-warning-subtle'),
    error: c('status-error'),
    info: c('status-info'),
  };
}

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  AlertTriangle,
  Apple,
  Award,
  Bookmark,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  CalendarX,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Droplet,
  Droplets,
  Dumbbell,
  FileText,
  Flame,
  GraduationCap,
  Headphones,
  Heart,
  Leaf,
  Link2,
  MapPin,
  MessageSquare,
  Microscope,
  Moon,
  Package,
  Phone,
  Play,
  Plus,
  Quote,
  RotateCw,
  Search,
  Settings,
  Shield,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  TestTube,
  TestTube2,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap,
};

/** The icon names this port can draw. */
export const HEALTH_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name (unknown → Circle). Decorative: hidden from accessibility. */
export function HealthIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`health-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}
