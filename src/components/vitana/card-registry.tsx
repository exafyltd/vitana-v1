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
};

export function getVitanaCardComponent(cardType: string): ComponentType<VitanaCardProps> | null {
  return (VITANA_CARD_REGISTRY as Record<string, ComponentType<VitanaCardProps> | undefined>)[cardType] ?? null;
}
