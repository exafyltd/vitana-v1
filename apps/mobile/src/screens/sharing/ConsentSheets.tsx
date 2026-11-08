/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the three sheets of the data-consent screen,
 * native twins of the web `GrantAccessDialog`, `PrivacySettingsDialog` (both only confirm with a toast;
 * the web stores nothing) and `CreatePackageDialog` (three steps: details, items, pricing; writes the
 * package and its items for the active tenant). Not ported: the package cover-image upload (needs the
 * storage upload, a separate lane step) and the service picker (the web leaves it empty in V1).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Switch, Text, TextInput, Textarea, notify, notifyError, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';
import { useTenant } from '../../identity/TenantProvider';
import { Chip, ChipRow, Field, SheetActions, SheetScroll, SwitchRow } from './components';
import { formatDay, formatNumber } from './format';
import { currentUserId } from './data/hooks';
import { fetchOwnEvents, useCreatePackage, type PackageItemInput } from './data/assets';

type SheetProps = { open: boolean; onClose: () => void };

// ── grant access ─────────────────────────────────────────────────────────
const LEVELS = [
  ['view', 'screens.sharing.viewOnly'],
  ['edit', 'screens.sharing.viewEdit'],
  ['manage', 'screens.sharing.fullManagement'],
] as const;
const SCOPES = [
  ['health', 'screens.sharing.healthRecords'],
  ['calendar', 'screens.sharing.calendarEvents'],
  ['messages', 'screens.sharing.messages'],
  ['documents', 'screens.sharing.documents'],
  ['all', 'screens.sharing.allData'],
] as const;

