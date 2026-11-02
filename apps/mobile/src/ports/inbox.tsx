/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox list
 * screens' own UI port: the N2 kit parts they render beyond `src/ports/ui.tsx`
 * (Input, Label), the lucide glyphs the web inbox draws (`Messages.tsx`,
 * `MobileConversationCard.tsx`, `MobileInboxEmptyState.tsx`,
 * `NewConversationPopup.tsx`, `Archived.tsx`, `Inspiration.tsx`,
 * `InspirationMasterActionPopup.tsx`, `MessageSearchPanel.tsx`,
 * `components/contacts/*`), the clipboard write of the Inspiration "Copy"
 * button (web `navigator.clipboard.writeText`; React Native's own Clipboard
 * module — no extra dependency), and the contact invite's hand-off to the
 * member's own app (web `window.location.href = wa.me / sms: / mailto:` and
 * `navigator.share`; React Native's Linking and Share). Screen files read
 * these only through this port (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { Clipboard, Linking, Share, View } from 'react-native';
import {
  Archive,
  Bookmark,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Heart,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  SearchX,
  Send,
  Share2,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { useButtonForeground, useTheme } from '@vitana/ui';

export {
  Input,
  Label,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from '@vitana/ui';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Archive,
  Bookmark,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Copy,
  Edit,
  Edit3,
  Heart,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  SearchX,
  Send,
  Share2,
  Sparkles,
  Trash2,
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

/** Opens a wa.me / sms: / mailto: link in the member's own app (web `window.location.href = url`). */
export async function openExternalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}

/** The system share sheet with `message` (web `navigator.share({ text })`); false when the member dismissed it. */
export async function shareText(message: string): Promise<boolean> {
  const result = await Share.share({ message });
  return result.action !== Share.dismissedAction;
}
