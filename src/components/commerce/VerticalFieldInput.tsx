/**
 * One question from `catalog_vertical_fields`, rendered by its data_type
 * (VTID-03894).
 *
 * Every input here is OPTIONAL by design. These never gate saving — they feed
 * the listing-strength meter instead. A grower who does not know their ABV
 * must still be able to list their wine; a form that refuses is a form they
 * abandon.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VerticalField, VocabularyOptions } from '@/hooks/useCommerceVerticals';
import { t } from '@/lib/i18n-toast';

const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

export type AttributeValue = string | number | boolean | string[] | undefined;

export function VerticalFieldInput({
  field,
  value,
  options,
  onChange,
}: {
  field: VerticalField;
  value: AttributeValue;
  options: VocabularyOptions;
  onChange: (next: AttributeValue) => void;
}) {
  const id = `vf-${field.field_key}`;
  const choices = field.vocabulary ? options[field.vocabulary] ?? [] : [];

  const label = (
    <Label htmlFor={id} className="text-slate-300">
      {field.display_label}
      {field.unit && <span className="ms-1 text-xs text-slate-500">({field.unit})</span>}
    </Label>
  );

  const help = field.help_text ? <p className="text-xs text-slate-500">{field.help_text}</p> : null;

  if (field.data_type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-3 py-2.5">
        <div className="min-w-0">
          {label}
          {help}
        </div>
        <Switch id={id} checked={value === true} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }

  if (field.data_type === 'enum') {
    return (
      <div className="space-y-1.5">
        {label}
        <Select value={typeof value === 'string' ? value : undefined} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} className={fieldClass}>
            <SelectValue placeholder={t('screens.commerceportal.productForm.choosePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {help}
      </div>
    );
  }

  if (field.data_type === 'multi_enum') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    return (
      <div className="space-y-1.5">
        {label}
        <div className="flex flex-wrap gap-1.5">
          {choices.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  on
                    ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {help}
      </div>
    );
  }

  const numeric = field.data_type === 'number' || field.data_type === 'integer';
  return (
    <div className="space-y-1.5">
      {label}
      <Input
        id={id}
        className={fieldClass}
        type={numeric ? 'number' : field.data_type === 'date' ? 'date' : field.data_type === 'url' ? 'url' : 'text'}
        step={field.data_type === 'integer' ? 1 : field.data_type === 'number' ? 'any' : undefined}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            // Empty must clear the key entirely rather than store "" or NaN —
            // an empty string in `attributes` reads as "answered with nothing"
            // and would count toward listing strength.
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
    </div>
  );
}
