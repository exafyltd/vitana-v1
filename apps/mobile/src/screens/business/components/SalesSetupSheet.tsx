/**
 * VTID-05524 — native twin of src/components/commerce/SalesSetupSheet.tsx
 * (sales setup belongs to the business: how purchases work, where you sell +
 * one typical delivery time with per-region overrides only on request, the
 * collapsed affiliate settings). Saved through `PUT
 * /partner-onboarding/:orgId/catalogue/merchant` with only what the supplier
 * changed (`salesPayload`, `@vitana/core`); no delivery questions for a
 * travel/experience business.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Text, notify, notifyError, useUITheme } from '../../../ports/ui';
import {
  Input,
  Label,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Switch,
  withAlpha,
} from '../../../ports/business-ui';
import {
  DELIVERY_REGIONS,
  EMPTY_DELIVERY,
  PARTNER_ONBOARDING_API,
  deliveryFromSimple,
  isValidWebsite,
  normalizeWebsite,
  salesDraftValid,
  salesPayload,
  verticalForOrgType,
  type AffiliateNetwork,
  type DeliveryKey,
  type MyOrgRow,
} from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { Chip, Disclosure, Field, SelectField } from './parts';

/** Company names, not copy. */
const NETWORK_NAMES = { awin: 'Awin', admitad: 'Admitad' } as const;
const REGION_CHOICES: ReadonlyArray<{ key: DeliveryKey | 'world'; labelKey: string }> = [
  { key: 'eu', labelKey: 'screens.commerceportal.productForm.deliveryEu' },
  { key: 'us', labelKey: 'screens.commerceportal.productForm.deliveryUs' },
  { key: 'mena', labelKey: 'screens.commerceportal.productForm.deliveryMena' },
  { key: 'world', labelKey: 'screens.commerceportal.salesSetup.worldwide' },
];
/** The web select's empty value ("keep current") as a Select value. */
const KEEP = '__keep__';

