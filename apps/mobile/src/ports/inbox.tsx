/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox list
 * screens' own UI port: the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Input, Label), the lucide glyphs the web inbox draws (`Messages.tsx`,
 * `MobileConversationCard.tsx`, `MobileInboxEmptyState.tsx`,
 * `NewConversationPopup.tsx`, `Archived.tsx`, `Inspiration.tsx`,
 * `InspirationMasterActionPopup.tsx`), and the clipboard write of the
 * Inspiration "Copy" button (web `navigator.clipboard.writeText`; React
 * Native's own Clipboard module — no extra dependency). Screen files read
 * these only through this port (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { Clipboard, View } from 'react-native';
import {
  Archive,
  Bookmark,
  CheckCheck,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { useButtonForeground, useTheme } from '@vitana/ui';

export { Input, Label } from '@vitana/ui';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Archive,
  Bookmark,
  CheckCheck,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  X,
};

/** The icon names this port can draw. */
export const INBOX_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function InboxIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`inbox-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Icon className="w-4 h-4 me-2" />`). */
export function InboxButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <InboxIcon name={name} size={size} color={foreground ?? undefined} />;
}

/** Writes `text` to the system clipboard (web `navigator.clipboard.writeText`). */
export function copyToClipboard(text: string): void {
  Clipboard.setString(text);
}
