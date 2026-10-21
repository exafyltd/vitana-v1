/**
 * VTID-05143 Phase 3 G1 — Complete Your Profile. Shown while the member's
 * profile is under 80 % (gateway trigger); shows the completion percentage
 * when the gateway sends `params.percentage`.
 *
 * VTID-05212: the button opens the first open profile step, not just the
 * profile page — on /me/profile itself a bare `/me/profile` did nothing. It
 * reads the cached `screen=profile` card list only (no fetch from the card;
 * the profile strips warm it) and takes the first open card whose deep link
 * is a `/me/profile#…` editor hash; `useProfileEditorDeepLink` then opens
 * that drawer, also when the member is already on the page. Until that list
 * is cached, or when no open card has an editor hash, it opens the About
 * editor (`/me/profile#about`). G1 only fires below 80 %, so "everything is
 * done" does not reach this card in practice.
 */
import { Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { VitanaActionCard } from '@/components/vitana/VitanaActionCard';
import { CARD_DEEP_LINKS } from '@/components/vitana/vitana-card-catalog';
import { enrichmentCardsKey, type EnrichmentCardsPayload } from '@/hooks/useEnrichmentCards';
import type { VitanaCardProps } from '@/components/vitana/card-props';
import { boostSubtext, readPercentage } from './boost-metric';

const COPY = {
  eyebrowKey: 'screens.vitanaCards.G1.eyebrow',
  titleKey: 'screens.vitanaCards.G1.title',
  descriptionKey: 'screens.vitanaCards.G1.description',
  actionKey: 'screens.vitanaCards.G1.action',
};

const PROFILE_EDITOR_PREFIX = '/me/profile#';
export const G1_FALLBACK_LINK = '/me/profile#about';

/** The first open card's profile-editor deep link, in server (priority) order. */
export function firstOpenProfileStep(payload: EnrichmentCardsPayload | undefined): string {
  for (const card of payload?.cards ?? []) {
    const link = CARD_DEEP_LINKS[card.card_type];
    if (link?.startsWith(PROFILE_EDITOR_PREFIX)) return link;
  }
  return G1_FALLBACK_LINK;
}

export function CompleteProfileCard({ title, description, params, onDismiss }: VitanaCardProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const go = () => {
    const cached = qc.getQueryData<EnrichmentCardsPayload>([...enrichmentCardsKey(user?.id), 'profile']);
    navigate(firstOpenProfileStep(cached));
  };
  const message = description?.trim() || t(COPY.descriptionKey);
  return (
    <VitanaActionCard
      cardType="G1"
      feature="complete-profile"
      copy={COPY}
      icon={Rocket}
      title={title}
      description={boostSubtext('screens.vitanaCards.G1.metric', message, readPercentage(params), 'percent')}
      onAction={go}
      onDismiss={onDismiss}
    />
  );
}
