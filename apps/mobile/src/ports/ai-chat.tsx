/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the Talk-to-Vitana screen's
 * own port:
 *
 * - the lucide glyphs the web screen and its card strip draw
 *   (`TalkToVitana.tsx`, `MyTicketsList.tsx`, `VitanaRecommendationHeader.tsx`,
 *   `VitanaIndexCard.tsx`, `LongevityJourneyCard.tsx`, `DailyDiaryCard.tsx`)
 *   beyond the shell icon set in `src/ports/ui.tsx`;
 * - the member-ticket data layer the support lane already re-implemented
 *   natively (`src/screens/support/data/tickets.ts`, VTID-05432), so both
 *   ticket lists share one query key, one status vocabulary and one request;
 * - the home lane's native enrichment-card hook and card
 *   (`src/screens/home/data/enrichment.ts`, `cards/EnrichmentCard.tsx`,
 *   VTID-05297), which the strip renders for its server cards.
 *
 * Screen files read these only through this port (tests/ports.test.ts).
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import {
  Activity,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Minus,
  Play,
  Send,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  HeartPulse,
  type LucideProps,
} from 'lucide-react-native';
import { useButtonForeground, useTheme } from '@vitana/ui';

export { Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@vitana/ui';

export {
  MEMBER_TIMELINE,
  MY_TICKETS_QUERY_KEY,
  matchesTicketRef,
  memberTicketStatus,
  ticketAction,
  ticketAnswer,
  timelineStep,
  useMyTickets,
  type MemberTicket,
  type TicketKind,
} from '../screens/support/data/tickets';

export { FEATURE_CARD_DISMISS_TTL_MS, featureCardDismissKey } from '@vitana/core/vitana-card-catalog';

export { useEnrichmentCards, type EnrichmentCard as EnrichmentCardData } from '../screens/home/data/enrichment';
export { EnrichmentCard } from '../screens/home/cards/EnrichmentCard';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  Activity,
  Check,
  CheckCircle2,
  HeartPulse,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Minus,
  Play,
  Send,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
};

/** The icon names this port can draw. */
export const AI_CHAT_ICON_KEYS: readonly string[] = Object.keys(ICONS);

/** A lucide glyph by name; an unknown name draws `Circle`. Decorative: hidden from a11y. */
export function AiChatIcon({ name, size = 16, color: tint }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  const Glyph = ICONS[name] ?? Circle;
  return (
    <View testID={`ai-chat-icon-${name}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Glyph size={size} color={tint ?? colors.foreground} />
    </View>
  );
}

/** A glyph inside a kit `Button`, in the button's label colour (web `<Send className="me-2 h-4 w-4" />`). */
export function ButtonIcon({ name, size = 16 }: { name: string; size?: number }) {
  const foreground = useButtonForeground();
  return <AiChatIcon name={name} size={size} color={foreground ?? undefined} />;
}
