/**
 * VTID-04895 — the supplier reads and accepts the partner terms, on Vitanaland.
 *
 * Shows the English text (binding) and, when the supplier's language has a
 * translation, that translation alongside, clearly labelled. Accept stays off
 * until the supplier ticks "I have read and accept". If a new version was
 * published while the sheet was open, the gateway answers 409: the sheet loads
 * the new text, unticks the box and says so. Accepting is never an assistant's
 * action — the gateway refuses delegated tokens; this sheet is the only way.
 */
import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { t, notify, notifyError, getI18nLocale } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import { acceptPartnerTerms, fetchPartnerTerms, isStaleTermsError, type PartnerTerms } from '@/lib/commerce-terms';

const K = 'screens.commerceportal.terms';

export function PartnerTermsSheet({
  open,
  onOpenChange,
  orgId,
  onAccepted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onAccepted: () => void;
}) {
  const [terms, setTerms] = useState<PartnerTerms | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setAgreed(false);
    try {
      const s = await fetchPartnerTerms(orgId, getI18nLocale());
      setTerms(s.kind === 'not_published' ? null : s.terms);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setUpdated(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgId]);

  const accept = async () => {
    if (!terms || !agreed) return;
    setSaving(true);
    try {
      await acceptPartnerTerms(orgId, terms);
      notify(`${K}.accepted`);
      onOpenChange(false);
      onAccepted();
    } catch (e) {
      if (isStaleTermsError(e)) {
        // A new version was published while this was open: show it, ask again.
        setUpdated(true);
        await load();
      } else {
        notifyError(`${K}.acceptFailed`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile data-testid="partner-terms-sheet">
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 shrink-0 text-amber-700" />
            {t(`${K}.title`)}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-4 md:mt-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : failed ? (
            <p className="text-sm text-muted-foreground">{t(`${K}.loadFailed`)}</p>
          ) : !terms ? (
            <p className="text-sm text-muted-foreground" data-testid="partner-terms-none">
              {t(`${K}.notPublished`)}
            </p>
          ) : (
            <>
              {updated && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="partner-terms-updated">
                  {t(`${K}.updated`)}
                </p>
              )}
              <p className="text-sm text-muted-foreground" data-testid="partner-terms-version">
                {t(`${K}.version`, { version: terms.version, date: fmtDate(new Date(terms.published_at)) })}
              </p>

              <section className="rounded-2xl border border-border p-4" lang="en" dir="ltr" data-testid="partner-terms-binding">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t(`${K}.bindingLabel`)}</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{terms.binding.title}</h3>
                <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {terms.binding.body_md}
                </div>
              </section>

              {terms.translation && (
                <section
                  className="rounded-2xl border border-dashed border-border bg-muted/30 p-4"
                  lang={terms.translation.locale}
                  data-testid="partner-terms-translation"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`${K}.translationLabel`)}</p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">{terms.translation.title}</h3>
                  <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {terms.translation.body_md}
                  </div>
                </section>
              )}

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-amber-50/60 p-3 text-sm text-foreground">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  data-testid="partner-terms-agree"
                  className="mt-0.5"
                />
                <span>{t(`${K}.agree`, { version: terms.version })}</span>
              </label>
            </>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 rounded-xl">
            {t(`${K}.close`)}
          </Button>
          {terms && (
            <Button
              onClick={() => void accept()}
              disabled={!agreed || saving}
              data-testid="partner-terms-accept"
              className="h-12 rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800"
            >
              {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {t(`${K}.accept`)}
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
