/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the health screens'
 * own port: the pure Vitana Index math from `@vitana/core` (tier ladder,
 * slope projection), the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Sheet, Dialog, Input, Separator), the Vitana pillar colours from
 * `@vitana/tokens` (`--pill-<pillar>-accent` / `-tint`, the same tokens the
 * web `MobileHealthSnapshot` PILLAR_TINT uses) and the lucide glyphs the web
 * health components draw. Screen files read these only through this port,
 * never from `@vitana/*` directly (tests/ports.test.ts), like src/ports/memory.tsx.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Bug,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Dna,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  Minus,
  MoreHorizontal,
  PartyPopper,
  Pencil,
  Pill,
  Plane,
  Plus,
  Scan,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useButtonForeground, useTheme } from '@vitana/ui';

export {
  VITANA_INDEX_TIERS,
  getVitanaIndexTier,
  nextTier,
  pointsToNextTier,
  getVitanaIndexPercentage,
  formatVitanaIndexScore,
  type VitanaIndexTier,
} from '@vitana/core/vitana-index';
export { buildHorizonPoints, trend7d, projectDays, projectDay90, type ProjectedPoint, type IndexHistoryPoint } from '@vitana/core/vitana-projection';

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Separator,
  withAlpha,
} from '@vitana/ui';

export type PillarKey = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';

export type HealthPalette = {
  pillar: Record<PillarKey, { accent: string; tint: string }>;
  /** `category-1` … `category-8`, index 0 = category-1. */
  category: readonly string[];
};

const PILLARS: readonly PillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];

/** The pillar accent / tint and the category colours (`category-1` … `category-8`) for the member's colour scheme. */
export function useHealthPalette(): HealthPalette {
  const { scheme } = useTheme();
  const pillar = Object.fromEntries(
    PILLARS.map((p) => [p, { accent: color(`pill-${p}-accent`, scheme), tint: color(`pill-${p}-tint`, scheme) }]),
  ) as HealthPalette['pillar'];
  return { pillar, category: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => color(`category-${n}`, scheme)) };
}

/** The glyphs the web health components draw (Health.tsx mobile branch, mobile/*, VitanaIndexSheet, sheets, popups). */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Bug,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Dna,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  Minus,
  MoreHorizontal,
  PartyPopper,
  Pencil,
  Pill,
  Plane,
  Plus,
  Scan,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const HEALTH_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function HealthIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`health-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Icon className="h-4 w-4 me-2" />`). */
export function HealthButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <HealthIcon name={name} size={size} color={foreground ?? undefined} />;
}
