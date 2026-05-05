/**
 * Creator Onboarded Success Page
 * VTID-01230: Success page after Stripe Connect onboarding
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreatorStatus } from '@/hooks/useCreator';
import { CheckCircle, DollarSign, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import SEO from '@/components/SEO';
import { t } from '@/lib/i18n-toast';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <SEO
        title={t('screens.creatoronboarded.paymentSetupCompleteVitana')}
        description="Your creator payment setup is complete"
        canonical={window.location.href}
      />

      <Card className="max-w-2xl w-full">
        <CardContent className="pt-12 pb-8 px-8">
          {/* Loading State */}
          {(isLoading || isRefetching) && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                  <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative bg-green-100 rounded-full p-6">
                    <CheckCircle className="w-16 h-16 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  <Sparkles className="w-8 h-8 inline-block text-yellow-500 mb-1" />
                  {' '}Payment Setup Complete!
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  You're all set to start earning from your Live Rooms
                </p>
              </div>

              {/* Benefits */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 rounded-full p-2 mt-0.5">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">{t('screens.creatoronboarded.youKeep90')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.creatoronboarded.earn90EveryPaidLiveRoom')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">{t('screens.creatoronboarded.instantAccess')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.creatoronboarded.startCreatingPaidRoomsImmediately')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 rounded-full p-2 mt-0.5">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">{t('screens.creatoronboarded.directDeposits')}</h3>
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
                <div className="bg-yellow-100 rounded-full p-6">
                  <CheckCircle className="w-16 h-16 text-yellow-600" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold">{t('screens.creatoronboarded.setupProgress')}</h1>
                <p className="text-muted-foreground mt-2">
                  {t('screens.creatoronboarded.yourPaymentSetupProcessedThisCan')}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-left">
                <p className="font-medium text-yellow-900 mb-2">{t('screens.creatoronboarded.whatSNext')}</p>
                <ul className="space-y-1 text-yellow-700">
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
        </CardContent>
      </Card>
    </div>
  );
}
