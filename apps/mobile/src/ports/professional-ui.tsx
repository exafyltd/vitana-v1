/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — the lucide
 * glyphs the professional-mode screens render (src/pages/professional/
 * Dashboard.tsx, the `ComingSoonPlaceholder` icons at src/App.tsx:1698-1752,
 * src/pages/NotAuthorized.tsx). One port so screen files never import
 * `lucide-react-native` or `@vitana/ui` directly (tests/ports.test.ts); kept
 * out of `src/ports/ui.tsx` so the parallel role-mode lanes do not edit the
 * same port file.
 */
import type { ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { Activity, ArrowLeft, BookOpen, Calendar, DollarSign, FileText, Shield, Stethoscope, UserCheck, Users, Wallet, type LucideProps } from 'lucide-react-native';
import { useTheme } from '@vitana/ui';

const GLYPHS = {
  Activity,
  ArrowLeft,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  Stethoscope,
  UserCheck,
  Users,
  Wallet,
} satisfies Record<string, ComponentType<LucideProps>>;

export type ProfessionalGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). */
export function ProfessionalIcon({ name, size = 16, color: tint, opacity }: { name: ProfessionalGlyph; size?: number; color?: string; opacity?: number }): ReactElement {
  const { colors } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View
      testID={`professional-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, opacity }}
    >
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}
