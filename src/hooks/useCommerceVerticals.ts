/**
 * The supplier form's whole schema, in one call (VTID-03894).
 *
 * `GET /api/v1/vcaop/portal/my/verticals` returns the verticals, the questions
 * each one asks, and the option lists those questions draw from. The form
 * renders from this rather than from a hardcoded field list, so adding
 * "cosmetics" is a row in `catalog_verticals` — not a frontend release.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API } from '@/lib/commerce-host';

export type VerticalFieldType =
  | 'text' | 'number' | 'integer' | 'boolean' | 'date' | 'enum' | 'multi_enum' | 'url';

export interface VerticalField {
  vertical_key: string;
  field_key: string;
  display_label: string;
  help_text: string | null;
  data_type: VerticalFieldType;
  vocabulary: string | null;
  unit: string | null;
  /** Shown above the fold; the rest sit behind "more details". */
  is_prominent: boolean;
  sort_order: number;
}

export interface Vertical {
  key: string;
  display_label: string;
  description: string | null;
  icon: string | null;
  is_regulated: boolean;
  fields: VerticalField[];
}

export type VocabularyOptions = Record<string, Array<{ value: string; label: string }>>;

export function useCommerceVerticals() {
  const [verticals, setVerticals] = useState<Vertical[] | null>(null);
  const [options, setOptions] = useState<VocabularyOptions>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/verticals`);
      setVerticals(res.data?.verticals ?? []);
      setOptions(res.data?.options ?? {});
      setFailed(false);
    } catch {
      // A failure here means the form cannot render its questions at all, so
      // the caller shows a retry rather than an empty form that silently drops
      // everything the supplier types into a vertical it doesn't know about.
      setVerticals([]);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { verticals, options, failed, reload: load };
}
