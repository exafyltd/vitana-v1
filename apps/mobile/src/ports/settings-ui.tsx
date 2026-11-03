/**
 * VTID-05431 (Native Wave 2, settings lane) — the extra N2 primitives the
 * settings hub and its sub-screens render (web shadcn `Switch`, `Separator`,
 * `Select`, `Label`, the success toast) and the lucide glyphs the web settings pages draw, through
 * one port so screen files never import `@vitana/ui` directly
 * (tests/ports.test.ts). Plain re-exports: the kit's contracts match the
 * screens' needs. Kept out of `src/ports/ui.tsx` so parallel lanes do not
 * edit the same port file.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Accessibility,
  AlertCircle,
  AlertTriangle,
  Baby,
  Bell,
  BellOff,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  Monitor,
  Moon,
  Palette,
  Pill,
  Receipt,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  Utensils,
  Wallet,
  XCircle,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@vitana/ui';

export { Switch, Separator, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Label } from '@vitana/ui';
export type { SwitchProps } from '@vitana/ui';
/** The success toast (web `toast.success`), same N2 store as `notify` / `notifyError` in src/ports/ui.tsx. */
export { notifySuccess } from '@vitana/ui';

const GLYPHS = {
  Accessibility,
  AlertCircle,
  AlertTriangle,
  Baby,
  Bell,
  BellOff,
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  Monitor,
  Moon,
  Palette,
  Pill,
  Receipt,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  Utensils,
  Wallet,
  XCircle,
} satisfies Record<string, ComponentType<LucideProps>>;

export type SettingsGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). */
export function SettingsIcon({ name, size = 18, color }: { name: SettingsGlyph; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View testID={`settings-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={color ?? colors.foreground} />
    </View>
  );
}
