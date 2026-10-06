/**
 * VTID-04895 — the supplier reads and accepts the partner terms, on Vitanaland.
 * VTID-04909 — German is binding; one language at a time, switchable.
 *
 * The terms open in the supplier's app language (German when that translation
 * is missing). A notice that the German version is binding stays visible
 * whatever language is shown, with a one-tap way back to German. The
 * supplier may switch to any language the version carries; switching never
 * changes the version or hash being accepted and never accepts anything —
 * the tick is kept because it is the same legal version. Arabic reads right
 * to left. Accept stays off until the supplier ticks "I have read and
 * accept"; the box is never pre-ticked. If a new version was published while
 * the sheet was open, the gateway answers 409: the sheet loads the new text,
 * unticks the box and says so. Accepting is never an assistant's action —
 * the gateway refuses delegated tokens; this sheet is the only way.
 */
import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2, ShieldCheck } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, notify, notifyError, getI18nLocale } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import {
  BINDING_TERMS_LOCALE,
  TERMS_LANGUAGE_NAMES,
  acceptPartnerTerms,
  fetchPartnerTerms,
  isStaleTermsError,
  sameTermsVersion,
  termsBlocks,
  type PartnerTerms,
} from '@/lib/commerce-terms';

const K = 'screens.commerceportal.terms';

/** Keeps a Latin identifier (version, date) in one piece inside right-to-left text. */
const isolate = (s: string) => `⁨${s}⁩`;

function TermsBody({ terms }: { terms: PartnerTerms }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {termsBlocks(terms.text.body_md).map((b, i) =>
        b.kind === 'heading' ? (
          <h4 key={i} className="pt-3 text-base font-semibold text-foreground">
            {b.text}
          </h4>
        ) : b.kind === 'marker' ? (
          <p key={i} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900" dir="ltr">
            {b.text}
          </p>
        ) : b.kind === 'item' ? (
          <p key={i} className="flex gap-2 ps-4">
            <span className="shrink-0 font-medium">{b.label}</span>
            <span>{b.text}</span>
          </p>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}

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
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setSwitchFailed(false);
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

  /** Read another language of the same version. Never accepts, never changes what is accepted. */
  const switchTo = async (locale: string) => {
    if (!terms || locale === terms.locale) return;
    setSwitching(true);
    setSwitchFailed(false);
    try {
      const s = await fetchPartnerTerms(orgId, locale);
      const next = s.kind === 'not_published' ? null : s.terms;
      if (next && !sameTermsVersion(terms, next)) {
        // A new version was published meanwhile: show it, ask again.
        setAgreed(false);
        setUpdated(true);
      }
      setTerms(next);
      textRef.current?.scrollTo?.({ top: 0 });
    } catch {
      // Keep the text on screen; say the other language could not be loaded.
      setSwitchFailed(true);
    } finally {
      setSwitching(false);
    }
  };

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

  const showingGerman = terms?.locale === BINDING_TERMS_LOCALE;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile className="md:max-w-3xl" data-testid="partner-terms-sheet">
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

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" data-testid="partner-terms-version">
                  {t(`${K}.version`, { version: isolate(terms.version), date: isolate(fmtDate(new Date(terms.published_at))) })}
                </p>
                {terms.available_locales.length > 1 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Languages className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">{t(`${K}.languageLabel`)}</span>
                    <Select value={terms.locale} onValueChange={(v) => void switchTo(v)} disabled={switching || saving}>
                      <SelectTrigger className="h-10 w-48 rounded-xl" aria-label={t(`${K}.languageLabel`)} data-testid="partner-terms-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent data-testid="partner-terms-language-list">
                        {terms.available_locales.map((l) => (
                          <SelectItem key={l} value={l} data-testid={`partner-terms-language-${l}`}>
                            <span lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>
                              {TERMS_LANGUAGE_NAMES[l] ?? l}
                            </span>
                            {l === BINDING_TERMS_LOCALE && (
                              <span className="ms-2 text-xs text-muted-foreground">{t(`${K}.bindingShort`)}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>

              {/* German is binding — always on screen, whatever language is shown. */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950" data-testid="partner-terms-binding-notice">
                <p>{t(`${K}.bindingNotice`)}</p>
                {!showingGerman && (
                  <button
                    type="button"
                    onClick={() => void switchTo(BINDING_TERMS_LOCALE)}
                    disabled={switching}
                    className="mt-1 min-h-11 font-semibold text-amber-800 underline underline-offset-2"
                    data-testid="partner-terms-read-german"
                  >
                    {t(`${K}.readGerman`)}
                  </button>
                )}
              </div>

              {terms.fallback && (
                <p className="text-sm text-muted-foreground" data-testid="partner-terms-fallback">
                  {t(`${K}.fallbackNotice`)}
                </p>
              )}
              {switchFailed && (
                <p className="text-sm text-destructive" data-testid="partner-terms-switch-failed">
                  {t(`${K}.loadFailed`)}
                </p>
              )}

              <section
                className="rounded-2xl border border-border p-4"
                lang={terms.locale}
                dir={terms.direction}
                data-testid="partner-terms-text"
              >
                <h3 className="text-lg font-bold text-foreground">{terms.text.title}</h3>
                <div ref={textRef} className="mt-2 max-h-[50vh] overflow-y-auto pe-1 md:max-h-96">
                  {switching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <TermsBody terms={terms} />
                  )}
                </div>
              </section>

              <div className="rounded-xl bg-amber-50/60 p-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-foreground">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    data-testid="partner-terms-agree"
                    className="mt-0.5"
                  />
                  <span>{t(`${K}.agree`)}</span>
                </label>
                <p className="mt-1 ps-7 text-xs text-muted-foreground" data-testid="partner-terms-agree-explanation">
                  {t(`${K}.agreeExplanation`)}
                </p>
              </div>
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
              disabled={!agreed || saving || switching}
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
