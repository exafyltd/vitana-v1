import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VCard, VCardSkeleton } from '@/components/ui/vcard';
import { useUnifiedEarnings } from '@/hooks/useUnifiedEarnings';
import { BusinessAcceleratorCenterCTA } from '@/components/business/BusinessAcceleratorCenterCTA';
import { MissionOpportunitiesCard } from '@/components/business/MissionOpportunitiesCard';
import { CommercePartnerCard } from '@/components/business/CommercePartnerCard';
import { EarningsHistoryLedger } from '@/components/business/EarningsHistoryLedger';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';

/**
 * VTID-05117 — Business Hub overview (/business) on the Spotlight `storefront`
 * archetype. The hero is the one `spotlight` card (SR-06): the member's real
 * earnings from `useUnifiedEarnings()`. Below it the existing growth actions
 * and, unlike the legacy History tab, only the member's REAL transactions —
 * never the sample ledger (SR-24).
 */

const eur = (value: number) => fmtNumber(value, { style: 'currency', currency: 'EUR' });

export function BusinessHero({ onCreate }: { onCreate: () => void }) {
  const { earnings, isLoading } = useUnifiedEarnings();
  if (isLoading) return <VCardSkeleton size="spotlight" />;
  return (
    <VCard
      size="spotlight"
      eyebrow={t('spotlightMember.business.hero.eyebrow')}
      title={<span className="text-2xl">{eur(earnings.totalEarnings)}</span>}
      meta={t('spotlightMember.business.hero.meta', {
        last30: eur(earnings.earnings30Days),
        pending: eur(earnings.pendingPayout),
      })}
      body={t('screens.businesshub.growYourWellnessBusinessManageClients')}
      actions={
        <Button className="gap-2" onClick={onCreate}>
          <Plus className="size-4" aria-hidden="true" />
          {t('screens.businesshub.business')}
        </Button>
      }
      data-business-hero=""
    />
  );
}

export function BusinessOverviewSpotlight({
  onCreate,
  onCreateService,
  onCreateEvent,
  onCreateCampaign,
}: {
  onCreate: () => void;
  onCreateService: () => void;
  onCreateEvent: () => void;
  onCreateCampaign: () => void;
}) {
  const navigate = useNavigate();
  const { earnings, isLoading } = useUnifiedEarnings();
  return (
    <div className="flex flex-col gap-6" data-business-overview="">
      <BusinessHero onCreate={onCreate} />
      <BusinessAcceleratorCenterCTA
        onCreateEvent={onCreateEvent}
        onAddToInventory={() => navigate('/business/sell-earn')}
        onCreateService={onCreateService}
        onCreatePromotion={onCreateCampaign}
      />
      <MissionOpportunitiesCard />
      <CommercePartnerCard />
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t('spotlightMember.business.history')}</h2>
        <EarningsHistoryLedger transactions={earnings.recentTransactions} isLoading={isLoading} />
      </section>
    </div>
  );
}
