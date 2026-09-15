/**
 * The manual product form (VTID-03894) — the path for a supplier who would
 * rather fill something in than point an AI at us.
 *
 * SHAPE: a small universal core that gates saving, then the supplier's own
 * vertical's questions, which never do. Both halves come from the same
 * `catalog_vertical_fields` rows the spreadsheet template will be generated
 * from, so a wine grower's form and their CSV columns cannot drift apart.
 *
 * House style is plain useState + adminFetch — react-hook-form is installed but
 * used in exactly one dialog repo-wide, and CommercePortal's own header states
 * the convention. Matching the neighbours beats importing a second idiom.
 */
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API } from '@/lib/commerce-host';
import { t, notify, notifyError } from '@/lib/i18n-toast';
import type { Vertical, VocabularyOptions } from '@/hooks/useCommerceVerticals';
import { VerticalFieldInput, type AttributeValue } from './VerticalFieldInput';
import { ListingStrength } from './ListingStrength';
import { ProductImageField } from './ProductImageField';

const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

/** Kept short on purpose — a long dropdown is a worse default than typing. */
const CURRENCIES = ['EUR', 'CHF', 'GBP', 'USD'] as const;

interface CoreState {
  title: string;
  description: string;
  price: string;
  currency: string;
  affiliate_url: string;
  origin_country: string;
  ships_to: string;
}

const EMPTY_CORE: CoreState = {
  title: '',
  description: '',
  price: '',
  currency: 'EUR',
  affiliate_url: '',
  origin_country: '',
  ships_to: '',
};

const parseCountries = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));

