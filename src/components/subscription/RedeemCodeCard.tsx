/**
 * VTID-03107 · "Got a code?" redeem card.
 *
 * Anchored at the top of the Subscriptions screen for users without an active
 * paid subscription. Single text input + Redeem button. Handles all
 * fn_redeem_code error codes with friendly i18n messages.
 *
 * Auto-uppercase + auto-strip-non-alphanumeric on input so users can paste
 * "vitana test a4f2 9kx1" and it normalizes.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, CheckCircle2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import { useRedeemCode } from '@/hooks/useBilling';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

interface RedeemSuccess {
  granted_plan: string;
  granted_until: string;
  uses_count?: number;
  max_uses?: number;
  campaign?: string;
}

export function RedeemCodeCard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialCode = params.get('code') ?? '';
  const [code, setCode] = useState(normalize(initialCode));
  const [success, setSuccess] = useState<RedeemSuccess | null>(null);
  const redeem = useRedeemCode();
  const { toast } = useToast();

  function mapError(errorCode?: string): string {
    switch (errorCode) {
      case 'INVALID_CODE':
        return t('billing.redeemCard.error.invalid');
      case 'EXPIRED':
      case 'EXPIRED_OR_INACTIVE':
        return t('billing.redeemCard.error.expired');
      case 'MAX_USES_REACHED':
        return t('billing.redeemCard.error.maxUsed');
      case 'ALREADY_REDEEMED':
        return t('billing.redeemCard.error.alreadyRedeemed');
      case 'STRIPE_SUB_ACTIVE':
        return t('billing.redeemCard.error.stripeActive');
      case 'BUDGET_EXHAUSTED':
        return t('billing.redeemCard.error.budgetExhausted');
      default:
        return t('billing.redeemCard.error.generic');
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!code || code.length < 4) return;
    try {
      const result = await redeem.mutateAsync({ code });
      if (result.ok && result.granted_until) {
        setSuccess({
          granted_plan: result.granted_plan || 'premium',
          granted_until: result.granted_until,
          uses_count: result.uses_count,
          max_uses: result.max_uses,
          campaign: result.campaign,
        });
      } else {
        toast({
          description: mapError(result.error),
          variant: 'destructive',
        });
      }
    } catch (err: unknown) {
      const anyErr = err as { errorCode?: string; message?: string };
      toast({
        description: mapError(anyErr.errorCode),
        variant: 'destructive',
      });
    }
  }

  // Auto-submit when arriving via deep link with ?code=...
  useEffect(() => {
    if (initialCode && !success && !redeem.isPending) {
      handleSubmit();
      // Clean the URL so a refresh doesn't re-submit
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (success) {
    const isFounding = success.campaign === 'founding_500' && success.uses_count !== undefined && success.max_uses !== undefined;
    return (
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="font-semibold text-lg">{t('billing.redeemCard.successTitle')}</h3>
          </div>
          {isFounding ? (
            <p className="text-sm">
              {t('billing.redeemCard.founding', { position: success.uses_count!, max: success.max_uses! })}
            </p>
          ) : (
            <p className="text-sm">
              {t('billing.redeemCard.successBody', { date: fmtDate(new Date(success.granted_until)) })}
            </p>
          )}
          <Button onClick={() => navigate('/wallet/subscriptions')} variant="outline" size="sm">
            {t('billing.state.viewPlans')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('billing.redeemCard.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(normalize(e.target.value))}
            placeholder={t('billing.redeemCard.placeholder')}
            className="font-mono"
            autoComplete="off"
            inputMode="text"
            aria-label={t('billing.redeemCard.title')}
          />
          <Button type="submit" disabled={redeem.isPending || code.length < 4}>
            {redeem.isPending ? t('billing.redeemCard.redeeming') : t('billing.redeemCard.button')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
