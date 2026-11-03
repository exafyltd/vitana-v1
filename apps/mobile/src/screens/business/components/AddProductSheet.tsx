/**
 * VTID-05524 — native twin of src/components/commerce/AddProductSheet.tsx:
 * 1. what would you like to add? Product · Service · Experience (+ "Many at
 * once? Import a file"), 2. a product picks its vertical, a service or
 * experience goes straight to the form under `services`, 3. the product form,
 * saved to the registered business. Without a business: "register first".
 * The web's full-width side sheet is the kit's `Sheet` from the end edge.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, useUITheme } from '../../../ports/ui';
import { BizIcon, Sheet, SheetContent, SheetHeader, SheetTitle, type BizGlyph } from '../../../ports/business-ui';
import type { MyOrgRow, Vertical } from '../../../ports/commerce';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { useCommerceVerticals } from '../data/hooks';
import { OrgSelect } from './BusinessContext';
import { CenterSpinner, ChoiceRow, Panel } from './parts';
import { ProductForm, type OfferKind } from './ProductForm';

const SERVICE_VERTICAL = 'services';

const KINDS: ReadonlyArray<{ kind: OfferKind; title: string; body: string; icon: BizGlyph }> = [
  { kind: 'product', title: 'screens.commerceportal.addOffer.product', body: 'screens.commerceportal.addOffer.productHint', icon: 'Package' },
  { kind: 'service', title: 'screens.commerceportal.addOffer.service', body: 'screens.commerceportal.addOffer.serviceHint', icon: 'Briefcase' },
  { kind: 'experience', title: 'screens.commerceportal.addOffer.experience', body: 'screens.commerceportal.addOffer.experienceHint', icon: 'MapPin' },
];

export function AddProductSheet({
  open,
  onOpenChange,
  onSaved,
  orgs = [],
  activeOrgId = null,
  onSelectOrg,
  onImportFile,
  onRegister,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  orgs?: MyOrgRow[];
  activeOrgId?: string | null;
  onSelectOrg?: (id: string) => void;
  onImportFile?: () => void;
  onRegister?: () => void;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const { verticals, options, failed, reload } = useCommerceVerticals();
  const [kind, setKind] = useState<OfferKind | null>(null);
  const [picked, setPicked] = useState<Vertical | null>(null);
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;

  useEffect(() => {
    if (!open) {
      setKind(null);
      setPicked(null);
    }
  }, [open]);

  const close = () => onOpenChange(false);
  const vertical = kind && kind !== 'product' ? (verticals?.find((v) => v.key === SERVICE_VERTICAL) ?? null) : picked;
  const back = () => {
    if (picked && kind === 'product') setPicked(null);
    else {
      setPicked(null);
      setKind(null);
    }
  };
  const title = vertical
    ? t(`screens.commerceportal.addOffer.titleFor_${kind}`, { vertical: vertical.display_label })
    : kind === 'product'
      ? t('screens.commerceportal.productForm.pickTitle')
      : t('screens.commerceportal.addOffer.title');

  return (
    <Sheet open={open} onOpenChange={(o: boolean) => (o ? onOpenChange(true) : close())}>
      <SheetContent side="end" style={styles.sheet} testID="add-product">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SheetHeader>
            {kind ? (
              <PressableRow onPress={back} accessibilityLabel={t('screens.commerceportal.orgOnboarding.wizardBack')} testID="add-back" style={styles.back}>
                <BizIcon name="ChevronLeft" size={16} color={colors.mutedForeground} flip />
                <Text size="sm" muted>
                  {t('screens.commerceportal.orgOnboarding.wizardBack')}
                </Text>
              </PressableRow>
            ) : null}
            <SheetTitle>
              <Text size="2xl" weight="700" testID="add-title">
                {title}
              </Text>
            </SheetTitle>
            {org && orgs.length > 1 && onSelectOrg ? (
              <OrgSelect label={t('screens.commerceportal.addOffer.addingTo')} org={org} orgs={orgs} onSelectOrg={onSelectOrg} testID="add-adding-to" />
            ) : org ? (
              <Text size="sm" muted>
                {t('screens.commerceportal.addOffer.addingToName', { name: org.display_name })}
              </Text>
            ) : null}
          </SheetHeader>

          <View style={styles.body}>
            {!org ? (
              <Panel style={styles.center} testID="add-register-first">
                <Text size="sm" style={styles.centerText}>
                  {t('screens.commerceportal.addOffer.registerFirst')}
                </Text>
                <Button
                  onPress={() => {
                    close();
                    onRegister?.();
                  }}
                  testID="add-register"
                >
                  {t('screens.commerceportal.orgOnboarding.registerCta')}
                </Button>
              </Panel>
            ) : !kind ? (
              <View style={styles.list}>
                {KINDS.map(({ kind: k, title: kt, body, icon }) => (
                  <ChoiceRow key={k} icon={icon} title={t(kt)} hint={t(body)} onPress={() => {
                    setKind(k);
                    setPicked(null);
                  }} testID={`add-kind-${k}`} />
                ))}
                {onImportFile ? (
                  <Button
                    variant="link"
                    onPress={() => {
                      close();
                      onImportFile();
                    }}
                    testID="add-import-file"
                  >
                    <BizIcon name="FileUp" size={16} color={colors.primary} />
                    {t('screens.commerceportal.addOffer.importFile')}
                  </Button>
                ) : null}
              </View>
            ) : failed ? (
              <Panel style={styles.center} testID="add-verticals-failed">
                <Text size="sm" style={styles.centerText}>
                  {t('screens.commerceportal.productForm.loadFailed')}
                </Text>
                <Button variant="outline" onPress={() => void reload()} testID="add-verticals-retry">
                  <BizIcon name="RefreshCw" size={16} />
                  {t('screens.commerceportal.productForm.retry')}
                </Button>
              </Panel>
            ) : verticals === null ? (
              <CenterSpinner testID="add-verticals-loading" />
            ) : vertical ? (
              <ProductForm
                vertical={vertical}
                kind={kind}
                options={options}
                userId={user?.id ?? ''}
                org={org}
                onSaved={async () => {
                  await onSaved();
                  close();
                }}
                onCancel={back}
              />
            ) : (
              <View style={styles.list}>
                {verticals
                  .filter((v) => v.key !== SERVICE_VERTICAL)
                  .map((v) => (
                    <ChoiceRow key={v.key} title={v.display_label} hint={v.description} onPress={() => setPicked(v)} testID={`add-vertical-${v.key}`} />
                  ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { width: '100%' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  back: { minHeight: 44, gap: 4 },
  body: { gap: 12 },
  list: { gap: 8 },
  center: { alignItems: 'center', padding: 24 },
  centerText: { textAlign: 'center' },
});
