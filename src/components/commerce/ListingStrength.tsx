/**
 * Listing strength (VTID-03894).
 *
 * The reason the vertical questions are optional and still get answered. A
 * required field makes a supplier resent the form; a visible "answer two more
 * and your wine shows up in more searches" makes them want to. Same data,
 * opposite feeling.
 *
 * Deliberately NOT a validation surface: it never blocks, never turns red, and
 * says what to add next rather than what is wrong.
 */
import { Progress } from '@/components/ui/progress';
import type { VerticalField } from '@/hooks/useCommerceVerticals';
import type { AttributeValue } from './VerticalFieldInput';
import { t } from '@/lib/i18n-toast';

export function computeStrength(
  fields: VerticalField[],
  attributes: Record<string, AttributeValue>,
): { pct: number; nextUp: VerticalField[] } {
  const answered = (f: VerticalField) => {
    const v = attributes[f.field_key];
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  };

  // The core is already satisfied by the time this renders (it gates saving),
  // so it is worth a fixed half and the vertical answers earn the rest.
  const CORE = 50;
  if (fields.length === 0) return { pct: 100, nextUp: [] };

  const done = fields.filter(answered).length;
  const pct = Math.round(CORE + (done / fields.length) * (100 - CORE));

  // Suggest prominent unanswered questions first — those are the ones a buyer
  // actually filters on.
  const nextUp = fields
    .filter((f) => !answered(f))
    .sort((a, b) => Number(b.is_prominent) - Number(a.is_prominent) || a.sort_order - b.sort_order)
    .slice(0, 2);

  return { pct, nextUp };
}

export function ListingStrength({
  fields,
  attributes,
}: {
  fields: VerticalField[];
  attributes: Record<string, AttributeValue>;
}) {
  const { pct, nextUp } = computeStrength(fields, attributes);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">
          {t('screens.commerceportal.productForm.strengthTitle')}
        </span>
        <span className="text-sm font-semibold text-amber-300">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" />
      {nextUp.length > 0 ? (
        <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
          {t('screens.commerceportal.productForm.strengthHint', {
            fields: nextUp.map((f) => f.display_label).join(', '),
          })}
        </p>
      ) : (
        <p className="mt-2.5 text-xs text-slate-500">
          {t('screens.commerceportal.productForm.strengthComplete')}
        </p>
      )}
    </div>
  );
}
