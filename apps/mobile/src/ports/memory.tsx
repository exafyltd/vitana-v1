/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the memory screens' own
 * port: the N2 kit parts they render beyond `src/ports/ui.tsx` (Switch,
 * Textarea, AlertDialog), the Vitana pillar colours from `@vitana/tokens`
 * (`--pill-<pillar>-accent` / `-tint`, the same tokens the web
 * `timeline-meta.tsx` PILLAR_STYLE uses) and the lucide icons the web memory /
 * timeline screens draw (`timeline-meta.tsx` ICONS: the gateway names a
 * moment's icon). Screen files read these only through this port, never from
 * `@vitana/*` directly (tests/ports.test.ts), like src/ports/news.ts.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  Apple,
  ArrowLeftRight,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  Brain,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Coins,
  Compass,
  DollarSign,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  Edit2,
  Edit3,
  Eraser,
  FileText,
  Filter,
  FlaskConical,
  Flame,
  FolderOpen,
  Gauge,
  Gift,
  GraduationCap,
  Headphones,
  Heart,
  HeartHandshake,
  Languages,
  Lightbulb,
  ListChecks,
  ListPlus,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Minus,
  Moon,
  Music,
  PartyPopper,
  Pause,
  PenSquare,
  Phone,
  Pill,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Repeat,
  Route,
  Scale,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Sparkles,
  Sun,
  Tag,
  Target,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Watch,
  Wifi,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { color } from '@vitana/tokens';
import { useTheme } from '@vitana/ui';

export {
  notifySuccess,
  Switch,
  Textarea,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@vitana/ui';
export type { SwitchProps, TextareaProps } from '@vitana/ui';

export type PillarKey = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';

export type MemoryPalette = {
  pillar: Record<PillarKey, { accent: string; tint: string }>;
  success: string;
  warning: string;
};

const PILLARS: readonly PillarKey[] = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'];

/** The pillar accent / tint and the status colours for the member's colour scheme. */
export function useMemoryPalette(): MemoryPalette {
  const { scheme } = useTheme();
  const pillar = Object.fromEntries(
    PILLARS.map((p) => [p, { accent: color(`pill-${p}-accent`, scheme), tint: color(`pill-${p}-tint`, scheme) }]),
  ) as MemoryPalette['pillar'];
  return { pillar, success: color('status-success', scheme), warning: color('status-warning', scheme) };
}

/** The web `timeline-meta.tsx` ICONS (gateway icon names) plus the memory screens' own glyphs. */
const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  Apple,
  ArrowLeftRight,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  Brain,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Coins,
  Compass,
  DollarSign,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  Edit2,
  Edit3,
  Eraser,
  FileText,
  Filter,
  FlaskConical,
  Flame,
  FolderOpen,
  Gauge,
  Gift,
  GraduationCap,
  Headphones,
  Heart,
  HeartHandshake,
  Languages,
  Lightbulb,
  ListChecks,
  ListPlus,
  MapPin,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Minus,
  Moon,
  Music,
  PartyPopper,
  Pause,
  PenSquare,
  Phone,
  Pill,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Repeat,
  Route,
  Scale,
  Search,
  Send,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Sparkles,
  Sun,
  Tag,
  Target,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  Watch,
  Wifi,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const MEMORY_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle` (web `iconFor`). Decorative: hidden from a11y. */
export function MemoryIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`memory-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}
