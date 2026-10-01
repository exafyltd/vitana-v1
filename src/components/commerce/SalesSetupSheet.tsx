/**
 * VTID-04795 — sales setup belongs to the business, not to each product.
 *
 *   How should Vitanaland handle purchases?
 *     • Send customers to my website   (what exists today — `supplier_referral`)
 *     • Sell directly on Vitanaland     (Coming soon: no supplier payouts yet)
 *   Where do you sell? + one typical delivery time, per-region times only on
 *   request ("Set different delivery times by region").
 *   Advanced sales settings — affiliate network (default "None / not yet")
 *   and the advertiser ID, collapsed because most suppliers have neither.
 *
 * Saved through the existing PUT /partner-onboarding/:orgId/catalogue/merchant.
 * Only what the supplier changed is sent (see `salesPayload`), so opening and
 * saving this sheet can never reset an existing Awin/Admitad setup.
 * Delivery times are not asked of a travel/experience business, whose offers
 * are places, not parcels.
 */
import { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';
import { isValidWebsite, normalizeWebsite } from '@/lib/commerce-register';
import {
  DELIVERY_REGIONS,
  EMPTY_DELIVERY,
  deliveryFromSimple,
  salesDraftValid,
  salesPayload,
  verticalForOrgType,
  type AffiliateNetwork,
  type DeliveryKey,
} from '@/lib/commerce-sales';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t, notify, notifyError } from '@/lib/i18n-toast';

const fieldClass = 'h-12 text-base focus-visible:ring-amber-500';
/** Company names, not copy — the only two networks with a real conversion path. */
const NETWORK_NAMES = { awin: 'Awin', admitad: 'Admitad' } as const;
const REGION_CHOICES: ReadonlyArray<{ key: DeliveryKey | 'world'; labelKey: string }> = [
  { key: 'eu', labelKey: 'screens.commerceportal.productForm.deliveryEu' },
  { key: 'us', labelKey: 'screens.commerceportal.productForm.deliveryUs' },
  { key: 'mena', labelKey: 'screens.commerceportal.productForm.deliveryMena' },
  { key: 'world', labelKey: 'screens.commerceportal.salesSetup.worldwide' },
];

