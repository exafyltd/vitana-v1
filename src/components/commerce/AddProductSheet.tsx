/**
 * "Add a product by hand" (VTID-03894) — the manual path's front door.
 *
 * VTID-04795: product-only from here on.
 *   1. What would you like to add? Product · Service · Experience
 *      (and "Many at once? Import a file", the existing CSV import).
 *   2. A product picks its vertical (which decides the questions it is ever
 *      shown); a service or experience goes straight to the form under the
 *      `services` vertical.
 *   3. ProductForm, saved to the registered business.
 * The business-level questions this sheet used to ask on every first product
 * — business name, how you sell, affiliate network, delivery days — moved to
 * the business itself ("Sales setup", SalesSetupSheet), so they are asked once
 * and a later product can never overwrite them. With several businesses the
 * sheet says which one it is adding to, with a selector.
 */
import { useEffect, useState } from 'react';
import { Briefcase, ChevronLeft, FileUp, Loader2, MapPin, Package, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';
import { useCommerceVerticals, type Vertical } from '@/hooks/useCommerceVerticals';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { ProductForm, type OfferKind } from './ProductForm';
import { t } from '@/lib/i18n-toast';
import { useCommerceSkin } from './CommerceShell';

/** Kept for existing imports — the helper now lives with the rest of the sales setup. */
export { deliveryDaysPayload } from '@/lib/commerce-sales';

const SERVICE_VERTICAL = 'services';

const KINDS: ReadonlyArray<{ kind: OfferKind; title: string; body: string; Icon: typeof Package }> = [
  { kind: 'product', title: 'screens.commerceportal.addOffer.product', body: 'screens.commerceportal.addOffer.productHint', Icon: Package },
  { kind: 'service', title: 'screens.commerceportal.addOffer.service', body: 'screens.commerceportal.addOffer.serviceHint', Icon: Briefcase },
  { kind: 'experience', title: 'screens.commerceportal.addOffer.experience', body: 'screens.commerceportal.addOffer.experienceHint', Icon: MapPin },
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
  /** The businesses the user administers. */
  orgs?: MyOrgRow[];
  activeOrgId?: string | null;
  onSelectOrg?: (id: string) => void;
  /** Opens the CSV import for many products at once. */
  onImportFile?: () => void;
  /** No business yet: products always belong to one, so register first. */
  onRegister?: () => void;
}) {
  const { user } = useAuth();
  // Sheets portal outside CommerceShell, so they take the portal skin here.
  const { portalClass } = useCommerceSkin();
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

  const chooseKind = (k: OfferKind) => {
    if (k === 'product') {
      setKind(k);
      setPicked(null);
      return;
    }
    const services = verticals?.find((v) => v.key === SERVICE_VERTICAL);
    if (!services) return;
    setKind(k);
    setPicked(services);
  };

  const back = () => {
    if (picked && kind === 'product') setPicked(null);
    else {
      setPicked(null);
      setKind(null);
    }
  };

  const title = picked
    ? t(`screens.commerceportal.addOffer.titleFor_${kind}`, { vertical: picked.display_label })
    : kind === 'product'
      ? t('screens.commerceportal.productForm.pickTitle')
      : t('screens.commerceportal.addOffer.title');

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent
        side="right"
        className={`w-full overflow-y-auto sm:max-w-xl ${portalClass}`}
      >
        <SheetHeader className="text-start">
          {kind && (
            <button
              type="button"
              onClick={back}
              className="-ms-1 flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-amber-700"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              {t('screens.commerceportal.orgOnboarding.wizardBack')}
            </button>
          )}
          <SheetTitle className="text-2xl font-bold">{title}</SheetTitle>
          {org && orgs.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('screens.commerceportal.addOffer.addingTo')}
              <select
                value={org.id}
                onChange={(e) => onSelectOrg?.(e.target.value)}
                className="h-11 max-w-[14rem] truncate rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_name}
                  </option>
                ))}
              </select>
            </label>
          ) : org ? (
            <p className="text-sm text-muted-foreground">
              {t('screens.commerceportal.addOffer.addingToName', { name: org.display_name })}
            </p>
          ) : null}
        </SheetHeader>

        <div className="mt-4">
          {!org ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground">{t('screens.commerceportal.addOffer.registerFirst')}</p>
              <Button
                onClick={() => {
                  close();
                  onRegister?.();
                }}
                className="mt-4 h-12 bg-amber-700 font-semibold text-white hover:bg-amber-800"
              >
                {t('screens.commerceportal.orgOnboarding.registerCta')}
              </Button>
            </div>
          ) : failed ? (
            // Without the vertical schema the form has no questions to ask, so
            // offer a retry rather than an empty form that silently discards
            // whatever the supplier types.
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground">{t('screens.commerceportal.productForm.loadFailed')}</p>
              <Button variant="outline" onClick={() => void reload()} className="mt-3">
                <RefreshCw className="me-2 h-4 w-4" />
                {t('screens.commerceportal.productForm.retry')}
              </Button>
            </div>
          ) : verticals === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : picked && kind ? (
            <ProductForm
              vertical={picked}
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
          ) : kind === 'product' ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {verticals
                .filter((v) => v.key !== SERVICE_VERTICAL)
                .map((v) => (
                  <li key={v.key}>
                    <button
                      type="button"
                      onClick={() => setPicked(v)}
                      className="h-full min-h-14 w-full rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-amber-600/50 hover:bg-amber-50/60 dark:hover:bg-amber-950/20"
                    >
                      <p className="font-medium text-foreground">{v.display_label}</p>
                      {v.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.description}</p>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {KINDS.map(({ kind: k, title: kt, body, Icon }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => chooseKind(k)}
                  data-testid={`add-kind-${k}`}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-amber-600/50 hover:bg-amber-50/60"
                >
                  <Icon className="h-6 w-6 shrink-0 text-amber-700" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{t(kt)}</span>
                    <span className="block text-sm text-muted-foreground">{t(body)}</span>
                  </span>
                </button>
              ))}
              {onImportFile && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onImportFile();
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 pt-2 text-sm font-medium text-amber-800 hover:underline"
                >
                  <FileUp className="h-4 w-4" />
                  {t('screens.commerceportal.addOffer.importFile')}
                </button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
