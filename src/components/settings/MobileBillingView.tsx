import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useBilling, useOpenPortal } from '@/hooks/useBilling';
import { SubscriptionStateCard } from '@/components/subscription/SubscriptionStateCard';
import { CreatorPaymentsSection } from '@/components/creator/CreatorPaymentsSection';

export type MobileBillingSection =
  | 'billing'
  | 'billing.plan'
  | 'billing.payment'
  | 'billing.invoices'
  | 'billing.creator';

interface MobileBillingViewProps {
  section: MobileBillingSection;
  onNavigateChild: (section: MobileBillingSection) => void;
}

function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

function RowLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

export function MobileBillingView({ section, onNavigateChild }: MobileBillingViewProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useBilling();
  const portal = useOpenPortal();

  async function handleOpenPortal() {
    try {
      const result = await portal.mutateAsync();
      if (result?.url) window.location.assign(result.url);
    } catch {
      // billingFetch surfaces the error toast itself
    }
  }

  if (isLoading) return <Loading />;
  if (isError || !data) {
    return (
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('billing.checkoutErrors.checkoutFailed')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasCustomer = data.stripe.has_customer;

  if (section === 'billing') {
    return (
      <>
        <SubscriptionStateCard data={data} />
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-2">
            <RowLink
              icon={<Sparkles className="w-4 h-4" />}
              label={t('billing.mobileBilling.navPlan')}
              onClick={() => onNavigateChild('billing.plan')}
            />
            <RowLink
              icon={<CreditCard className="w-4 h-4" />}
              label={t('billing.mobileBilling.navPayment')}
              onClick={() => onNavigateChild('billing.payment')}
            />
            <RowLink
              icon={<Receipt className="w-4 h-4" />}
              label={t('billing.mobileBilling.navInvoices')}
              onClick={() => onNavigateChild('billing.invoices')}
            />
            <RowLink
              icon={<DollarSign className="w-4 h-4" />}
              label={t('billing.mobileBilling.navCreator')}
              onClick={() => onNavigateChild('billing.creator')}
            />
          </CardContent>
        </Card>
      </>
    );
  }

  if (section === 'billing.plan') {
    return (
      <>
        <SubscriptionStateCard data={data} />
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/wallet/subscriptions')}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('billing.mobileBilling.changePlan')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {hasCustomer && (
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={handleOpenPortal}
                disabled={portal.isPending}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {t('billing.state.manage')}
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  if (section === 'billing.payment') {
    return (
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4.5 h-4.5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('billing.mobileBilling.paymentTitle')}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasCustomer
              ? t('billing.mobileBilling.paymentBody')
              : t('billing.mobileBilling.paymentNoneBody')}
          </p>
          {hasCustomer ? (
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleOpenPortal}
              disabled={portal.isPending}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t('billing.mobileBilling.openStripe')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/wallet/subscriptions')}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('billing.state.viewPlans')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (section === 'billing.invoices') {
    return (
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-4.5 h-4.5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('billing.mobileBilling.invoicesTitle')}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('billing.mobileBilling.invoicesBody')}
          </p>
          {hasCustomer && (
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleOpenPortal}
              disabled={portal.isPending}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t('billing.mobileBilling.openStripe')}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (section === 'billing.creator') {
    return <CreatorPaymentsSection />;
  }

  return null;
}
