/**
 * Creator Onboarded Success Page
 * VTID-01230: Success page after Stripe Connect onboarding
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelContent } from '@/components/layout/spotlight/Panel';
import { Button } from '@/components/ui/button';
import { useCreatorStatus } from '@/hooks/useCreator';
import { CheckCircle, DollarSign, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import SEO from '@/components/SEO';
import { t } from '@/lib/i18n-toast';
import { Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { ArchetypeSkeleton, ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { SpotlightNotice, SpotlightPanel } from '@/components/spotlight/member/MemberSpotlight';

export default function CreatorOnboarded() {
  const navigate = useNavigate();
  const { data: status, isLoading, refetch } = useCreatorStatus();
  const [isRefetching, setIsRefetching] = useState(false);

  // Refetch status on mount to get latest from webhook
  useEffect(() => {
    const fetchStatus = async () => {
      setIsRefetching(true);
      await refetch();
      setIsRefetching(false);
    };
    fetchStatus();
  }, [refetch]);

  const isFullyOnboarded = status?.charges_enabled && status?.payouts_enabled;
  // VTID-05117 — Spotlight (desktop + flag): the Stripe return page inside the Vitanaland frame,
  // skeleton instead of a spinner; phones and flag-off keep the screen below.
  const spotlight = useSpotlightEnabled();

  if (spotlight) {
    const loadingStatus = isLoading || isRefetching;
    const benefits = [
      { Icon: DollarSign, title: 'screens.creatoronboarded.youKeep90', desc: 'screens.creatoronboarded.earn90EveryPaidLiveRoom' },
      { Icon: CheckCircle, title: 'screens.creatoronboarded.instantAccess', desc: 'screens.creatoronboarded.startCreatingPaidRoomsImmediately' },
      { Icon: Sparkles, title: 'screens.creatoronboarded.directDeposits', desc: 'screens.creatoronboarded.earningsDepositedDirectlyYourBankAccount' },
    ];
    return (
      <AppLayout>
        <SEO title={t('screens.creatoronboarded.paymentSetupCompleteVitana')} description={t('screens.creatoronboarded.youReAllSetStartEarning')} canonical={window.location.href} />
        <ScreenFrame archetype="collection">
          <div className="mx-auto flex max-w-stage flex-col gap-4">
            {loadingStatus ? (
              <ArchetypeSkeleton archetype="form" />
            ) : isFullyOnboarded ? (
              <SpotlightPanel
                Icon={CheckCircle}
                title={t('screens.creatoronboarded.value0PaymentSetupComplete', { value0: '' })}
                description={t('screens.creatoronboarded.youReAllSetStartEarning')}
              >
                <ul className="flex flex-col gap-4">
                  {benefits.map(({ Icon, title, desc }) => (
                    <li key={title} className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-status-success" aria-hidden="true" />
                      <div>
                        <div className="font-semibold">{t(title)}</div>
                        <p className="text-sm text-muted-foreground">{t(desc)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate('/community')} className="gap-2">
                    {t('screens.creatoronboarded.createYourFirstPaidRoom')}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/settings/billing')} className="gap-2">
                    {t('screens.creatoronboarded.viewPaymentSettings')}
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </SpotlightPanel>
            ) : (
              <SpotlightPanel
                Icon={Clock}
                title={t('screens.creatoronboarded.setupProgress')}
                description={t('screens.creatoronboarded.yourPaymentSetupProcessedThisCan')}
              >
                <SpotlightNotice tone="warning">
                  <p className="mb-1 font-medium">{t('screens.creatoronboarded.whatSNext')}</p>
                  <ul className="flex list-disc flex-col gap-1 ps-5">
                    <li>{t('screens.creatoronboarded.stripeVerifyingYourAccountInformation')}</li>
                    <li>{t('screens.creatoronboarded.youLlReceiveEmailWhenSetup')}</li>
                    <li>{t('screens.creatoronboarded.thisUsuallyTakes510Minutes')}</li>
                  </ul>
                </SpotlightNotice>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => refetch()} variant="outline">
                    {t('screens.creatoronboarded.refreshStatus')}
                  </Button>
                  <Button onClick={() => navigate('/settings/billing')} variant="secondary">
                    {t('screens.creatoronboarded.goSettings')}
                  </Button>
                </div>
              </SpotlightPanel>
            )}
          </div>
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to flex items-center justify-center p-6">
      <SEO
        title={t('screens.creatoronboarded.paymentSetupCompleteVitana')}
        description="Your creator payment setup is complete"
        canonical={window.location.href}
      />

      <Panel className="max-w-2xl w-full">
        <PanelContent className="pt-12 pb-8 px-8">
          {/* Loading State */}
          {(isLoading || isRefetching) && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                {/* design-allow-next-line: action in progress, not a data load */}
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('screens.creatoronboarded.checkingYourPaymentStatus')}</h1>
                <p className="text-muted-foreground mt-2">
                  {t('screens.creatoronboarded.thisShouldOnlyTakeMoment')}
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {!isLoading && !isRefetching && isFullyOnboarded && (
            <div className="text-center space-y-8">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-status-success rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative bg-status-success-subtle rounded-full p-6">
                    <CheckCircle className="w-16 h-16 text-status-success" />
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  <Sparkles className="w-8 h-8 inline-block text-status-warning mb-1" />{t('screens.creatoronboarded.value0PaymentSetupComplete', { value0: ' ' })}
                </h1>
                <p className="text-lg text-muted-foreground mt-2">{t('screens.creatoronboarded.youReAllSetStartEarning')}
                </p>
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-r from-status-success-subtle to-status-info-subtle rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-status-success-subtle rounded-full p-2 mt-0.5">
                    <DollarSign className="w-5 h-5 text-status-success" />
                  </div>
                  <div className="text-start flex-1">
                    <h3 className="font-semibold text-foreground">{t('screens.creatoronboarded.youKeep90')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.creatoronboarded.earn90EveryPaidLiveRoom')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-status-info-subtle rounded-full p-2 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-status-info" />
                  </div>
                  <div className="text-start flex-1">
                    <h3 className="font-semibold text-foreground">{t('screens.creatoronboarded.instantAccess')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.creatoronboarded.startCreatingPaidRoomsImmediately')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-category-2/15 rounded-full p-2 mt-0.5">
                    <Sparkles className="w-5 h-5 text-category-2" />
                  </div>
                  <div className="text-start flex-1">
                    <h3 className="font-semibold text-foreground">{t('screens.creatoronboarded.directDeposits')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.creatoronboarded.earningsDepositedDirectlyYourBankAccount')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/community')}
                  className="gap-2"
                >
                  {t('screens.creatoronboarded.createYourFirstPaidRoom')}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/settings/billing')}
                  className="gap-2"
                >
                  {t('screens.creatoronboarded.viewPaymentSettings')}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Incomplete State */}
          {!isLoading && !isRefetching && !isFullyOnboarded && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-status-warning-subtle rounded-full p-6">
                  <CheckCircle className="w-16 h-16 text-status-warning" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold">{t('screens.creatoronboarded.setupProgress')}</h1>
                <p className="text-muted-foreground mt-2">
                  {t('screens.creatoronboarded.yourPaymentSetupProcessedThisCan')}
                </p>
              </div>

              <div className="bg-status-warning-subtle border border-status-warning/30 rounded-lg p-4 text-sm text-start">
                <p className="font-medium text-foreground mb-2">{t('screens.creatoronboarded.whatSNext')}</p>
                <ul className="space-y-1 text-status-warning">
                  <li>{t('screens.creatoronboarded.stripeVerifyingYourAccountInformation')}</li>
                  <li>{t('screens.creatoronboarded.youLlReceiveEmailWhenSetup')}</li>
                  <li>{t('screens.creatoronboarded.thisUsuallyTakes510Minutes')}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                >
                  {t('screens.creatoronboarded.refreshStatus')}
                </Button>

                <Button
                  onClick={() => navigate('/settings/billing')}
                  variant="secondary"
                >
                  {t('screens.creatoronboarded.goSettings')}
                </Button>
              </div>
            </div>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
}
