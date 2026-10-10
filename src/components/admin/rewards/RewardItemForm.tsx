/**
 * VTID-05036 — create / edit one Rewards Shop item. Saves through
 * PUT /api/v1/admin/rewards/items (upsert by slug, so the slug is fixed once
 * saved); the photo goes through POST /admin/rewards/items/image after it has
 * been shrunk in the browser. A new item is saved inactive.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { notifySuccess, t } from '@/lib/i18n-toast';
import { fmtNumber, fmtRegion } from '@/lib/locale-format';
import { cn } from '@/lib/utils';
import type { ShopFulfilment } from '@/hooks/useRewardShop';
import {
  type AdminRewardItem,
  useSaveAdminRewardItem,
  useUploadRewardItemImage,
} from '@/hooks/useAdminRewardShop';
import {
  EUR_PER_VTNA,
  type ItemFormErrors,
  type ItemFormValues,
  buildItemBody,
  emptyItemForm,
  itemToForm,
  normaliseCountry,
  slugify,
  validateItemForm,
} from './item-form';
import { prepareItemImage } from './image-shrink';
import { ServerError } from './ServerError';

const FULFILMENTS: ShopFulfilment[] = ['ship', 'event', 'digital'];
/** Quick picks; any other ISO code can be typed in. */
const PRESET_COUNTRIES = ['DE', 'AT', 'CH', 'NL', 'BE', 'LU', 'FR', 'IT', 'ES', 'PL', 'RS', 'GB', 'US'];

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function FieldError({ field, errors, show }: { field: keyof ItemFormErrors; errors: ItemFormErrors; show: boolean }) {
  const key = errors[field];
  if (!show || !key) return null;
  return (
    <p className="text-xs text-destructive text-start" data-testid={`reward-item-error-${field}`}>
      {t(`admin.rewardsShop.validation.${key}`)}
    </p>
  );
}

