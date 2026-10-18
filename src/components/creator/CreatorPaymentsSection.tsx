/**
 * Creator Payments Section
 * VTID-01230: Stripe Connect Express creator earnings management
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreatorStatus, useCreatorDashboard } from '@/hooks/useCreator';
import { EnablePaymentsButton } from './EnablePaymentsButton';
import { DollarSign, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

export function CreatorPaymentsSection() {
  const { data: status, isLoading } = useCreatorStatus();
  const { mutate: openDashboard, isPending: isDashboardLoading } = useCreatorDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('screens.creator.creatorPayments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            {t('screens.creator.loadingPaymentStatus')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFullyOnboarded = status?.charges_enabled && status?.payouts_enabled;
  const isPartiallyOnboarded = status?.stripe_account_id && !isFullyOnboarded;
  const notOnboarded = !status?.stripe_account_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {t('screens.creator.creatorPayments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{t('screens.creator.paymentStatus')}</h3>
            <p className="text-sm text-muted-foreground">{t('screens.creator.receive90RevenueFromPaidLive')}
            </p>
          </div>
          {isFullyOnboarded && (
            <Badge variant="default" className="bg-status-success">
              <CheckCircle className="w-3 h-3 me-1" />
              {t('screens.creator.active')}
            </Badge>
          )}
          {isPartiallyOnboarded && (
            <Badge variant="secondary" className="bg-status-warning-subtle text-status-warning">
              <AlertCircle className="w-3 h-3 me-1" />
              {t('screens.creator.setupIncomplete')}
            </Badge>
          )}
          {notOnboarded && (
            <Badge variant="outline">
              <AlertCircle className="w-3 h-3 me-1" />{t('screens.creator.notEnabled')}
            </Badge>
          )}
        </div>

        {/* Payment Details (if onboarded) */}
        {isFullyOnboarded && (
          <>
            <div className="p-4 bg-status-success-subtle border border-status-success/25 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-status-success mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-status-success">{t('screens.creator.paymentsEnabled')}</h4>
                  <p className="text-sm text-status-success mt-1">
                    {t('screens.creator.youCanNowCreatePaidLive')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-sunken rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.creator.yourShare')}</div>
                <div className="text-2xl font-bold text-status-success">90%</div>
                <div className="text-xs text-muted-foreground">{t('screens.creator.roomPrice')}</div>
              </div>
              <div className="p-3 bg-surface-sunken rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.creator.platformFee')}</div>
                <div className="text-2xl font-bold text-muted-foreground">10%</div>
                <div className="text-xs text-muted-foreground">{t('screens.creator.serviceFee')}</div>
              </div>
            </div>
          </>
        )}

        {/* Incomplete Warning */}
        {isPartiallyOnboarded && (
          <div className="p-4 bg-status-warning-subtle border border-status-warning/25 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-status-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-status-warning">{t('screens.creator.setupIncomplete')}</h4>
                <p className="text-sm text-status-warning mt-1">{t('screens.creator.completeYourPaymentSetupStartReceiving')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not Onboarded Info */}
        {notOnboarded && (
          <div className="p-4 bg-category-3/10 border border-category-3/25 rounded-lg">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-category-3 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-category-3">{t('screens.creator.earnFromYourLiveRooms')}</h4>
                <p className="text-sm text-category-3 mt-1">{t('screens.creator.enablePaymentsCreatePaidLiveRooms')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <EnablePaymentsButton />

          {isFullyOnboarded && (
            <Button
              variant="outline"
              onClick={() => openDashboard()}
              disabled={isDashboardLoading}
            >
              <ExternalLink className="w-4 h-4 me-2" />
              {isDashboardLoading ? 'Opening...' : 'View Dashboard'}
            </Button>
          )}
        </div>

        {/* Revenue Examples */}
        {!notOnboarded && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">{t('screens.creator.revenueExamples')}</h4>
            <div className="space-y-2">
              {[
                { price: 9.99, creator: 8.99, platform: 1.00 },
                { price: 19.99, creator: 17.99, platform: 2.00 },
                { price: 49.99, creator: 44.99, platform: 5.00 },
              ].map(({ price, creator, platform }) => (
                <div key={price} className="flex items-center justify-between text-sm p-2 bg-surface-sunken rounded">
                  <span className="text-muted-foreground">{t('screens.creator.roomPricePrice', { price })}</span>
                  <div className="flex gap-4">
                    <span className="text-status-success font-medium">{t('screens.creator.youCreator', { creator })}</span>
                    <span className="text-muted-foreground">{t('screens.creator.feePlatform', { platform })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