export function SalesSetupSheet({
  open,
  onOpenChange,
  org,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: MyOrgRow | null;
  onSaved: () => void;
}) {
  const [storefrontUrl, setStorefrontUrl] = useState('');
  const [regions, setRegions] = useState<Array<DeliveryKey | 'world'>>([]);
  const [typical, setTypical] = useState('');
  const [byRegion, setByRegion] = useState(false);
  const [overrides, setOverrides] = useState<Record<DeliveryKey, string>>(EMPTY_DELIVERY);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [network, setNetwork] = useState<AffiliateNetwork | null>(null);
  const [advertiserId, setAdvertiserId] = useState('');
  const [merchantVertical, setMerchantVertical] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const asksDelivery = org?.org_type !== 'travel_tourism';

  useEffect(() => {
    if (!open || !org) return;
    setStorefrontUrl('');
    setRegions([]);
    setTypical('');
    setByRegion(false);
    setOverrides(EMPTY_DELIVERY);
    setAdvancedOpen(false);
    setNetwork(null);
    setAdvertiserId('');
    // The shop record's own vertical, when one exists (the endpoint requires it).
    void adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`)
      .then((r) => setMerchantVertical(r?.merchant?.vertical_key ?? null))
      .catch(() => setMerchantVertical(null));
  }, [open, org]);

  if (!org) return null;

  const draft = {
    storefrontUrl: normalizeWebsite(storefrontUrl),
    network,
    advertiserId,
    delivery: asksDelivery ? deliveryFromSimple(regions, typical, byRegion ? overrides : null) : EMPTY_DELIVERY,
  };
  const typicalOk = typical.trim() === '' || /^\d{1,3}$/.test(typical.trim()) && Number(typical) <= 120;
  const canSave = salesDraftValid(draft) && isValidWebsite(storefrontUrl) && typicalOk && !saving;

  const toggleRegion = (key: DeliveryKey | 'world') =>
    setRegions((rs) => (rs.includes(key) ? rs.filter((r) => r !== key) : [...rs, key]));

  const save = async () => {
    setSaving(true);
    try {
      await adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue/merchant`, {
        method: 'PUT',
        body: JSON.stringify({
          vertical_key: merchantVertical ?? verticalForOrgType(org.org_type),
          ...salesPayload(draft),
        }),
      });
      notify('screens.commerceportal.salesSetup.saved');
      onOpenChange(false);
      onSaved();
    } catch {
      notifyError('screens.commerceportal.salesSetup.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const shownRegions = regions.includes('world') ? DELIVERY_REGIONS.map((r) => r.key) : (regions as DeliveryKey[]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile className="max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="text-2xl font-bold">{t('screens.commerceportal.salesSetup.title')}</ResponsiveDialogTitle>
          <p className="text-sm text-muted-foreground">{org.display_name}</p>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-6 md:mt-4">
          {/* HOW PURCHASES WORK */}
          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">{t('screens.commerceportal.salesSetup.purchasesTitle')}</h3>
            <div className="rounded-2xl border border-amber-500 bg-amber-500/10 p-3" aria-current="true">
              <p className="font-medium text-foreground">{t('screens.commerceportal.salesSetup.referral')}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('screens.commerceportal.salesSetup.referralHint')}</p>
            </div>
            <div className="rounded-2xl border border-border p-3 opacity-60" aria-disabled="true">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{t('screens.commerceportal.salesSetup.direct')}</p>
                <Badge variant="outline">{t('screens.commerceportal.productForm.salesModelSoon')}</Badge>
              </div>
            </div>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="ss-website">{t('screens.commerceportal.salesSetup.shopUrl')}</Label>
              <Input
                id="ss-website"
                type="url"
                inputMode="url"
                dir="ltr"
                value={storefrontUrl}
                onChange={(e) => setStorefrontUrl(e.target.value)}
                aria-invalid={!isValidWebsite(storefrontUrl)}
                className={fieldClass}
              />
              <p className="text-xs text-muted-foreground">{t('screens.commerceportal.salesSetup.keepHint')}</p>
            </div>
          </section>

          {/* DELIVERY — progressive: regions, one typical time, overrides on request */}
          {asksDelivery && (
            <section className="space-y-3">
              <h3 className="font-semibold text-foreground">{t('screens.commerceportal.salesSetup.whereTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                {REGION_CHOICES.map(({ key, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={regions.includes(key)}
                    onClick={() => toggleRegion(key)}
                    data-testid={`sales-region-${key}`}
                    className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                      regions.includes(key)
                        ? 'border-amber-500 bg-amber-500/10 text-foreground'
                        : 'border-border text-foreground hover:border-amber-500/50'
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              {regions.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ss-typical">{t('screens.commerceportal.salesSetup.typicalDelivery')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="ss-typical"
                        inputMode="numeric"
                        value={typical}
                        onChange={(e) => setTypical(e.target.value)}
                        aria-invalid={!typicalOk}
                        className={`${fieldClass} w-28`}
                      />
                      <span className="text-sm text-muted-foreground">{t('screens.commerceportal.salesSetup.businessDays')}</span>
                    </div>
                  </div>
                  <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-foreground">
                    {t('screens.commerceportal.salesSetup.byRegion')}
                    <Switch checked={byRegion} onCheckedChange={setByRegion} />
                  </label>
                  {byRegion && (
                    <div className="space-y-2">
                      {DELIVERY_REGIONS.filter((r) => shownRegions.includes(r.key)).map((r) => (
                        <div key={r.key} className="flex items-center justify-between gap-3">
                          <Label htmlFor={`ss-days-${r.key}`} className="text-sm">
                            {t(`screens.commerceportal.productForm.${r.labelKey}`)}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`ss-days-${r.key}`}
                              inputMode="numeric"
                              value={overrides[r.key]}
                              placeholder={typical}
                              onChange={(e) => setOverrides((o) => ({ ...o, [r.key]: e.target.value }))}
                              className={`${fieldClass} w-24`}
                            />
                            <span className="text-sm text-muted-foreground">{t('screens.commerceportal.productForm.deliveryDaysUnit')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ADVANCED — affiliate settlement; most suppliers never open this */}
          <section>
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              aria-expanded={advancedOpen}
              className="flex min-h-11 w-full items-center justify-between text-start font-semibold text-foreground"
            >
              {t('screens.commerceportal.salesSetup.advanced')}
              <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>
            {advancedOpen && (
              <div className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ss-network">{t('screens.commerceportal.productForm.network')}</Label>
                  <select
                    id="ss-network"
                    value={network ?? ''}
                    onChange={(e) => setNetwork((e.target.value || null) as AffiliateNetwork | null)}
                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <option value="">{t('screens.commerceportal.salesSetup.keepCurrent')}</option>
                    <option value="other">{t('screens.commerceportal.productForm.networkOther')}</option>
                    <option value="awin">{NETWORK_NAMES.awin}</option>
                    <option value="admitad">{NETWORK_NAMES.admitad}</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {network && network !== 'other'
                      ? t('screens.commerceportal.productForm.networkHint')
                      : t('screens.commerceportal.productForm.networkOtherHint')}
                  </p>
                </div>
                {network && network !== 'other' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ss-advertiser">{t('screens.commerceportal.productForm.advertiserId')}</Label>
                    <Input
                      id="ss-advertiser"
                      value={advertiserId}
                      onChange={(e) => setAdvertiserId(e.target.value)}
                      className={fieldClass}
                    />
                    <p className="text-xs text-muted-foreground">{t('screens.commerceportal.productForm.advertiserIdHint')}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
          <Button
            type="button"
            className="h-12 flex-1 text-base bg-amber-700 font-semibold text-white hover:bg-amber-800"
            disabled={!canSave}
            onClick={() => void save()}
            data-testid="sales-save"
          >
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('screens.commerceportal.salesSetup.save')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