export function RewardItemForm({ open, item, onClose }: { open: boolean; item: AdminRewardItem | null; onClose: () => void }) {
  const isNew = !item;
  const [values, setValues] = useState<ItemFormValues>(() => (item ? itemToForm(item) : emptyItemForm()));
  const [slugTouched, setSlugTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [countryDraft, setCountryDraft] = useState('');
  const [countryError, setCountryError] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const save = useSaveAdminRewardItem();
  const upload = useUploadRewardItemImage();
  const ids = useId();

  // Reset whenever the dialog opens for another item.
  useEffect(() => {
    if (!open) return;
    setValues(item ? itemToForm(item) : emptyItemForm());
    setSlugTouched(false);
    setShowErrors(false);
    setCountryDraft('');
    setCountryError(false);
    setPhotoError(null);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const errors = validateItemForm(values);
  const set = <K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) => setValues((prev) => ({ ...prev, [k]: v }));

  const onTitleDe = (v: string) => {
    setValues((prev) => ({ ...prev, titleDe: v, slug: isNew && !slugTouched ? slugify(v) : prev.slug }));
  };

  const toggleCountry = (c: string) => {
    setValues((prev) => ({
      ...prev,
      countries: prev.countries.includes(c) ? prev.countries.filter((x) => x !== c) : [...prev.countries, c],
    }));
  };

  const addCountry = () => {
    const c = normaliseCountry(countryDraft);
    if (!c) {
      setCountryError(true);
      return;
    }
    setCountryError(false);
    setCountryDraft('');
    setValues((prev) => (prev.countries.includes(c) ? prev : { ...prev, countries: [...prev.countries, c] }));
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const body = await prepareItemImage(file);
      const res = await upload.mutateAsync(body);
      set('mainImage', res.url);
    } catch (e) {
      setPhotoError(e);
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    try {
      await save.mutateAsync(buildItemBody(values, item));
      notifySuccess('admin.rewardsShop.form.saved');
      onClose();
    } catch {
      // shown below via save.error
    }
  };

  const price = Number(values.price);
  const priceOk = Number.isInteger(price) && price > 0;
  const countryChips = [...new Set([...PRESET_COUNTRIES, ...values.countries])];

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ResponsiveDialogContent className="sm:max-w-2xl lg:max-h-[90vh] lg:overflow-y-auto" data-testid="reward-item-form">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isNew ? t('admin.rewardsShop.form.createTitle') : t('admin.rewardsShop.form.editTitle')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-5 py-2 text-start">
          {/* Titles + slug */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-title-de`}>{t('admin.rewardsShop.form.titleDe')}</Label>
              <Input id={`${ids}-title-de`} data-testid="reward-item-title-de" value={values.titleDe} onChange={(e) => onTitleDe(e.target.value)} />
              <FieldError field="titleDe" errors={errors} show={showErrors} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-title-en`}>{t('admin.rewardsShop.form.titleEn')}</Label>
              <Input id={`${ids}-title-en`} data-testid="reward-item-title-en" value={values.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-slug`}>{t('admin.rewardsShop.form.slug')}</Label>
            <Input
              id={`${ids}-slug`}
              data-testid="reward-item-slug"
              dir="ltr"
              className="font-mono text-start"
              value={values.slug}
              readOnly={!isNew}
              aria-readonly={!isNew}
              onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()); }}
            />
            <p className="text-xs text-muted-foreground">
              {isNew ? t('admin.rewardsShop.form.slugHint') : t('admin.rewardsShop.form.slugLocked')}
            </p>
            <FieldError field="slug" errors={errors} show={showErrors} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-desc-de`}>{t('admin.rewardsShop.form.descriptionDe')}</Label>
              <Textarea id={`${ids}-desc-de`} rows={3} value={values.descriptionDe} onChange={(e) => set('descriptionDe', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-desc-en`}>{t('admin.rewardsShop.form.descriptionEn')}</Label>
              <Textarea id={`${ids}-desc-en`} rows={3} value={values.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} />
            </div>
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <Label>{t('admin.rewardsShop.form.photo')}</Label>
            <div className="flex flex-wrap items-center gap-3">
              {values.mainImage ? (
                <img
                  src={values.mainImage}
                  alt={t('admin.rewardsShop.form.photoAlt')}
                  data-testid="reward-item-photo-preview"
                  className="h-24 w-24 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                  <ImagePlus className="h-6 w-6" aria-hidden />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  data-testid="reward-item-photo-input"
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" size="sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
                  {photoBusy ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="me-2 h-4 w-4" aria-hidden />}
                  {photoBusy
                    ? t('admin.rewardsShop.form.photoUploading')
                    : values.mainImage ? t('admin.rewardsShop.form.photoReplace') : t('admin.rewardsShop.form.photoAdd')}
                </Button>
                {values.mainImage && (
                  <Button type="button" variant="ghost" size="sm" disabled={photoBusy} onClick={() => set('mainImage', null)} data-testid="reward-item-photo-remove">
                    <Trash2 className="me-2 h-4 w-4" aria-hidden />
                    {t('admin.rewardsShop.form.photoRemove')}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.rewardsShop.form.photoHint')}</p>
            {values.extraImages.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('admin.rewardsShop.form.extraImages', { count: fmtNumber(values.extraImages.length) })}
              </p>
            )}
            <ServerError error={photoError} testId="reward-item-photo-error" />
          </div>

          {/* Price + type */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-price`}>{t('admin.rewardsShop.form.price')}</Label>
              <Input
                id={`${ids}-price`}
                data-testid="reward-item-price"
                inputMode="numeric"
                value={values.price}
                onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))}
              />
              {priceOk && (
                <p className="text-xs text-muted-foreground" data-testid="reward-item-price-eur">
                  {t('admin.rewardsShop.form.priceApprox', {
                    money: fmtNumber(price * EUR_PER_VTNA, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
                  })}
                </p>
              )}
              <FieldError field="price" errors={errors} show={showErrors} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-type`}>{t('admin.rewardsShop.form.type')}</Label>
              <select
                id={`${ids}-type`}
                data-testid="reward-item-type"
                className={SELECT_CLASS}
                value={values.fulfilment}
                onChange={(e) => set('fulfilment', e.target.value as ShopFulfilment)}
              >
                {FULFILMENTS.map((f) => (
                  <option key={f} value={f}>{t(`admin.rewardsShop.fulfilment.${f}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Age limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${ids}-age`}>{t('admin.rewardsShop.form.ageLimit')}</Label>
              <Switch id={`${ids}-age`} data-testid="reward-item-age" checked={values.ageRestricted} onCheckedChange={(c) => set('ageRestricted', c)} />
            </div>
            {values.ageRestricted && (
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-min-age`}>{t('admin.rewardsShop.form.minAge')}</Label>
                <Input
                  id={`${ids}-min-age`}
                  className="w-28"
                  inputMode="numeric"
                  value={values.minAge}
                  onChange={(e) => set('minAge', e.target.value.replace(/[^\d]/g, ''))}
                />
                <FieldError field="minAge" errors={errors} show={showErrors} />
              </div>
            )}
          </div>

          {/* Shipping countries — ship items only */}
          {values.fulfilment === 'ship' && (
            <fieldset className="space-y-2" data-testid="reward-item-countries">
              <legend className="text-sm font-medium">{t('admin.rewardsShop.form.countries')}</legend>
              <div className="flex flex-wrap gap-2">
                {countryChips.map((c) => {
                  const on = values.countries.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      title={fmtRegion(c)}
                      data-testid={`reward-item-country-${c}`}
                      onClick={() => toggleCountry(c)}
                      className={cn(
                        'inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
                      )}
                    >
                      <span className="font-mono">{c}</span>
                      {on && <X className="h-3 w-3" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  dir="ltr"
                  className="w-28 font-mono uppercase text-start"
                  maxLength={2}
                  aria-label={t('admin.rewardsShop.form.countryInput')}
                  placeholder={t('admin.rewardsShop.form.countryInput')}
                  data-testid="reward-item-country-input"
                  value={countryDraft}
                  onChange={(e) => setCountryDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCountry(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addCountry} data-testid="reward-item-country-add">
                  {t('admin.rewardsShop.form.countryAdd')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('admin.rewardsShop.form.countriesHint')}</p>
              {countryError && <p className="text-xs text-destructive">{t('admin.rewardsShop.validation.country')}</p>}
              <FieldError field="countries" errors={errors} show={showErrors} />
            </fieldset>
          )}

          {/* Stock + sort */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-stock`}>{t('admin.rewardsShop.form.stock')}</Label>
              <Input
                id={`${ids}-stock`}
                inputMode="numeric"
                data-testid="reward-item-stock"
                placeholder={t('admin.rewardsShop.form.stockUnlimited')}
                value={values.stock}
                onChange={(e) => set('stock', e.target.value.replace(/[^\d]/g, ''))}
              />
              <FieldError field="stock" errors={errors} show={showErrors} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-sort`}>{t('admin.rewardsShop.form.sortOrder')}</Label>
              <Input
                id={`${ids}-sort`}
                inputMode="numeric"
                value={values.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value.replace(/[^\d-]/g, ''))}
              />
              <FieldError field="sortOrder" errors={errors} show={showErrors} />
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={`${ids}-active`}>{t('admin.rewardsShop.form.activeLabel')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.rewardsShop.form.activeHint')}</p>
            </div>
            <Switch id={`${ids}-active`} data-testid="reward-item-active" checked={values.isActive} onCheckedChange={(c) => set('isActive', c)} />
          </div>

          <ServerError error={save.error} testId="reward-item-server-error" />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('admin.rewardsShop.form.cancel')}</Button>
          <Button type="button" onClick={submit} disabled={save.isPending || photoBusy} data-testid="reward-item-save">
            {save.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />}
            {save.isPending ? t('admin.rewardsShop.form.saving') : t('admin.rewardsShop.form.save')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
