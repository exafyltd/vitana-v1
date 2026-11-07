/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — the lucide glyphs and
 * the tinted avatar the staff-mode screens render (src/pages/staff/
 * Dashboard.tsx, src/pages/staff/Queue.tsx, the `ComingSoonPlaceholder` icons
 * at src/App.tsx:1769-1810, src/pages/NotAuthorized.tsx). One port so screen
 * files never import `lucide-react-native` or `@vitana/ui` directly
 * (tests/ports.test.ts); kept out of `src/ports/ui.tsx` so the parallel
 * role-mode lanes do not edit the same port file.
 */
import type { ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  MessageSquare,
  Shield,
  User,
  Users,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { Avatar, AvatarFallback, Text, useTheme } from '@vitana/ui';

const GLYPHS = {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  MessageSquare,
  Shield,
  User,
  Users,
  Zap,
} satisfies Record<string, ComponentType<LucideProps>>;

export type StaffGlyph = keyof typeof GLYPHS;

/** A decorative lucide glyph (hidden from assistive tech, like the web's icons). */
export function StaffIcon({ name, size = 16, color: tint, opacity }: { name: StaffGlyph; size?: number; color?: string; opacity?: number }): ReactElement {
  const { colors } = useTheme();
  const Glyph = GLYPHS[name];
  return (
    <View
      testID={`staff-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, opacity }}
    >
      <Glyph testID={`staff-icon-${name}-glyph`} size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** shadcn `<Avatar><AvatarFallback className="bg-… text-…">` with a tinted fallback (Queue.tsx). */
export function StaffAvatar({ initials, background, color: tint }: { initials: string; background: string; color: string }): ReactElement {
  return (
    <Avatar>
      <AvatarFallback testID="staff-avatar-fallback" style={{ backgroundColor: background }}>
        <Text size="sm" weight="500" color={tint}>
          {initials}
        </Text>
      </AvatarFallback>
    </Avatar>
  );
}