export function ProductForm({
  vertical,
  options,
  userId,
  businessName,
  onSaved,
  onCancel,
}: {
  vertical: Vertical;
  options: VocabularyOptions;
  userId: string;
  /** The SUPPLIER's business name — never the product's. */
  businessName: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [core, setCore] = useState<CoreState>(EMPTY_CORE);
  const [images, setImages] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttributeValue>>({});
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const prominent = useMemo(() => vertical.fields.filter((f) => f.is_prominent), [vertical.fields]);
  const rest = useMemo(() => vertical.fields.filter((f) => !f.is_prominent), [vertical.fields]);

  const shipsTo = parseCountries(core.ships_to);
  const priceCents = Math.round(parseFloat(core.price.replace(',', '.')) * 100);

  // The save gate — and the ONLY one. `ships_to` is in here because a product
  // with no destination can never be shown to anyone: the gateway's own ingest
  // schema refuses it, so letting it through here would just move the failure
  // somewhere less explainable.
  const canSave =
    core.title.trim().length > 0 &&
    Number.isFinite(priceCents) &&
    priceCents >= 0 &&
    /^https?:\/\//i.test(core.affiliate_url.trim()) &&
    /^[A-Za-z]{2}$/.test(core.origin_country.trim()) &&
    shipsTo.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      // The merchant row is upserted on every save rather than only the first:
      // the supplier may have changed vertical since, and one round trip is
      // cheaper than a "which step am I on" state machine.
      await adminFetch(`${MY_PORTAL_API}/merchants`, {
        method: 'POST',
        body: JSON.stringify({
          name: businessName.trim().slice(0, 256),
          vertical_key: vertical.key,
          merchant_country: core.origin_country.trim().toUpperCase(),
        }),
      });

      await adminFetch(`${MY_PORTAL_API}/products`, {
        method: 'POST',
        body: JSON.stringify({
          title: core.title.trim(),
          description: core.description.trim() || undefined,
          price_cents: priceCents,
          currency: core.currency,
          images,
          affiliate_url: core.affiliate_url.trim(),
          origin_country: core.origin_country.trim().toUpperCase(),
          ships_to_countries: shipsTo,
          category: vertical.key,
          // Undefined values are stripped by JSON.stringify, so an unanswered
          // question never lands as a null in `attributes`.
          attributes,
        }),
      });

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

  return (
    <div className="space-y-5">
      {/* THE CORE — everything here is required, and it is the whole gate. */}
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-title" className="text-slate-300">
            {t('screens.commerceportal.productForm.name')}
          </Label>
          <Input
            id="pf-title"
            className={fieldClass}
            value={core.title}
            onChange={(e) => setCore((c) => ({ ...c, title: e.target.value }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div className="space-y-1.5">
            <Label htmlFor="pf-price" className="text-slate-300">
              {t('screens.commerceportal.productForm.price')}
            </Label>
            <Input
              id="pf-price"
              className={fieldClass}
              inputMode="decimal"
              value={core.price}
              onChange={(e) => setCore((c) => ({ ...c, price: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-currency" className="text-slate-300">
              {t('screens.commerceportal.productForm.currency')}
            </Label>
            <Select value={core.currency} onValueChange={(v) => setCore((c) => ({ ...c, currency: v }))}>
              <SelectTrigger id="pf-currency" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-300">{t('screens.commerceportal.productForm.photo')}</Label>
          <ProductImageField images={images} onChange={setImages} userId={userId} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-url" className="text-slate-300">
            {t('screens.commerceportal.productForm.buyUrl')}
          </Label>
          <Input
            id="pf-url"
            type="url"
            dir="ltr"
            className={fieldClass}
            placeholder="https://"
            value={core.affiliate_url}
            onChange={(e) => setCore((c) => ({ ...c, affiliate_url: e.target.value }))}
          />
          <p className="text-xs text-slate-500">{t('screens.commerceportal.productForm.buyUrlHint')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-origin" className="text-slate-300">
              {t('screens.commerceportal.productForm.shipsFrom')}
            </Label>
            <Input
              id="pf-origin"
              className={fieldClass}
              maxLength={2}
              placeholder="DE"
              value={core.origin_country}
              onChange={(e) => setCore((c) => ({ ...c, origin_country: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-ships" className="text-slate-300">
              {t('screens.commerceportal.productForm.shipsTo')}
            </Label>
            <Input
              id="pf-ships"
              className={fieldClass}
              placeholder="DE, AT, CH"
              value={core.ships_to}
              onChange={(e) => setCore((c) => ({ ...c, ships_to: e.target.value }))}
            />
            <p className="text-xs text-slate-500">{t('screens.commerceportal.productForm.shipsToHint')}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-desc" className="text-slate-300">
            {t('screens.commerceportal.productForm.description')}
          </Label>
          <Textarea
            id="pf-desc"
            rows={3}
            className={fieldClass}
            value={core.description}
            onChange={(e) => setCore((c) => ({ ...c, description: e.target.value }))}
          />
        </div>
      </section>

      {/* THE VERTICAL'S OWN QUESTIONS — optional, always. */}
      {vertical.fields.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-[0.15em] text-slate-500">
            {t('screens.commerceportal.productForm.aboutVertical', { vertical: vertical.display_label })}
          </h3>

          {prominent.map((f) => (
            <VerticalFieldInput
              key={f.field_key}
              field={f}
              value={attributes[f.field_key]}
              options={options}
              onChange={(v) => setAttr(f.field_key, v)}
            />
          ))}

          {rest.length > 0 && !showAll && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAll(true)}
              className="h-auto px-0 text-sm text-amber-400 hover:bg-transparent hover:text-amber-300"
            >
              {t('screens.commerceportal.productForm.moreDetails', { count: rest.length })}
            </Button>
          )}

          {showAll &&
            rest.map((f) => (
              <VerticalFieldInput
                key={f.field_key}
                field={f}
                value={attributes[f.field_key]}
                options={options}
                onChange={(v) => setAttr(f.field_key, v)}
              />
            ))}
        </section>
      )}

      <ListingStrength fields={vertical.fields} attributes={attributes} />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void save()}
          disabled={!canSave || saving}
          className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('screens.commerceportal.productForm.submit')}
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          {t('screens.commerceportal.productForm.cancel')}
        </Button>
      </div>

      <p className="text-xs text-slate-600">{t('screens.commerceportal.productForm.reviewNote')}</p>
    </div>
  );
}
