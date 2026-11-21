/**
 * VTID-05524 — native twins of src/components/commerce/ProductForm.tsx (the
 * manual product form: a small universal core that gates saving, then the
 * vertical's own optional questions, the listing-strength meter, saved to the
 * registered business), VerticalFieldInput.tsx (one question by data type),
 * ListingStrength.tsx (`computeStrength` from `@vitana/core`) and
 * ProductImageField.tsx (photo upload to the public `media-uploads` bucket
 * under `commerce-products/<user>/<ms>.<ext>`, HEIC refused, 8 MB limit).
 *
 * Same request as the web: `addOrgProduct` (`POST
 * /partner-onboarding/:orgId/catalogue/products`, the shop record created on
 * first use) with the same body and the business's vertical
 * (`verticalForOrgType`).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, notify, notifyError, useUITheme } from '../../../ports/ui';
import { BizIcon, Input, Label, Progress, Switch, Textarea, pickProductPhoto } from '../../../ports/business-ui';
import {
  addOrgProduct,
  computeStrength,
  verticalForOrgType,
  type AttributeValue,
  type MyOrgRow,
  type Vertical,
  type VerticalField,
  type VocabularyOptions,
} from '../../../ports/commerce';
import { getSupabase } from '../../../auth/client';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { Chip, Field, SelectField } from './parts';

export type OfferKind = 'product' | 'service' | 'experience';

const CURRENCIES = ['EUR', 'CHF', 'GBP', 'USD'] as const;
/** The web's format examples (data, the same in every language). */
const URL_PLACEHOLDER = 'https://';
const ORIGIN_PLACEHOLDER = 'DE';
const SHIPS_TO_PLACEHOLDER = 'DE, AT, CH';
const BUCKET = 'media-uploads';
const PREFIX = 'commerce-products';
const MAX_BYTES = 8 * 1024 * 1024;

type CoreState = { title: string; description: string; price: string; currency: string; affiliate_url: string; origin_country: string; ships_to: string };
const EMPTY_CORE: CoreState = { title: '', description: '', price: '', currency: 'EUR', affiliate_url: '', origin_country: '', ships_to: '' };