export function GrantAccessSheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('');
  const [scope, setScope] = useState('');
  const [expires, setExpires] = useState<Date | null>(null);
  useEffect(() => {
    if (open) {
      setEmail('');
      setLevel('');
      setScope('');
      setExpires(null);
    }
  }, [open]);
  if (!open) return null;
  const { DateTimeField } = getChatDevice();
  const submit = () => {
    if (!email.trim()) return;
    notify('toasts.sharing.accessGranted');
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.grantDataAccess')} testID="grant-sheet">
      <SheetScroll>
        <Text muted>{t('screens.sharing.allowEntityAccessSpecificDataWith')}</Text>
        <Field label={t('screens.sharing.entityEmailId')}>
          <TextInput value={email} onChangeText={setEmail} placeholder={t('screens.sharing.userExampleComOrgid123')} keyboardType="email-address" autoCapitalize="none" accessibilityLabel={t('screens.sharing.entityEmailId')} testID="grant-email" />
        </Field>
        <Field label={t('screens.sharing.permissionLevel')}>
          <ChipRow label={t('screens.sharing.selectPermissionLevel')}>
            {LEVELS.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={level === value} onPress={() => setLevel(value)} testID={`grant-level-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <Field label={t('screens.sharing.dataScope')}>
          <ChipRow label={t('screens.sharing.whatDataShare')}>
            {SCOPES.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={scope === value} onPress={() => setScope(value)} testID={`grant-scope-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <Field label={t('screens.sharing.expirationDateOptional')}>
          <DateTimeField value={expires} mode="date" onChange={setExpires} placeholder={t('screens.sharing.selectDate')} display={expires ? formatDay(expires, locale) : ''} minimumDate={new Date()} testID="grant-expiry" />
        </Field>
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} testID="grant-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button onPress={submit} testID="grant-submit">
          {t('screens.sharing.grantAccess')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

// ── privacy settings ─────────────────────────────────────────────────────
const RETENTION = [
  ['30days', 'screens.sharing.text30Days'],
  ['90days', 'screens.sharing.text90Days'],
  ['1year', 'screens.sharing.text1Year'],
  ['2years', 'screens.sharing.text2Years'],
  ['indefinite', 'screens.sharing.indefinite'],
] as const;
const CONSENT = [
  ['opt-in', 'screens.sharing.optinExplicitConsentRequired'],
  ['opt-out', 'screens.sharing.optoutConsentAssumed'],
  ['informed', 'screens.sharing.informedConsentOnly'],
] as const;

export function PrivacySheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t } = useI18n();
  const [retention, setRetention] = useState('90days');
  const [consent, setConsent] = useState('opt-in');
  const [thirdParty, setThirdParty] = useState(false);
  const [autoExport, setAutoExport] = useState(true);
  const [activityLog, setActivityLog] = useState(true);
  useEffect(() => {
    if (open) {
      setRetention('90days');
      setConsent('opt-in');
      setThirdParty(false);
      setAutoExport(true);
      setActivityLog(true);
    }
  }, [open]);
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.privacySettings')} testID="privacy-sheet">
      <SheetScroll>
        <Text muted>{t('screens.sharing.configureGlobalPrivacyControlsDataHandling')}</Text>
        <Field label={t('screens.sharing.dataRetentionPeriod')} hint={t('screens.sharing.howLongKeepDataBeforeAutomatic')}>
          <ChipRow>
            {RETENTION.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={retention === value} onPress={() => setRetention(value)} testID={`privacy-retention-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <Field label={t('screens.sharing.defaultConsentLevel')} hint={t('screens.sharing.defaultPermissionModelForNewAccess')}>
          <ChipRow>
            {CONSENT.map(([value, key]) => (
              <Chip key={value} role="radio" label={t(key)} selected={consent === value} onPress={() => setConsent(value)} testID={`privacy-consent-${value}`} />
            ))}
          </ChipRow>
        </Field>
        <SwitchRow
          title={t('screens.sharing.thirdpartyDataSharing')}
          description={t('screens.sharing.allowSharingDataWithExternalPartners')}
          control={<Switch checked={thirdParty} onCheckedChange={setThirdParty} accessibilityLabel={t('screens.sharing.thirdpartyDataSharing')} testID="privacy-third-party" />}
        />
        <SwitchRow
          title={t('screens.sharing.autoprocessExportRequests')}
          description={t('screens.sharing.automaticallyFulfillDataExportRequests')}
          control={<Switch checked={autoExport} onCheckedChange={setAutoExport} accessibilityLabel={t('screens.sharing.autoprocessExportRequests')} testID="privacy-auto-export" />}
        />
        <SwitchRow
          title={t('screens.sharing.accessActivityLogging')}
          description={t('screens.sharing.trackWhoAccessedYourDataWhen')}
          control={<Switch checked={activityLog} onCheckedChange={setActivityLog} accessibilityLabel={t('screens.sharing.accessActivityLogging')} testID="privacy-activity-log" />}
        />
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} testID="privacy-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button
          onPress={() => {
            notify('toasts.sharing.privacySettingsUpdated', 'toasts.sharing.yourGlobalPrivacyControlsHaveSaved');
            onClose();
          }}
          testID="privacy-save"
        >
          {t('screens.sharing.saveSettings')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

// ── create package ───────────────────────────────────────────────────────
interface DraftItem extends PackageItemInput {
  key: number;
}

const toCents = (value: string): number => Math.round((parseFloat(value) || 0) * 100);

export function CreatePackageSheet({ open, onClose }: SheetProps): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { activeTenantId } = useTenant();
  const create = useCreatePackage(activeTenantId);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [price, setPrice] = useState('');
  const [original, setOriginal] = useState('');
  const [validity, setValidity] = useState('180');
  const [publish, setPublish] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTitle('');
    setDescription('');
    setItems([]);
    setPrice('');
    setOriginal('');
    setValidity('180');
    setPublish(false);
    void (async () => {
      try {
        setEvents(await fetchOwnEvents(await currentUserId()));
      } catch {
        setEvents([]);
      }
    })();
  }, [open]);
  if (!open) return null;

  const update = (key: number, patch: Partial<PackageItemInput>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = () => setItems((list) => [...list, { key: Date.now() + list.length, item_type: 'service', item_title: '', item_duration_min: 60, item_value_cents: 0, quantity: 1 }]);
  const totalValue = items.reduce((sum, it) => sum + (it.item_value_cents || 0) * it.quantity, 0);
  const bundle = parseFloat(price) || 0;
  const originalValue = parseFloat(original) || 0;
  const savings = originalValue > 0 && bundle > 0 ? Math.round(((originalValue - bundle) / originalValue) * 100) : 0;
  const canNext = step === 1 ? title.trim().length > 0 : step === 2 ? items.some((i) => i.item_title) : bundle > 0;

  const submit = async () => {
    try {
      await create.mutateAsync({
        title,
        description: description || undefined,
        price_cents: toCents(price),
        original_price_cents: original ? toCents(original) : undefined,
        validity_days: parseInt(validity, 10) || 180,
        status: publish ? 'published' : 'draft',
        items: items.filter((i) => i.item_title).map(({ key: _key, ...item }) => ({ ...item, item_value_cents: item.item_value_cents || 0 })),
      });
      onClose();
    } catch {
      // The mutation already raised its error toast.
    }
  };
  const stepHint = step === 1 ? 'sharingNative.package.hintBasics' : step === 2 ? 'sharingNative.package.hintItems' : 'sharingNative.package.hintPricing';

  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.createPackage')} testID="package-sheet">
      <SheetScroll>
        <Text muted testID="package-step">
          {`${step}/3 · ${t(stepHint)}`}
        </Text>
        {step === 1 ? (
          <>
            <View style={[styles.note, { backgroundColor: colors.muted }]}>
              <Text weight="700">{t('sharingNative.package.bundleLabel')}</Text>
              <Text size="sm" muted>
                {t('sharingNative.package.bundleDescription')}
              </Text>
            </View>
            <Field label={t('screens.sharing.packageName')}>
              <TextInput value={title} onChangeText={setTitle} placeholder={t('screens.sharing.eG5sessionWellnessBundle')} accessibilityLabel={t('screens.sharing.packageName')} testID="package-title" />
            </Field>
            <Field label={t('screens.sharing.description')}>
              <Textarea value={description} onChangeText={setDescription} rows={3} placeholder={t('screens.sharing.describeWhatSIncludedTransformationClients')} accessibilityLabel={t('screens.sharing.description')} testID="package-description" />
            </Field>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <View style={styles.spread}>
              <Text weight="700">{t('screens.sharing.includedItems')}</Text>
              <Button size="sm" variant="outline" onPress={addItem} testID="package-add-item">
                {t('screens.sharing.addItem')}
              </Button>
            </View>
            {items.length === 0 ? (
              <View style={styles.note}>
                <Text muted>{t('screens.sharing.addSessionsEventsYourPackage')}</Text>
                <Button size="sm" onPress={addItem} testID="package-add-first">
                  {t('screens.sharing.addFirstItem')}
                </Button>
              </View>
            ) : (
              items.map((item, index) => (
                <View key={item.key} style={[styles.item, { borderColor: colors.border }]} testID={`package-item-${index}`}>
                  <ChipRow>
                    <Chip role="radio" label={t('sharingNative.package.itemService')} selected={item.item_type === 'service'} onPress={() => update(item.key, { item_type: 'service', event_id: undefined })} testID={`package-item-type-service-${index}`} />
                    <Chip role="radio" label={t('sharingNative.package.itemEvent')} selected={item.item_type === 'event'} onPress={() => update(item.key, { item_type: 'event' })} testID={`package-item-type-event-${index}`} />
                  </ChipRow>
                  {item.item_type === 'event' ? (
                    events.length === 0 ? (
                      <Text size="sm" muted>
                        {t('screens.sharing.noEventsFoundCreateEventFirst')}
                      </Text>
                    ) : (
                      <ChipRow label={t('screens.sharing.selectEvent')}>
                        {events.map((ev) => (
                          <Chip key={ev.id} role="radio" label={ev.title} selected={item.event_id === ev.id} onPress={() => update(item.key, { event_id: ev.id, item_title: ev.title })} testID={`package-event-${index}-${ev.id}`} />
                        ))}
                      </ChipRow>
                    )
                  ) : (
                    <>
                      <TextInput value={item.item_title} onChangeText={(v) => update(item.key, { item_title: v })} placeholder={t('screens.sharing.sessionNameEG60minCoaching')} accessibilityLabel={t('screens.sharing.sessionNameEG60minCoaching')} testID={`package-item-title-${index}`} />
                      <Field label={t('screens.sharing.durationMin')}>
                        <TextInput value={String(item.item_duration_min ?? '')} onChangeText={(v) => update(item.key, { item_duration_min: parseInt(v, 10) || 0 })} keyboardType="numeric" accessibilityLabel={t('screens.sharing.durationMin')} testID={`package-item-duration-${index}`} />
                      </Field>
                      <Field label={t('screens.sharing.value')}>
                        <TextInput value={item.item_value_cents ? String(item.item_value_cents / 100) : ''} onChangeText={(v) => update(item.key, { item_value_cents: toCents(v) })} keyboardType="decimal-pad" accessibilityLabel={t('screens.sharing.value')} testID={`package-item-value-${index}`} />
                      </Field>
                    </>
                  )}
                  <Field label={t('screens.sharing.quantity')}>
                    <TextInput value={String(item.quantity)} onChangeText={(v) => update(item.key, { quantity: Math.max(1, parseInt(v, 10) || 1) })} keyboardType="numeric" accessibilityLabel={t('screens.sharing.quantity')} testID={`package-item-quantity-${index}`} />
                  </Field>
                  <Button size="sm" variant="outline" onPress={() => setItems((list) => list.filter((it) => it.key !== item.key))} testID={`package-item-remove-${index}`}>
                    {t('buttons.remove')}
                  </Button>
                </View>
              ))
            )}
            {totalValue > 0 ? (
              <View style={styles.spread}>
                <Text muted>{t('screens.sharing.totalIndividualValue')}</Text>
                <Text weight="700">{`$${formatNumber(totalValue / 100, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</Text>
              </View>
            ) : null}
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Field label={t('screens.sharing.bundlePrice')}>
              <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel={t('screens.sharing.bundlePrice')} testID="package-price" />
            </Field>
            <Field label={t('screens.sharing.originalValue')}>
              <TextInput value={original} onChangeText={setOriginal} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel={t('screens.sharing.originalValue')} testID="package-original" />
            </Field>
            {savings > 0 ? (
              <Text weight="700" testID="package-savings">
                {t('screens.sharing.value0Savings', { value0: savings })}
              </Text>
            ) : null}
            <Field label={t('screens.sharing.validityPeriodDays')} hint={t('screens.sharing.howLongBuyerHasRedeemAll')}>
              <TextInput value={validity} onChangeText={setValidity} keyboardType="numeric" accessibilityLabel={t('screens.sharing.validityPeriodDays')} testID="package-validity" />
            </Field>
            <SwitchRow
              title={t('screens.sharing.publishImmediately')}
              description={t('screens.sharing.makeAvailableForPurchaseRightAway')}
              control={<Switch checked={publish} onCheckedChange={setPublish} accessibilityLabel={t('screens.sharing.publishImmediately')} testID="package-publish" />}
            />
            <View style={[styles.note, { backgroundColor: colors.muted }]}>
              <Text weight="700">{t('screens.sharing.packageSummary')}</Text>
              <View style={styles.spread}>
                <Text muted>{t('screens.sharing.items')}</Text>
                <Text>{items.filter((i) => i.item_title).length}</Text>
              </View>
            </View>
          </>
        ) : null}
      </SheetScroll>
      <SheetActions>
        {step === 1 ? (
          <Button variant="outline" onPress={onClose} testID="package-cancel">
            {t('screens.sharing.cancel')}
          </Button>
        ) : (
          <Button variant="outline" onPress={() => setStep((s) => s - 1)} testID="package-back">
            {t('screens.sharing.back')}
          </Button>
        )}
        {step < 3 ? (
          <Button onPress={() => setStep((s) => s + 1)} disabled={!canNext} testID="package-next">
            {t('screens.sharing.next')}
          </Button>
        ) : (
          <Button onPress={() => void submit()} disabled={!canNext || create.isPending} testID="package-submit">
            {t('screens.sharing.createPackage')}
          </Button>
        )}
      </SheetActions>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: 12, padding: 12, gap: 6 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