export function SalesSetupSheet({ open, onOpenChange, org, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; org: MyOrgRow | null; onSaved: () => void }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
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
    void commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`)
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
  const typicalOk = typical.trim() === '' || (/^\d{1,3}$/.test(typical.trim()) && Number(typical) <= 120);
  const canSave = salesDraftValid(draft) && isValidWebsite(storefrontUrl) && typicalOk && !saving;
  const toggleRegion = (key: DeliveryKey | 'world') => setRegions((rs) => (rs.includes(key) ? rs.filter((r) => r !== key) : [...rs, key]));

  const save = async () => {
    setSaving(true);
    try {
      await commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue/merchant`, {
        method: 'PUT',
        body: JSON.stringify({ vertical_key: merchantVertical ?? verticalForOrgType(org.org_type), ...salesPayload(draft) }),
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
      <ResponsiveDialogContent fullscreenOnMobile testID="sales-setup">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Text size="2xl" weight="700">
              {t('screens.commerceportal.salesSetup.title')}
            </Text>
          </ResponsiveDialogTitle>
          <Text size="sm" muted>
            {org.display_name}
          </Text>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <View style={styles.stack}>
            <View style={styles.gap}>
              <Text weight="600">{t('screens.commerceportal.salesSetup.purchasesTitle')}</Text>
              <View style={[styles.option, { borderColor: withAlpha(colors.primary, 0.5), backgroundColor: withAlpha(colors.primary, 0.1) }]} accessibilityState={{ selected: true }}>
                <Text weight="500">{t('screens.commerceportal.salesSetup.referral')}</Text>
                <Text size="sm" muted>
                  {t('screens.commerceportal.salesSetup.referralHint')}
                </Text>
              </View>
              <View style={[styles.option, styles.dim, { borderColor: colors.border }]} accessibilityState={{ disabled: true }}>
                <View style={styles.between}>
                  <Text weight="500">{t('screens.commerceportal.salesSetup.direct')}</Text>
                  <Badge variant="outline">{t('screens.commerceportal.productForm.salesModelSoon')}</Badge>
                </View>
              </View>
              <Field label={t('screens.commerceportal.salesSetup.shopUrl')} hint={t('screens.commerceportal.salesSetup.keepHint')}>
                <Input type="url" value={storefrontUrl} onChangeText={setStorefrontUrl} autoCapitalize="none" autoCorrect={false} aria-invalid={!isValidWebsite(storefrontUrl)} testID="sales-website" accessibilityLabel={t('screens.commerceportal.salesSetup.shopUrl')} />
              </Field>
            </View>

            {asksDelivery ? (
              <View style={styles.gap} testID="sales-delivery">
                <Text weight="600">{t('screens.commerceportal.salesSetup.whereTitle')}</Text>
                <View style={styles.chips}>
                  {REGION_CHOICES.map(({ key, labelKey }) => (
                    <Chip key={key} label={t(labelKey)} on={regions.includes(key)} onPress={() => toggleRegion(key)} testID={`sales-region-${key}`} />
                  ))}
                </View>
                {regions.length > 0 ? (
                  <>
                    <Field label={t('screens.commerceportal.salesSetup.typicalDelivery')}>
                      <View style={styles.inline}>
                        <Input keyboardType="number-pad" value={typical} onChangeText={setTypical} aria-invalid={!typicalOk} style={styles.short} testID="sales-typical" accessibilityLabel={t('screens.commerceportal.salesSetup.typicalDelivery')} />
                        <Text size="sm" muted>
                          {t('screens.commerceportal.salesSetup.businessDays')}
                        </Text>
                      </View>
                    </Field>
                    <View style={styles.between}>
                      <Text size="sm" style={styles.fill}>
                        {t('screens.commerceportal.salesSetup.byRegion')}
                      </Text>
                      <Switch checked={byRegion} onCheckedChange={setByRegion} accessibilityLabel={t('screens.commerceportal.salesSetup.byRegion')} testID="sales-by-region" />
                    </View>
                    {byRegion
                      ? DELIVERY_REGIONS.filter((r) => shownRegions.includes(r.key)).map((r) => (
                          <View key={r.key} style={styles.between}>
                            <Label>{t(`screens.commerceportal.productForm.${r.labelKey}`)}</Label>
                            <View style={styles.inline}>
                              <Input
                                keyboardType="number-pad"
                                value={overrides[r.key]}
                                placeholder={typical}
                                onChangeText={(v: string) => setOverrides((o) => ({ ...o, [r.key]: v }))}
                                style={styles.short}
                                testID={`sales-days-${r.key}`}
                                accessibilityLabel={t(`screens.commerceportal.productForm.${r.labelKey}`)}
                              />
                              <Text size="sm" muted>
                                {t('screens.commerceportal.productForm.deliveryDaysUnit')}
                              </Text>
                            </View>
                          </View>
                        ))
                      : null}
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={styles.gap}>
              <Disclosure label={t('screens.commerceportal.salesSetup.advanced')} open={advancedOpen} onToggle={() => setAdvancedOpen((o) => !o)} testID="sales-advanced" />
              {advancedOpen ? (
                <View style={styles.gap}>
                  <Field
                    label={t('screens.commerceportal.productForm.network')}
                    hint={network && network !== 'other' ? t('screens.commerceportal.productForm.networkHint') : t('screens.commerceportal.productForm.networkOtherHint')}
                  >
                    <SelectField
                      value={network ?? KEEP}
                      onChange={(v) => setNetwork(v === KEEP ? null : (v as AffiliateNetwork))}
                      options={[
                        { value: KEEP, label: t('screens.commerceportal.salesSetup.keepCurrent') },
                        { value: 'other', label: t('screens.commerceportal.productForm.networkOther') },
                        { value: 'awin', label: NETWORK_NAMES.awin },
                        { value: 'admitad', label: NETWORK_NAMES.admitad },
                      ]}
                      accessibilityLabel={t('screens.commerceportal.productForm.network')}
                      testID="sales-network"
                    />
                  </Field>
                  {network && network !== 'other' ? (
                    <Field label={t('screens.commerceportal.productForm.advertiserId')} hint={t('screens.commerceportal.productForm.advertiserIdHint')}>
                      <Input value={advertiserId} onChangeText={setAdvertiserId} testID="sales-advertiser" accessibilityLabel={t('screens.commerceportal.productForm.advertiserId')} />
                    </Field>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button onPress={() => void save()} disabled={!canSave} testID="sales-save" style={styles.primary}>
            {t('screens.commerceportal.salesSetup.save')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 24 },
  gap: { gap: 8 },
  option: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 2 },
  dim: { opacity: 0.6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  short: { width: 96 },
  fill: { flex: 1, minWidth: 0 },
  primary: { flex: 1, minHeight: 48 },
});
