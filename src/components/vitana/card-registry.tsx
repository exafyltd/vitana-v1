/**
 * VTID-05143 — the ONE map from card_type to the component that renders it.
 * The strip (EnrichmentCardStrip), the News feed (Home) and a card shared in
 * a chat (VitanaChatCard) all render through it, so a card looks and acts the
 * same everywhere. A type with no entry renders nothing.
 */
import type { ComponentType } from 'react';
import type { VitanaCardProps } from '@/components/vitana/card-props';
import type { VitanaCardType } from '@/components/vitana/vitana-card-catalog';
import { UploadPhotoCard } from '@/components/enrichment/UploadPhotoCard';
import { AddBioCard } from '@/components/enrichment/AddBioCard';
import { FirstPostCard } from '@/components/enrichment/FirstPostCard';
import { AddInterestsCard } from '@/components/enrichment/AddInterestsCard';
import { SetLocationCard } from '@/components/enrichment/SetLocationCard';
import { ConnectInstagramCard } from '@/components/enrichment/ConnectInstagramCard';
import { ConnectFacebookCard } from '@/components/enrichment/ConnectFacebookCard';
import { ConnectCalendarCard } from '@/components/enrichment/ConnectCalendarCard';
import { ImportContactsCard } from '@/components/enrichment/ImportContactsCard';
import { EnableNotificationsCard } from '@/components/enrichment/EnableNotificationsCard';
import { UploadCoverCard } from '@/components/enrichment/UploadCoverCard';
import { CompleteProfileCard } from '@/components/enrichment/CompleteProfileCard';
import { UnreadMatchesCard } from '@/components/enrichment/UnreadMatchesCard';
import { StreakAtRiskCard } from '@/components/enrichment/StreakAtRiskCard';
import { DailyDiaryCard } from '@/components/feature/DailyDiaryCard';
import { TalkToVitanaCard } from '@/components/feature/TalkToVitanaCard';
import { FindAMatchCard } from '@/components/feature/FindAMatchCard';
import { AutopilotCard } from '@/components/feature/AutopilotCard';
import { CalendarCard } from '@/components/feature/CalendarCard';
import { UploadMediaCard } from '@/components/feature/UploadMediaCard';
import { DiscoverCard } from '@/components/feature/DiscoverCard';
import { LongevityJourneyCard } from '@/components/home/LongevityJourneyCard';
import { VitanaIndexCard } from '@/components/home/VitanaIndexCard';
import { InviteFriendCard } from '@/components/home/InviteFriendCard';
import { DidYouKnowCard } from '@/components/proactive/DidYouKnowCard';

/*
 * VTID-05086: the existing feature cards keep their own content (live Index
 * score, journey progress, server-paced tip). Outside Home they get the
 * strip's dismiss, or no X at all in a chat (no onDismiss → null).
 */
function GuidedJourneyFeatureCard({ onDismiss }: VitanaCardProps) {
  return <LongevityJourneyCard onDismiss={onDismiss ?? null} />;
}
function VitanaIndexFeatureCard({ onDismiss }: VitanaCardProps) {
  return <VitanaIndexCard onDismiss={onDismiss ?? null} />;
}
function InviteFriendFeatureCard({ onDismiss }: VitanaCardProps) {
  return <InviteFriendCard onDismiss={onDismiss ?? null} />;
}
/** The tip's own X declines that tip on the server (the tour paces the next one). */
function DidYouKnowFeatureCard({ onDismiss }: VitanaCardProps) {
  return <DidYouKnowCard hideDismiss={!onDismiss} />;
}

export const VITANA_CARD_REGISTRY: Partial<Record<VitanaCardType, ComponentType<VitanaCardProps>>> = {
  E1: UploadPhotoCard,
  E2: AddBioCard,
  E3: FirstPostCard,
  E4: AddInterestsCard,
  E5: SetLocationCard,
  E6: ConnectInstagramCard,
  E7: ConnectFacebookCard,
  E8: ConnectCalendarCard,
  E9: ImportContactsCard,
  E10: EnableNotificationsCard,
  E11: UploadCoverCard,
  F1: GuidedJourneyFeatureCard,
  F2: VitanaIndexFeatureCard,
  F3: DailyDiaryCard,
  F4: TalkToVitanaCard,
  F5: FindAMatchCard,
  F6: AutopilotCard,
  F7: InviteFriendFeatureCard,
  F8: DidYouKnowFeatureCard,
  F9: CalendarCard,
  F10: UploadMediaCard,
  F11: DiscoverCard,
  // VTID-05143 Phase 3 — boost cards (G4 "Earn VTNA" is out of scope).
  G1: CompleteProfileCard,
  G2: UnreadMatchesCard,
  G3: StreakAtRiskCard,
};

export function getVitanaCardComponent(cardType: string): ComponentType<VitanaCardProps> | null {
  return (VITANA_CARD_REGISTRY as Record<string, ComponentType<VitanaCardProps> | undefined>)[cardType] ?? null;
}
