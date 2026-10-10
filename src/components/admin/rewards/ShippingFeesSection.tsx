/**
 * VTID-05036 — Admin › Rewards Shop › Versandkosten: one flat fee per country
 * and currency (EUR/USD). Add, edit and delete go through the gateway; the
 * warning lists every country of an active ship item that has no fee row in a
 * currency, because members there cannot order it.
 */
import { useId, useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifySuccess, t } from '@/lib/i18n-toast';
import { fmtDate, fmtNumber, fmtRegion } from '@/lib/locale-format';
import type { ShopCurrency } from '@/hooks/useRewardShop';
import {
  type AdminRewardItem,
  type AdminShippingFee,
  useDeleteAdminShippingFee,
  useSaveAdminShippingFee,
} from '@/hooks/useAdminRewardShop';
import { SHOP_CURRENCIES, missingShippingFees, parseFeeCents } from './shop-rules';
import { normaliseCountry } from './item-form';
import { ServerError } from './ServerError';

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

function money(cents: number, currency: string): string {
  return fmtNumber(cents / 100, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Draft {
  editing: boolean;
  country: string;
  currency: ShopCurrency;
  amount: string;
}

export function ShippingFeesSection({ fees, items }: { fees: AdminShippingFee[]; items: AdminRewardItem[] }) {
  const ids = useId();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<'country' | 'fee' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const save = useSaveAdminShippingFee();
  const remove = useDeleteAdminShippingFee();
  const missing = missingShippingFees(items, fees);

  const startAdd = () => { save.reset(); setDraftError(null); setDraft({ editing: false, country: '', currency: 'EUR', amount: '' }); };
  const startEdit = (f: AdminShippingFee) => {
    save.reset();
    setDraftError(null);
    setDraft({ editing: true, country: f.country, currency: f.currency, amount: (f.fee_cents / 100).toFixed(2) });
  };

  const submit = async () => {
    if (!draft) return;
    const country = normaliseCountry(draft.country);
    if (!country) { setDraftError('country'); return; }
    const cents = parseFeeCents(draft.amount);
    if (cents === null) { setDraftError('fee'); return; }
    setDraftError(null);
    try {
      await save.mutateAsync({ country, currency: draft.currency, fee_cents: cents });
      notifySuccess('admin.rewardsShop.fees.saved');
      setDraft(null);
    } catch {
      // shown below via save.error
    }
  };

  const doDelete = async (f: AdminShippingFee) => {
    try {
      await remove.mutateAsync({ country: f.country, currency: f.currency });
      notifySuccess('admin.rewardsShop.fees.deleted');
      setConfirmDelete(null);
    } catch {
      // shown below via remove.error
    }
  };

  return (
    <div className="space-y-4" data-testid="reward-admin-fees">
      {missing.length > 0 && (
        <div role="alert" data-testid="reward-admin-missing-fees" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-1 text-start">
            <p className="font-medium">{t('admin.rewardsShop.fees.missingTitle')}</p>
            <p>{t('admin.rewardsShop.fees.missingBody')}</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {missing.map((m) => (
                <li key={m.country} data-testid={`reward-admin-missing-fee-${m.country}`}>
                  {t('admin.rewardsShop.fees.missingEntry', { country: `${fmtRegion(m.country)} (${m.country})`, currencies: m.currencies.join(', ') })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin.rewardsShop.fees.help')}</p>
        <Button size="sm" onClick={startAdd} data-testid="reward-admin-fee-add">
          <Plus className="me-2 h-4 w-4" aria-hidden />
          {t('admin.rewardsShop.fees.add')}
        </Button>
      </div>

      {draft && (
        <Card data-testid="reward-admin-fee-form">
          <CardContent className="space-y-3 p-4">
            <p className="font-medium text-start">{draft.editing ? t('admin.rewardsShop.fees.formEdit') : t('admin.rewardsShop.fees.formNew')}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-country`}>{t('admin.rewardsShop.fees.country')}</Label>
                <Input
                  id={`${ids}-country`}
                  dir="ltr"
                  maxLength={2}
                  className="font-mono uppercase text-start"
                  disabled={draft.editing}
                  data-testid="reward-admin-fee-country"
                  value={draft.country}
                  onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-currency`}>{t('admin.rewardsShop.fees.currency')}</Label>
                <select
                  id={`${ids}-currency`}
                  className={SELECT_CLASS}
                  disabled={draft.editing}
                  data-testid="reward-admin-fee-currency"
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value as ShopCurrency })}
                >
                  {SHOP_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-amount`}>{t('admin.rewardsShop.fees.amount', { currency: draft.currency })}</Label>
                <Input
                  id={`${ids}-amount`}
                  inputMode="decimal"
                  dir="ltr"
                  className="text-start"
                  data-testid="reward-admin-fee-amount"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                />
              </div>
            </div>
            {draftError && (
              <p className="text-xs text-destructive text-start">
                {draftError === 'country' ? t('admin.rewardsShop.validation.country') : t('admin.rewardsShop.validation.fee')}
              </p>
            )}
            <ServerError error={save.error} testId="reward-admin-fee-error" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDraft(null)}>{t('admin.rewardsShop.form.cancel')}</Button>
              <Button size="sm" onClick={submit} disabled={save.isPending} data-testid="reward-admin-fee-save">
                {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
                {t('admin.rewardsShop.form.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ServerError error={remove.error} testId="reward-admin-fee-delete-error" />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-start font-medium">{t('admin.rewardsShop.fees.country')}</th>
                <th className="p-3 text-start font-medium">{t('admin.rewardsShop.fees.currency')}</th>
                <th className="p-3 text-end font-medium">{t('admin.rewardsShop.fees.fee')}</th>
                <th className="hidden p-3 text-start font-medium md:table-cell">{t('admin.rewardsShop.fees.updated')}</th>
                <th className="p-3"><span className="sr-only">{t('admin.rewardsShop.fees.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground" data-testid="reward-admin-fees-empty">
                    {t('admin.rewardsShop.fees.empty')}
                  </td>
                </tr>
              ) : fees.map((f) => {
                const key = `${f.country}-${f.currency}`;
                return (
                  <tr key={key} className="border-b last:border-b-0" data-testid={`reward-admin-fee-${key}`}>
                    <td className="p-3">
                      <span className="font-mono">{f.country}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline"> · {fmtRegion(f.country)}</span>
                    </td>
                    <td className="p-3">{f.currency}</td>
                    <td className="p-3 text-end tabular-nums">{money(f.fee_cents, f.currency)}</td>
                    <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">{f.updated_at ? fmtDate(f.updated_at) : ''}</td>
                    <td className="p-2">
                      {confirmDelete === key ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => doDelete(f)} data-testid={`reward-admin-fee-confirm-${key}`}>
                            {t('admin.rewardsShop.fees.confirmDelete')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>{t('admin.rewardsShop.form.cancel')}</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={t('admin.rewardsShop.fees.edit')} onClick={() => startEdit(f)} data-testid={`reward-admin-fee-edit-${key}`}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={t('admin.rewardsShop.fees.delete')} onClick={() => { remove.reset(); setConfirmDelete(key); }} data-testid={`reward-admin-fee-delete-${key}`}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