const parseCountries = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function ProductImageField({ images, onChange, userId }: { images: string[]; onChange: (next: string[]) => void; userId: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await pickProductPhoto();
    if (r.status === 'denied') {
      notifyError('businessNative.photoAccessDenied');
      return;
    }
    if (r.status !== 'picked') return;
    const file = r.photo;
    if (/hei[cf]$/i.test(file.fileName) || /image\/hei[cf]/i.test(file.mimeType)) {
      notifyError('screens.commerceportal.productForm.imageHeic');
      return;
    }
    if (!file.mimeType.startsWith('image/')) {
      notifyError('screens.commerceportal.productForm.imageNotAnImage');
      return;
    }
    const bytes = base64ToBytes(file.base64);
    if ((file.fileSize ?? bytes.length) > MAX_BYTES) {
      notifyError('screens.commerceportal.productForm.imageTooLarge');
      return;
    }
    setBusy(true);
    try {
      const ext = (file.fileName.split('.').pop() || 'jpg').toLowerCase();
      const path = `${PREFIX}/${userId}/${Date.now()}.${ext}`;
      const bucket = getSupabase().storage.from(BUCKET);
      const { error } = await bucket.upload(path, bytes, { upsert: true, contentType: file.mimeType });
      if (error) throw error;
      onChange([...images, bucket.getPublicUrl(path).data.publicUrl]);
    } catch {
      notifyError('screens.commerceportal.productForm.imageFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.images} testID="product-images">
      {images.map((url) => (
        <View key={url} style={styles.thumbWrap}>
          <Image source={{ uri: url }} style={[styles.thumb, { borderColor: colors.border }]} accessibilityIgnoresInvertColors />
          <PressableRow
            onPress={() => onChange(images.filter((u) => u !== url))}
            accessibilityLabel={t('screens.commerceportal.productForm.imageRemove')}
            testID="product-image-remove"
            style={[styles.remove, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <BizIcon name="X" size={14} color={colors.mutedForeground} />
          </PressableRow>
        </View>
      ))}
      <PressableRow onPress={() => void pick()} disabled={busy} accessibilityLabel={t('screens.commerceportal.productForm.imageAdd')} testID="product-image-add" style={[styles.add, { borderColor: colors.border }]}>
        <View style={styles.addInner}>
          <BizIcon name={busy ? 'Upload' : 'ImagePlus'} size={20} color={colors.mutedForeground} />
          <Text size="xs" muted>
            {t('screens.commerceportal.productForm.imageAdd')}
          </Text>
        </View>
      </PressableRow>
    </View>
  );
}

export function VerticalFieldInput({ field, value, options, onChange }: { field: VerticalField; value: AttributeValue; options: VocabularyOptions; onChange: (next: AttributeValue) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const choices = field.vocabulary ? (options[field.vocabulary] ?? []) : [];
  const label = (
    <Label>
      {field.display_label}
      {field.unit ? (
        <Text size="xs" muted>
          {` (${field.unit})`}
        </Text>
      ) : null}
    </Label>
  );
  const help = field.help_text ? (
    <Text size="xs" muted>
      {field.help_text}
    </Text>
  ) : null;
  const testID = `vf-${field.field_key}`;

  if (field.data_type === 'boolean') {
    return (
      <View style={[styles.boolRow, { borderColor: colors.border }]}>
        <View style={styles.fill}>
          {label}
          {help}
        </View>
        <Switch checked={value === true} onCheckedChange={(v: boolean) => onChange(v)} accessibilityLabel={field.display_label} testID={testID} />
      </View>
    );
  }
  if (field.data_type === 'enum') {
    return (
      <View style={styles.field}>
        {label}
        <SelectField value={typeof value === 'string' ? value : ''} onChange={(v) => onChange(v)} options={choices} placeholder={t('screens.commerceportal.productForm.choosePlaceholder')} accessibilityLabel={field.display_label} testID={testID} />
        {help}
      </View>
    );
  }
  if (field.data_type === 'multi_enum') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    return (
      <View style={styles.field}>
        {label}
        <View style={styles.chips}>
          {choices.map((o) => (
            <Chip key={o.value} label={o.label} on={selected.includes(o.value)} onPress={() => toggle(o.value)} testID={`${testID}-${o.value}`} />
          ))}
        </View>
        {help}
      </View>
    );
  }
  const numeric = field.data_type === 'number' || field.data_type === 'integer';
  return (
    <View style={styles.field}>
      {label}
      <Input
        type={numeric ? 'number' : field.data_type === 'url' ? 'url' : 'text'}
        keyboardType={field.data_type === 'integer' ? 'number-pad' : field.data_type === 'number' ? 'decimal-pad' : undefined}
        value={value === undefined || value === null ? '' : String(value)}
        accessibilityLabel={field.display_label}
        testID={testID}
        onChangeText={(raw: string) => {
          if (raw === '') {
            onChange(undefined);
            return;
          }
          if (!numeric) {
            onChange(raw);
            return;
          }
          const n = field.data_type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
          onChange(Number.isNaN(n) ? undefined : n);
        }}
      />
      {help}
    </View>
  );
}

export function ListingStrength({ fields, attributes }: { fields: VerticalField[]; attributes: Record<string, AttributeValue> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { pct, nextUp } = computeStrength(fields, attributes);
  return (
    <View style={[styles.strength, { borderColor: colors.border, backgroundColor: colors.card }]} testID="listing-strength">
      <View style={styles.between}>
        <Text size="sm" weight="500">
          {t('screens.commerceportal.productForm.strengthTitle')}
        </Text>
        <Text size="sm" weight="600" color={colors.statusWarning} testID="listing-strength-pct">
          {`${pct}%`}
        </Text>
      </View>
      <Progress value={pct} style={styles.thin} />
      <Text size="xs" muted>
        {nextUp.length > 0 ? t('screens.commerceportal.productForm.strengthHint', { fields: nextUp.map((f) => f.display_label).join(', ') }) : t('screens.commerceportal.productForm.strengthComplete')}
      </Text>
    </View>
  );
}

export function ProductForm({
  vertical,
  kind = 'product',
  options,
  userId,
  org,
  onSaved,
  onCancel,
}: {
  vertical: Vertical;
  kind?: OfferKind;
  options: VocabularyOptions;
  userId: string;
  org: MyOrgRow;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}): ReactElement {
  const { t } = useI18n();
  const [core, setCore] = useState<CoreState>(EMPTY_CORE);
  const [images, setImages] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttributeValue>>({});
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const prominent = useMemo(() => vertical.fields.filter((f) => f.is_prominent), [vertical.fields]);
  const rest = useMemo(() => vertical.fields.filter((f) => !f.is_prominent), [vertical.fields]);
  const shipsTo = parseCountries(core.ships_to);
  const priceCents = Math.round(parseFloat(core.price.replace(',', '.')) * 100);
  const canSave =
    core.title.trim().length > 0 && Number.isFinite(priceCents) && priceCents >= 0 && /^https?:\/\//i.test(core.affiliate_url.trim()) && /^[A-Za-z]{2}$/.test(core.origin_country.trim()) && shipsTo.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await addOrgProduct(
        org.id,
        {
          title: core.title.trim(),
          description: core.description.trim() || undefined,
          price_cents: priceCents,
          currency: core.currency,
          images,
          affiliate_url: core.affiliate_url.trim(),
          origin_country: core.origin_country.trim().toUpperCase(),
          ships_to_countries: shipsTo,
          category: vertical.key,
          attributes,
        },
        verticalForOrgType(org.org_type),
        commerceFetch,
      );
      notify('screens.commerceportal.productForm.saved');
      setCore(EMPTY_CORE);
      setImages([]);
      setAttributes({});
      await onSaved();
    } catch {
      notifyError('screens.commerceportal.productForm.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const setAttr = (key: string, v: AttributeValue) =>
    setAttributes((prev) => {
      const next = { ...prev };
      if (v === undefined) delete next[key];
      else next[key] = v;
      return next;
    });
  const set = (patch: Partial<CoreState>) => setCore((c) => ({ ...c, ...patch }));

  return (
    <View style={styles.form} testID="product-form">
      <View style={styles.section}>
        <Field label={kind === 'product' ? t('screens.commerceportal.productForm.name') : t(`screens.commerceportal.addOffer.name_${kind}`)}>
          <Input value={core.title} onChangeText={(v: string) => set({ title: v })} testID="pf-title" accessibilityLabel={kind === 'product' ? t('screens.commerceportal.productForm.name') : t(`screens.commerceportal.addOffer.name_${kind}`)} />
        </Field>
        <View style={styles.priceRow}>
          <View style={styles.fill}>
            <Field label={t('screens.commerceportal.productForm.price')}>
              <Input keyboardType="decimal-pad" value={core.price} onChangeText={(v: string) => set({ price: v })} testID="pf-price" accessibilityLabel={t('screens.commerceportal.productForm.price')} />
            </Field>
          </View>
          <View style={styles.currency}>
            <Field label={t('screens.commerceportal.productForm.currency')}>
              <SelectField value={core.currency} onChange={(v) => set({ currency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} accessibilityLabel={t('screens.commerceportal.productForm.currency')} testID="pf-currency" />
            </Field>
          </View>
        </View>
        <Field label={t('screens.commerceportal.productForm.photo')}>
          <ProductImageField images={images} onChange={setImages} userId={userId} />
        </Field>
        <Field
          label={kind === 'product' ? t('screens.commerceportal.productForm.buyUrl') : t('screens.commerceportal.addOffer.bookUrl')}
          hint={kind === 'product' ? t('screens.commerceportal.productForm.buyUrlHint') : t('screens.commerceportal.addOffer.bookUrlHint')}
        >
          <Input type="url" placeholder={URL_PLACEHOLDER} value={core.affiliate_url} onChangeText={(v: string) => set({ affiliate_url: v })} autoCapitalize="none" autoCorrect={false} testID="pf-url" accessibilityLabel={kind === 'product' ? t('screens.commerceportal.productForm.buyUrl') : t('screens.commerceportal.addOffer.bookUrl')} />
        </Field>
        <Field label={kind === 'product' ? t('screens.commerceportal.productForm.shipsFrom') : t('screens.commerceportal.addOffer.basedIn')}>
          <Input maxLength={2} placeholder={ORIGIN_PLACEHOLDER} autoCapitalize="characters" value={core.origin_country} onChangeText={(v: string) => set({ origin_country: v.toUpperCase() })} testID="pf-origin" accessibilityLabel={kind === 'product' ? t('screens.commerceportal.productForm.shipsFrom') : t('screens.commerceportal.addOffer.basedIn')} />
        </Field>
        <Field
          label={kind === 'product' ? t('screens.commerceportal.productForm.shipsTo') : t('screens.commerceportal.addOffer.availableIn')}
          hint={kind === 'product' ? t('screens.commerceportal.productForm.shipsToHint') : t('screens.commerceportal.addOffer.availableInHint')}
        >
          <Input placeholder={SHIPS_TO_PLACEHOLDER} autoCapitalize="characters" value={core.ships_to} onChangeText={(v: string) => set({ ships_to: v })} testID="pf-ships" accessibilityLabel={kind === 'product' ? t('screens.commerceportal.productForm.shipsTo') : t('screens.commerceportal.addOffer.availableIn')} />
        </Field>
        <Field label={t('screens.commerceportal.productForm.description')}>
          <Textarea rows={3} value={core.description} onChangeText={(v: string) => set({ description: v })} testID="pf-desc" accessibilityLabel={t('screens.commerceportal.productForm.description')} />
        </Field>
      </View>

      {vertical.fields.length > 0 ? (
        <View style={styles.section} testID="pf-vertical">
          <Text size="sm" weight="500" muted style={styles.caps}>
            {t('screens.commerceportal.productForm.aboutVertical', { vertical: vertical.display_label })}
          </Text>
          {prominent.map((f) => (
            <VerticalFieldInput key={f.field_key} field={f} value={attributes[f.field_key]} options={options} onChange={(v) => setAttr(f.field_key, v)} />
          ))}
          {rest.length > 0 && !showAll ? (
            <Button variant="ghost" onPress={() => setShowAll(true)} testID="pf-more" style={styles.selfStart}>
              {t('screens.commerceportal.productForm.moreDetails', { count: rest.length })}
            </Button>
          ) : null}
          {showAll ? rest.map((f) => <VerticalFieldInput key={f.field_key} field={f} value={attributes[f.field_key]} options={options} onChange={(v) => setAttr(f.field_key, v)} />) : null}
        </View>
      ) : null}

      <ListingStrength fields={vertical.fields} attributes={attributes} />

      <View style={styles.buttons}>
        <Button onPress={() => void save()} disabled={!canSave || saving} testID="pf-submit">
          {t('screens.commerceportal.productForm.submit')}
        </Button>
        <Button variant="ghost" onPress={onCancel} disabled={saving} testID="pf-cancel">
          {t('screens.commerceportal.productForm.cancel')}
        </Button>
      </View>
      <Text size="xs" muted>
        {t('screens.commerceportal.productForm.reviewNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  section: { gap: 12 },
  field: { gap: 6 },
  fill: { flex: 1, minWidth: 0 },
  priceRow: { flexDirection: 'row', gap: 12 },
  currency: { width: 128 },
  caps: { textTransform: 'uppercase', letterSpacing: 1.5 },
  selfStart: { alignSelf: 'flex-start' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1 },
  remove: { position: 'absolute', top: -6, end: -6, borderWidth: 1, borderRadius: 999, padding: 2 },
  add: { width: 80, height: 80, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center' },
  addInner: { alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  boolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  thin: { height: 6 },
  strength: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
});
