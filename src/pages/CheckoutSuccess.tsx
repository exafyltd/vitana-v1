import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Package,
  ArrowRight,
  Loader2,
  XCircle,
  Wallet,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';
import { useDeposit } from "@/hooks/useWalletGateway";
import { formatMoneyMinor } from "@/lib/format-money";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Phase 0: the gateway marks cart items completed server-side on checkout, so
  // we only refresh the one canonical cart here (no legacy clearCart).
  const { refresh } = useUniversalCart();
  const { toast } = useToast();
  const sessionId = searchParams.get('session_id');
  // Gateway commerce-wallet rail: a Stripe deposit return carries ?deposit_id,
  // a completed universal-cart checkout carries ?checkout_id.
  const depositId = searchParams.get('deposit_id');
  const checkoutId = searchParams.get('checkout_id');

  const { deposit, isLoading: depositLoading, isTerminal: depositTerminal } =
    useDeposit(depositId, { pollUntilTerminal: true });
  const depositSucceeded = deposit?.status === "succeeded";

  useEffect(() => {
    // A completed universal-cart checkout: the gateway already marked the items
    // completed server-side, so just refresh the cached cart to reflect that.
    if (checkoutId) {
      refresh();
    }
    // Legacy ?session_id branch (dead on the Phase 0 buy path) — kept for any
    // stray inbound link.
    if (sessionId) {
      notify('toasts.checkoutsuccess.orderConfirmed', 'toasts.checkoutsuccess.yourPaymentSuccessfulCheckYourEmail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, checkoutId]);

  // ----- Gateway deposit return (Stripe top-up) ----------------------------
  if (depositId) {
    return (
      <AppLayout>
        <SEO
          title={t('screens.checkoutsuccess.orderConfirmedVitana')}
          description="Wallet deposit"
          canonical={window.location.href}
        />
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-3xl mx-auto space-y-6 pt-12">
            <Card className="bg-white/80 backdrop-blur-sm text-center">
              <CardContent className="p-12">
                {!depositTerminal ? (
                  <>
                    <div className="mb-6">
                      <Loader2 className="h-20 w-20 mx-auto text-purple-500 animate-spin" />
                    </div>
                    <StandardHeader
                      title={t('marketplaceCheckout.deposit.checkingTitle')}
                      description={t('marketplaceCheckout.deposit.checkingBody')}
                      emoji="⏳"
                    />
                    {depositLoading && (
                      <p className="mt-6 text-sm text-muted-foreground">
                        {t('marketplaceCheckout.deposit.checkingBody')}
                      </p>
                    )}
                  </>
                ) : depositSucceeded ? (
                  <>
                    <div className="mb-6">
                      <Wallet className="h-20 w-20 mx-auto text-green-500" />
                    </div>
                    <StandardHeader
                      title={t('marketplaceCheckout.deposit.succeededTitle')}
                      description={t('marketplaceCheckout.deposit.succeededBody')}
                      emoji="✅"
                    />
                    {deposit && (
                      <p className="my-6 text-sm text-muted-foreground">
                        {t('marketplaceCheckout.deposit.amountLabel')}
                        {": "}
                        <span className="font-medium tabular-nums">
                          {formatMoneyMinor(deposit.amount_minor, deposit.currency)}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      <XCircle className="h-20 w-20 mx-auto text-red-500" />
                    </div>
                    <StandardHeader
                      title={t('marketplaceCheckout.deposit.failedTitle')}
                      description={t('marketplaceCheckout.deposit.failedBody')}
                      emoji="⚠️"
                    />
                  </>
                )}

                {depositTerminal && (
                  <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={() => navigate('/universal-cart')}>
                      {t('marketplaceCheckout.deposit.backToCart')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO 
        title={t('screens.checkoutsuccess.orderConfirmedVitana')}
        description="Your order has been successfully placed"
        canonical={window.location.href}
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-3xl mx-auto space-y-6 pt-12">
          <Card className="bg-white/80 backdrop-blur-sm text-center">
            <CardContent className="p-12">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
              </div>
              
              <StandardHeader
                title={t('screens.checkoutsuccess.orderConfirmed')}
                description="Thank you for your purchase"
                emoji="🎉"
              />

              <div className="my-8 space-y-4">
                <p className="text-muted-foreground">
                  {t('screens.checkoutsuccess.yourOrderHasSuccessfullyPlacedProcessed')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('screens.checkoutsuccess.youLlReceiveConfirmationEmailWith')}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Package className="h-6 w-6 text-purple-600" />
                  <h3 className="font-semibold text-lg">{t('screens.checkoutsuccess.whatSNext')}</h3>
                </div>
                <ul className="text-sm text-left space-y-2 max-w-md mx-auto">
                  <li>{t('screens.checkoutsuccess.orderConfirmationSentYourEmail')}</li>
                  <li>{t('screens.checkoutsuccess.yourItemsWillPreparedForShipment')}</li>
                  <li>{t('screens.checkoutsuccess.youLlReceiveTrackingInformationWithin')}</li>
                  <li>{t('screens.checkoutsuccess.expectedDelivery35BusinessDays')}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg"
                  onClick={() => navigate('/discover/orders')}
                >
                  {t('screens.checkoutsuccess.viewMyOrders')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/discover')}
                >
                  {t('screens.checkoutsuccess.continueShopping')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t('screens.checkoutsuccess.needHelp')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('screens.checkoutsuccess.ifYouHaveAnyQuestionsAbout')}
              </p>
              <Button variant="outline" onClick={() => navigate('/support')}>
                {t('screens.checkoutsuccess.contactSupport')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
