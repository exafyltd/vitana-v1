/**
 * VTID-04796 — which business a setup sheet is working on, always in view.
 * One business: "For Demo Studio". Several: "For:" with a selector that
 * switches the business everywhere (same stored choice as the setup hub).
 */
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t } from '@/lib/i18n-toast';

export function BusinessContext({
  org,
  orgs = [],
  onSelectOrg,
}: {
  org: MyOrgRow | null;
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
}) {
  if (!org) return null;
  if (orgs.length > 1 && onSelectOrg) {
    return (
      <label className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="business-context">
        {t('screens.commerceportal.forBusinessLabel')}
        <select
          value={org.id}
          onChange={(e) => onSelectOrg(e.target.value)}
          className="h-11 max-w-[14rem] truncate rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.display_name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <p className="text-sm font-medium text-foreground" data-testid="business-context">
      {t('screens.commerceportal.forBusiness', { name: org.display_name })}
    </p>
  );
}
