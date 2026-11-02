/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the chat
 * and call screens' own port: the N2 kit parts they render beyond
 * `src/ports/ui.tsx` (Dialog, Textarea), the lucide icons the web
 * ConversationView / GroupChat / MessageBubble / call screens draw, and the
 * pure web helpers re-exported through `@vitana/core` (message grouping,
 * @mentions, group notices, group management, the Vitana reply Markdown
 * parser). Screen files read these only
 * through this port, never from `@vitana/*` directly (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  EyeOff,
  FileText,
  Image,
  Forward,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  Radio,
  Reply,
  RotateCw,
  Search,
  SearchX,
  Send,
  Settings2,
  Share2,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Square,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
  XCircle,
  type LucideProps,
} from 'lucide-react-native';
import { useUITheme } from './ui';

export { Dialog, DialogContent, DialogHeader, DialogTitle, Textarea } from '@vitana/ui';
export { groupPositions, isGroupEnd, isGroupStart, type GroupPosition } from '@vitana/core/messaging-grouping';
export {
  addMention,
  filterLocalCandidates,
  findActiveMentionToken,
  insertMention,
  pruneMentions,
  splitMentionSegments,
  type Mention,
  type MentionToken,
} from '@vitana/core/mentions';
export { describeGroupNotice, noticeName } from '@vitana/core/group-notice';
export { deactivateParticipant, renameGlobalGroup, type UpdateClient } from '@vitana/core/group-management';
export { parseChatMarkdown, type MdBlock, type MdInline } from '@vitana/core/chat-markdown';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  EyeOff,
  FileText,
  Image,
  Forward,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  Radio,
  Reply,
  RotateCw,
  Search,
  SearchX,
  Send,
  Settings2,
  Share2,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Square,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
  XCircle,
};

export const CHAT_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A chat/call icon by its lucide name; decorative (the control carries the label). */
export function ChatIcon({ name, size = 16, color, flipInRtl }: { name: string; size?: number; color?: string; flipInRtl?: boolean }) {
  const { colors, direction } = useUITheme();
  const Glyph = ICONS[name];
  const flip = flipInRtl && direction === 'rtl';
  return (
    <View
      testID={`chat-icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: flip ? [{ scaleX: -1 }] : undefined }}
    >
      {Glyph ? <Glyph size={size} color={color ?? colors.foreground} /> : null}
    </View>
  );
}
