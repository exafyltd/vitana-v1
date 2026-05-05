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
            <p className="text-sm text-muted-foreground">
              Receive 90% of revenue from paid Live Rooms
            </p>
          </div>
          {isFullyOnboarded && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('screens.creator.active')}
            </Badge>
          )}
          {isPartiallyOnboarded && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <AlertCircle className="w-3 h-3 mr-1" />
              {t('screens.creator.setupIncomplete')}
            </Badge>
          )}
          {notOnboarded && (
            <Badge variant="outline">
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Enabled
            </Badge>
          )}
        </div>

        {/* Payment Details (if onboarded) */}
        {isFullyOnboarded && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">{t('screens.creator.paymentsEnabled')}</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {t('screens.creator.youCanNowCreatePaidLive')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.creator.yourShare')}</div>
                <div className="text-2xl font-bold text-green-600">90%</div>
                <div className="text-xs text-muted-foreground">{t('screens.creator.roomPrice')}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-muted-foreground">{t('screens.creator.platformFee')}</div>
                <div className="text-2xl font-bold text-gray-600">10%</div>
                <div className="text-xs text-muted-foreground">{t('screens.creator.serviceFee')}</div>
              </div>
            </div>
          </>
        )}

        {/* Incomplete Warning */}
        {isPartiallyOnboarded && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900">{t('screens.creator.setupIncomplete')}</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Complete your payment setup to start receiving earnings from paid Live Rooms.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not Onboarded Info */}
        {notOnboarded && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">{t('screens.creator.earnFromYourLiveRooms')}</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Enable payments to create paid Live Rooms and receive 90% of the revenue. Quick 2-minute setup with Stripe Connect.
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
              <ExternalLink className="w-4 h-4 mr-2" />
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
                <div key={price} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="text-muted-foreground">{t('screens.creator.roomPricePrice', { price })}</span>
                  <div className="flex gap-4">
                    <span className="text-green-600 font-medium">{t('screens.creator.youCreator', { creator })}</span>
                    <span className="text-gray-500">{t('screens.creator.feePlatform', { platform })}</span>
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
