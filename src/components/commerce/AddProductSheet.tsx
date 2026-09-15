/**
 * "Add a product by hand" (VTID-03894) — the manual path's front door.
 *
 * Two steps, and the first exists so the second can be short: choosing a
 * vertical decides which questions the supplier is ever shown. A wine grower
 * never sees "contains allergens"; a supplement maker never sees "vintage".
 */
import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API } from '@/lib/commerce-host';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useCommerceVerticals, type Vertical } from '@/hooks/useCommerceVerticals';
import { ProductForm } from './ProductForm';
import { t } from '@/lib/i18n-toast';

export function AddProductSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const { verticals, options, failed, reload } = useCommerceVerticals();
  const [picked, setPicked] = useState<Vertical | null>(null);
  // A supplier has ONE business. If they already created it we reuse its name
  // and never ask again; only a first-time supplier sees this field.
  const [businessName, setBusinessName] = useState('');
  const [knownMerchant, setKnownMerchant] = useState<{ name: string } | null | undefined>(undefined);
  // How this supplier's SALES get attributed. Only these two have a real
  // conversion path (awin is pulled, admitad is pushed); 'other' is honest
  // rather than absent — a supplier not on a network can still list, their
  // sales are just settled by agreement until one is connected.
  const [network, setNetwork] = useState<'awin' | 'admitad' | 'other'>('other');
  const [advertiserId, setAdvertiserId] = useState('');

  const loadMerchant = useCallback(async () => {
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/products`);
      const m = res.data?.merchant ?? null;
      setKnownMerchant(m);
      if (m?.name) setBusinessName(m.name);
    } catch {
      // Not fatal: a first-time supplier legitimately has no merchant yet, and
      // an unreachable gateway surfaces on save rather than blocking the form.
      setKnownMerchant(null);
    }
  }, []);

  useEffect(() => {
    if (open) void loadMerchant();
  }, [open, loadMerchant]);

  const close = () => {
    setPicked(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-xl"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="text-slate-100">
            {picked
              ? t('screens.commerceportal.productForm.titleFor', { vertical: picked.display_label })
              : t('screens.commerceportal.productForm.pickTitle')}
          </SheetTitle>
          {!picked && (
            <p className="text-sm text-slate-400">{t('screens.commerceportal.productForm.pickSubtitle')}</p>
          )}
        </SheetHeader>

        <div className="mt-4">
          {failed ? (
            // Without the vertical schema the form has no questions to ask, so
            // offer a retry rather than an empty form that silently discards
            // whatever the supplier types.
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
              <p className="text-sm text-slate-300">{t('screens.commerceportal.productForm.loadFailed')}</p>
              <Button
                variant="outline"
                onClick={() => void reload()}
                className="mt-3 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
              >
                <RefreshCw className="me-2 h-4 w-4" />
                {t('screens.commerceportal.productForm.retry')}
              </Button>
            </div>
          ) : verticals === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : picked ? (
            <ProductForm
              vertical={picked}
              options={options}
              userId={user?.id ?? ''}
              businessName={businessName}
              affiliateNetwork={network}
              affiliateAdvertiserId={advertiserId}
              onSaved={async () => {
                await onSaved();
                close();
              }}
              onCancel={() => setPicked(null)}
            />
          ) : (
            <div className="space-y-4">
              {knownMerchant === null && (
                <div className="space-y-1.5">
                  <Label htmlFor="pf-business" className="text-slate-300">
                    {t('screens.commerceportal.productForm.businessName')}
                  </Label>
                  <Input
                    id="pf-business"
                    className="border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    {t('screens.commerceportal.productForm.businessNameHint')}
                  </p>

                  {/* How this supplier sells. Direct sale is genuinely not
                      available yet — the buyer half exists (wallet checkout)
                      but nothing pays a supplier or tells them to ship — so it
                      is shown as unavailable rather than hidden or, worse,
                      offered. */}
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-slate-300">
                      {t('screens.commerceportal.productForm.salesModel')}
                    </Label>
                    <div className="grid gap-2">
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                        <p className="text-sm font-medium text-amber-200">
                          {t('screens.commerceportal.productForm.salesModelReferral')}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t('screens.commerceportal.productForm.salesModelReferralHint')}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 opacity-60">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-300">
                          {t('screens.commerceportal.productForm.salesModelDirect')}
                          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                            {t('screens.commerceportal.productForm.salesModelSoon')}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t('screens.commerceportal.productForm.salesModelDirectHint')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="pf-network" className="text-slate-300">
                      {t('screens.commerceportal.productForm.network')}
                    </Label>
                    <Select value={network} onValueChange={(v) => setNetwork(v as typeof network)}>
                      <SelectTrigger id="pf-network" className="border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awin">Awin</SelectItem>
                        <SelectItem value="admitad">Admitad</SelectItem>
                        <SelectItem value="other">
                          {t('screens.commerceportal.productForm.networkOther')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {network === 'other'
                        ? t('screens.commerceportal.productForm.networkOtherHint')
                        : t('screens.commerceportal.productForm.networkHint')}
                    </p>
                  </div>

                  {network !== 'other' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="pf-advertiser" className="text-slate-300">
                        {t('screens.commerceportal.productForm.advertiserId')}
                      </Label>
                      <Input
                        id="pf-advertiser"
                        dir="ltr"
                        className="border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500"
                        value={advertiserId}
                        onChange={(e) => setAdvertiserId(e.target.value)}
                      />
                      <p className="text-xs text-slate-500">
                        {t('screens.commerceportal.productForm.advertiserIdHint')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ul className="grid gap-2 sm:grid-cols-2">
              {verticals.map((v) => (
                <li key={v.key}>
                  <button
                    type="button"
                    disabled={
                      businessName.trim().length === 0 ||
                      (network !== 'other' && advertiserId.trim().length === 0)
                    }
                    onClick={() => setPicked(v)}
                    className="h-full w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-start transition-colors hover:border-amber-500/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <p className="font-medium text-slate-100">{v.display_label}</p>
                    {v.description && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{v.description}</p>
                    )}
                  </button>
                </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
