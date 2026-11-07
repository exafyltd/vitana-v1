/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the N2 primitives and
 * lucide glyphs the patient-mode screens render beyond `src/ports/ui.tsx`:
 * the centred `Dialog` (web Results detail, `src/pages/patient/Results.tsx`),
 * the `ResponsiveDialog` bottom sheet (web `PartnerLinkRequestsCard`) and the
 * token category colours (`text-category-3` / `bg-category-3`). One port so screen files never import `@vitana/ui` or
 * `@vitana/tokens` directly (tests/ports.test.ts); kept out of
 * `src/ports/ui.tsx` so parallel lanes do not edit the same port file.
 */
import type { ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Heart,
  MapPin,
  Plus,
  Shield,
  ShieldCheck,
  Target,
  TestTube,
  TrendingUp,
  Users,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@vitana/ui';
import { color } from '@vitana/tokens';

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@vitana/ui';

const GLYPHS = {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Heart,
  MapPin,
  Plus,
  Shield,
  ShieldCheck,
  Target,
  TestTube,
  TrendingUp,
  Users,
} satisfies Record<string, ComponentType<LucideProps>>;

export type PatientGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). */
export function PatientIcon({ name, size = 16, color: tint, opacity }: { name: PatientGlyph; size?: number; color?: string; opacity?: number }): ReactElement {
  const { colors } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View
      testID={`patient-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, opacity }}
    >
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** `--category-<n>` for the member's colour scheme (web `text-category-3` / `bg-category-3`). */
export function useCategoryColor(n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): string {
  const { scheme } = useTheme();
  return color(`category-${n}`, scheme);
}
