/**
 * VTID-05036 — Admin › Rewards Shop › Bestellungen: orders with a status
 * filter. The admin can move an order only along the transitions the gateway
 * accepts (fulfilling / shipped / delivered); cancelled and refunded orders
 * come from the gateway's own expiry/refund paths and are read-only.
 */
import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifySuccess, t, useI18nLocale } from '@/lib/i18n-toast';
import { fmtDateTime, fmtNumber, fmtRegion } from '@/lib/locale-format';
import { itemText } from '@/hooks/useRewardShop';
import {
  type AdminOrderStatus,
  type AdminRewardItem,
  type AdminRewardOrder,
  useAdminRewardOrders,
  useSetAdminRewardOrderStatus,
} from '@/hooks/useAdminRewardShop';
import { ORDER_FILTER_STATUSES, nextOrderStatuses } from './shop-rules';
import { ServerError } from './ServerError';

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function OrderStatusChange({ order }: { order: AdminRewardOrder }) {
  const ids = useId();
  const options = nextOrderStatuses(order.status);
  const [next, setNext] = useState<AdminOrderStatus | ''>('');
  const [reason, setReason] = useState('');
  const mutation = useSetAdminRewardOrderStatus();

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground text-start" data-testid={`reward-admin-order-readonly-${order.id}`}>{t('admin.rewardsShop.orders.readOnly')}</p>;
  }

  const apply = async () => {
    if (!next) return;
    try {
      await mutation.mutateAsync({ id: order.id, status: next, reason });
      notifySuccess('admin.rewardsShop.orders.statusUpdated');
      setNext('');
      setReason('');
    } catch {
      // shown below via mutation.error
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor={`${ids}-status`} className="text-xs">{t('admin.rewardsShop.orders.newStatus')}</Label>
          <select
            id={`${ids}-status`}
            className={SELECT_CLASS}
            value={next}
            data-testid={`reward-admin-order-status-${order.id}`}
            onChange={(e) => setNext(e.target.value as AdminOrderStatus | '')}
          >
            <option value="">{t('admin.rewardsShop.orders.chooseStatus')}</option>
            {options.map((s) => <option key={s} value={s}>{t(`admin.rewardsShop.orders.status.${s}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${ids}-reason`} className="text-xs">{t('admin.rewardsShop.orders.reasonLabel')}</Label>
          <Input
            id={`${ids}-reason`}
            maxLength={500}
            value={reason}
            data-testid={`reward-admin-order-reason-${order.id}`}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-10" disabled={!next || mutation.isPending} onClick={apply} data-testid={`reward-admin-order-apply-${order.id}`}>
          {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
          {t('admin.rewardsShop.orders.apply')}
        </Button>
      </div>
      <ServerError error={mutation.error} />
    </div>
  );
}

function Address({ order }: { order: AdminRewardOrder }) {
  const a = order.shipping_address;
  if (!a) return <p className="text-sm text-muted-foreground">{t('admin.rewardsShop.orders.noAddress')}</p>;
  const lines = [a.name, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(' '), a.region, order.country ? fmtRegion(order.country) : null]
    .filter((x): x is string => !!x && !!x.trim());
  return (
    <address className="text-sm not-italic leading-snug" data-testid={`reward-admin-order-address-${order.id}`}>
      {lines.map((l, i) => <span key={i} className="block break-words">{l}</span>)}
    </address>
  );
}

export function RewardOrdersSection({ items }: { items: AdminRewardItem[] }) {
  const ids = useId();
  const locale = useI18nLocale();
  const [status, setStatus] = useState<string>('');
  const orders = useAdminRewardOrders(status || null);
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-4" data-testid="reward-admin-orders">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1 sm:w-64">
          <Label htmlFor={`${ids}-filter`}>{t('admin.rewardsShop.orders.filterLabel')}</Label>
          <select
            id={`${ids}-filter`}
            className={SELECT_CLASS}
            value={status}
            data-testid="reward-admin-orders-filter"
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{t('admin.rewardsShop.orders.all')}</option>
            {ORDER_FILTER_STATUSES.map((s) => <option key={s} value={s}>{t(`admin.rewardsShop.orders.status.${s}`)}</option>)}
          </select>
        </div>
      </div>

      {orders.isLoading ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('admin.rewardsShop.loading')}
        </div>
      ) : orders.error ? (
        <ServerError error={orders.error} testId="reward-admin-orders-error" />
      ) : (orders.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground" data-testid="reward-admin-orders-empty">
            {t('admin.rewardsShop.orders.empty')}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {(orders.data ?? []).map((o) => {
            const item = byId.get(o.item_id);
            const title = item ? itemText(item.titles, locale, item.slug) : t('admin.rewardsShop.orders.unknownItem');
            return (
              <li key={o.id}>
                <Card data-testid={`reward-admin-order-${o.id}`}>
                  <CardContent className="space-y-3 p-4 text-start">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('admin.rewardsShop.orders.vtna', { amount: fmtNumber(o.vtna_amount) })}
                          {' · '}
                          {t(`admin.rewardsShop.fulfilment.${o.fulfilment}`)}
                        </p>
                      </div>
                      <Badge variant="outline" data-testid={`reward-admin-order-badge-${o.id}`}>{t(`admin.rewardsShop.orders.status.${o.status}`)}</Badge>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">{t('admin.rewardsShop.orders.member')}</dt>
                        <dd className="truncate font-mono text-xs" dir="ltr" title={o.user_id}>{o.user_id.slice(0, 8)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">{t('admin.rewardsShop.orders.dates')}</dt>
                        <dd className="space-y-0.5 text-xs">
                          <span className="block">{t('admin.rewardsShop.orders.created', { date: fmtDateTime(o.created_at, { dateStyle: 'medium', timeStyle: 'short' }) })}</span>
                          {o.paid_at && <span className="block">{t('admin.rewardsShop.orders.paid', { date: fmtDateTime(o.paid_at, { dateStyle: 'medium', timeStyle: 'short' }) })}</span>}
                          {o.updated_at && <span className="block">{t('admin.rewardsShop.orders.updated', { date: fmtDateTime(o.updated_at, { dateStyle: 'medium', timeStyle: 'short' }) })}</span>}
                        </dd>
                      </div>
                      {o.fulfilment === 'ship' && (
                        <>
                          <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{t('admin.rewardsShop.orders.address')}</dt>
                            <dd><Address order={o} /></dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{t('admin.rewardsShop.orders.fee')}</dt>
                            <dd className="tabular-nums" data-testid={`reward-admin-order-fee-${o.id}`}>
                              {o.shipping_fee_cents != null && o.shipping_currency
                                ? fmtNumber(o.shipping_fee_cents / 100, { style: 'currency', currency: o.shipping_currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : t('admin.rewardsShop.orders.noFee')}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>

                    {o.status_reason && (
                      <p className="break-words text-xs text-muted-foreground">{t('admin.rewardsShop.orders.reason', { reason: o.status_reason })}</p>
                    )}

                    <OrderStatusChange order={o} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
