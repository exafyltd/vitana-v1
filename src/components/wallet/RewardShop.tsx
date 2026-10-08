/**
 * VTID-04983 — Wallet → Rewards → Shop: spend earned VTNA on rewards.
 * Prices come from the gateway (VTID-04982) and are debited there; this
 * screen never sends a price. Ship items open Stripe Checkout for the
 * shipping fee; VTNA moves only after that payment.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Gift, Package, ShoppingBag, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, notifyError, notifySuccess, useI18nLocale } from '@/lib/i18n-toast';
import { fmtDate, fmtNumber, fmtRegion } from '@/lib/locale-format';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { useEurUsdRate } from '@/hooks/useEurUsdRate';
import {
  itemText, redeemRewardItem, useRewardOrders, useRewardShop,
  type RewardShop as ShopData, type RewardShopItem, type ShopCurrency,
} from '@/hooks/useRewardShop';

const KNOWN_ERRORS = new Set([
  'INSUFFICIENT_BALANCE', 'OUT_OF_STOCK', 'UNDER_MIN_AGE', 'AGE_CONFIRMATION_REQUIRED', 'ADDRESS_REQUIRED',
  'SHIPPING_NOT_AVAILABLE', 'ITEM_NOT_AVAILABLE', 'NOT_ELIGIBLE', 'CHECKOUT_FAILED',
]);

function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function FulfilmentIcon({ f }: { f: RewardShopItem['fulfilment'] }) {
  if (f === 'ship') return <Package className="h-4 w-4" aria-hidden />;
  if (f === 'event') return <Ticket className="h-4 w-4" aria-hidden />;
  return <Gift className="h-4 w-4" aria-hidden />;
}

function useMoney(currency: ShopCurrency) {
  const { eurPerUsd } = useEurUsdRate();
  return (eur: number) => {
    const value = currency === 'EUR' ? eur : eur / eurPerUsd;
    return fmtNumber(value, { style: 'currency', currency, maximumFractionDigits: 2 });
  };
}

function ItemCard({ item, locale, money, onOpen }: {
  item: RewardShopItem; locale: string; money: (eur: number) => string; onOpen: () => void;
}) {
  const title = itemText(item.titles, locale, item.slug);
  return (
    <Card className="flex flex-col overflow-hidden" data-testid={`reward-shop-item-${item.slug}`}>
      {item.images[0] && (
        <img src={item.images[0]} alt={title} className="h-40 w-full object-cover" loading="lazy" />
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-start break-words">{title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FulfilmentIcon f={item.fulfilment} />
            {t(`wallet.rewardShop.fulfilment.${item.fulfilment}`)}
          </span>
          {item.age_restricted && (
            <Badge variant="outline">{t('wallet.rewardShop.ageBadge', { age: fmtNumber(item.min_age ?? 18) })}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xl font-bold" data-testid={`reward-shop-price-${item.slug}`}>
            {t('wallet.rewardShop.price', { amount: fmtNumber(item.vtna_price) })}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('wallet.rewardShop.approx', { money: money(item.eur_value) })}
          </span>
        </div>
        <Button className="w-full" disabled={!item.available} onClick={onOpen} data-testid={`reward-shop-open-${item.slug}`}>
          {item.available ? t('wallet.rewardShop.view') : t('wallet.rewardShop.soldOut')}
        </Button>
      </CardContent>
    </Card>
  );
}

function RedeemDialog({ item, shop, currency, locale, money, onClose }: {
  item: RewardShopItem; shop: ShopData; currency: ShopCurrency; locale: string;
  money: (eur: number) => string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [key] = useState(newKey);
  const [busy, setBusy] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const countries = useMemo(
    () => item.ships_to_countries.filter((c) => shop.shipping_fees.some((f) => f.country === c && f.currency === currency)),
    [item, shop, currency],
  );
  const [country, setCountry] = useState(countries[0] ?? '');
  const [addr, setAddr] = useState({ name: '', line1: '', line2: '', postal_code: '', city: '' });
  const fee = shop.shipping_fees.find((f) => f.country === country && f.currency === currency);
  const shortfall = Math.max(0, item.vtna_price - shop.earned_balance);
  const ship = item.fulfilment === 'ship';
  const title = itemText(item.titles, locale, item.slug);
  const description = itemText(item.descriptions, locale, '');

  const ready = shortfall === 0 && item.available
    && (!item.age_restricted || (ageOk && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)))
    && (!ship || (!!fee && addr.name.trim() && addr.line1.trim() && addr.postal_code.trim() && addr.city.trim()));

  const submit = async () => {
    setBusy(true);
    const res = await redeemRewardItem({
      item_id: item.id,
      idempotency_key: key,
      currency,
      locale,
      ...(ship ? { country, address: { ...addr, line2: addr.line2 || undefined } } : {}),
      ...(item.age_restricted ? { birth_date: birthDate, age_confirmed: ageOk } : {}),
    }).catch(() => ({ ok: false as const, error: 'NETWORK' }));
    setBusy(false);
    if (res.ok !== true) {
      const code = (res as { error: string }).error;
      notifyError(`wallet.rewardShop.errors.${KNOWN_ERRORS.has(code) ? code : 'generic'}`);
      return;
    }
    if (res.checkout_url) {
      window.location.assign(res.checkout_url);
      return;
    }
    notifySuccess('wallet.rewardShop.redeemed', undefined, { item: title });
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="reward-shop-dialog">
        <DialogHeader>
          <DialogTitle className="text-start">{title}</DialogTitle>
          {description && <DialogDescription className="text-start whitespace-pre-line">{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{t('wallet.rewardShop.price', { amount: fmtNumber(item.vtna_price) })}</span>
            <span className="text-sm text-muted-foreground">{t('wallet.rewardShop.approx', { money: money(item.eur_value) })}</span>
          </div>
          <p className="text-sm text-start" data-testid="reward-shop-balance">
            {shortfall > 0
              ? t('wallet.rewardShop.shortfall', { amount: fmtNumber(shortfall) })
              : t('wallet.rewardShop.balance', { amount: fmtNumber(shop.earned_balance) })}
          </p>

          {item.age_restricted && (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="reward-birth-date">{t('wallet.rewardShop.birthDate')}</Label>
              <Input id="reward-birth-date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <label className="flex items-start gap-2 text-sm text-start">
                <Checkbox checked={ageOk} onCheckedChange={(v) => setAgeOk(v === true)} />
                <span>{t('wallet.rewardShop.ageConfirm', { age: fmtNumber(item.min_age ?? 18) })}</span>
              </label>
            </div>
          )}

          {ship && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="font-medium text-start">{t('wallet.rewardShop.shippingTitle')}</p>
              {countries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-start">{t('wallet.rewardShop.noShipping')}</p>
              ) : (
                <>
                  <Label>{t('wallet.rewardShop.country')}</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c} value={c}>{fmtRegion(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(['name', 'line1', 'line2', 'postal_code', 'city'] as const).map((f) => (
                    <div key={f} className="space-y-1">
                      <Label htmlFor={`reward-addr-${f}`}>{t(`wallet.rewardShop.address.${f}`)}</Label>
                      <Input id={`reward-addr-${f}`} value={addr[f]} autoComplete="on"
                        onChange={(e) => setAddr((a) => ({ ...a, [f]: e.target.value }))} />
                    </div>
                  ))}
                  {fee && (
                    <p className="text-sm text-start" data-testid="reward-shop-fee">
                      {t('wallet.rewardShop.shippingFee', {
                        money: fmtNumber(fee.fee_cents / 100, { style: 'currency', currency: fee.currency }),
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-start">{t('wallet.rewardShop.shippingNote')}</p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('wallet.rewardShop.cancel')}</Button>
          <Button onClick={submit} disabled={!ready || busy} data-testid="reward-shop-confirm">
            {ship ? t('wallet.rewardShop.payShipping') : t('wallet.rewardShop.redeem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Orders({ shop, locale }: { shop: ShopData; locale: string }) {
  const { data } = useRewardOrders();
  if (!data || data.length === 0) return null;
  const titleOf = (id: string) => {
    const it = shop.items.find((i) => i.id === id);
    return it ? itemText(it.titles, locale, it.slug) : t('wallet.rewardShop.unknownItem');
  };
  return (
    <Card data-testid="reward-shop-orders">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('wallet.rewardShop.ordersTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {data.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0">
              <div className="min-w-0 text-start">
                <p className="break-words">{titleOf(o.item_id)}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(new Date(o.created_at))}</p>
              </div>
              <div className="shrink-0 text-end">
                <Badge variant="secondary">{t(`wallet.rewardShop.status.${o.status}`)}</Badge>
                <p className="text-xs text-muted-foreground">{t('wallet.rewardShop.price', { amount: fmtNumber(o.vtna_amount) })}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RewardShop({ shippingReturn }: { shippingReturn?: 'paid' | 'cancelled' | null }) {
  const { data, isLoading, error } = useRewardShop();
  const { displayCurrency } = useDisplayCurrency();
  const currency: ShopCurrency = displayCurrency === 'USD' ? 'USD' : 'EUR';
  const money = useMoney(currency);
  const locale = useI18nLocale();
  const [open, setOpen] = useState<RewardShopItem | null>(null);

  if (isLoading) return <p className="text-muted-foreground" data-testid="reward-shop-loading">{t('wallet.rewardShop.loading')}</p>;
  if (error || !data) return <p className="text-destructive" data-testid="reward-shop-error">{t('wallet.rewardShop.error')}</p>;

  return (
    <div className="space-y-6" data-testid="reward-shop">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden />
            {t('wallet.rewardShop.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-start">{t('wallet.rewardShop.summary')}</p>
          <p className="text-sm text-muted-foreground" data-testid="reward-shop-earned">
            {t('wallet.rewardShop.balance', { amount: fmtNumber(data.earned_balance) })}
          </p>
          {shippingReturn === 'paid' && (
            <p className="text-sm text-emerald-700 text-start" data-testid="reward-shop-return-paid">{t('wallet.rewardShop.returnPaid')}</p>
          )}
          {shippingReturn === 'cancelled' && (
            <p className="text-sm text-muted-foreground text-start">{t('wallet.rewardShop.returnCancelled')}</p>
          )}
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <p className="text-muted-foreground text-start" data-testid="reward-shop-empty">{t('wallet.rewardShop.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} locale={locale} money={money} onOpen={() => setOpen(item)} />
          ))}
        </div>
      )}

      <Orders shop={data} locale={locale} />

      {open && (
        <RedeemDialog item={open} shop={data} currency={currency} locale={locale} money={money} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}
