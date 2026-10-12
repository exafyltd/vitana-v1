/**
 * VTID-05091 — the supplier reads and signs the data processing agreement
 * (AVV) on Vitanaland. Same UX rules as PartnerTermsSheet (VTID-04895/04909):
 *
 * The agreement opens in the supplier's app language (German when that
 * translation is missing). A notice that the German version is binding stays
 * visible whatever language is shown, with a one-tap way back to German. The
 * supplier may switch to any language the version carries; switching never
 * changes the version or hash being signed and never signs anything — the
 * tick is kept because it is the same legal version. Arabic reads right to
 * left. The text is shown as authored, as plain-text blocks (never HTML).
 *
 * Signing needs the signer's full name, their role and a ticked declaration.
 * The declaration's wording is the version's own `signing_declaration`
 * (legal text from data); only when a version has none does the catalogue
 * fallback name the business. The box is never pre-ticked, and Sign stays off
 * until name, role and tick are all there. If the agreement changed while the
 * sheet was open (409), the sheet loads the new text, unticks the box and says
 * so. Signing is never an assistant's action — the gateway refuses delegated
 * tokens; this sheet is the only way.
 */
import { useEffect, useRef, useState } from 'react';
import { FileSignature, Languages, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, notify, notifyError, getI18nLocale } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import {
  BINDING_DPA_LOCALE,
  DPA_ERROR_KEYS,
  DPA_LANGUAGE_NAMES,
  DPA_RELOAD_ERRORS,
  MAX_SIGNER_NAME,
  MAX_SIGNER_ROLE,
  canSign,
  dpaBlocks,
  dpaSignErrorCode,
  fetchPartnerDpa,
  isStaleDpaError,
  sameDpaVersion,
  signPartnerDpa,
  type DpaStatus,
  type PartnerDpa,
} from '@/lib/commerce-dpa';

const K = 'screens.commerceportal.dpa';

/** Keeps a Latin identifier (version, date) in one piece inside right-to-left text. */
const isolate = (s: string) => `⁨${s}⁩`;

const dateOf = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? fmtDate(new Date(iso)) : null);

function DpaBody({ dpa }: { dpa: PartnerDpa }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {dpaBlocks(dpa.text.body_md).map((b, i) =>
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

export function PartnerDpaSheet({
  open,
  onOpenChange,
  orgId,
  legalName,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** The business's legal name, for the catalogue fallback declaration only. */
  legalName: string;
  onSigned: () => void;
}) {
  const [status, setStatus] = useState<DpaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [declared, setDeclared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const dpa = status && status.kind !== 'not_published' ? status.dpa : null;
  const signed = status?.kind === 'signed' ? status : null;

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setSwitchFailed(false);
    setDeclared(false);
    try {
      setStatus(await fetchPartnerDpa(orgId, getI18nLocale()));
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

  /** Read another language of the same version. Never signs, never changes what is signed. */
  const switchTo = async (locale: string) => {
    if (!dpa || locale === dpa.locale) return;
    setSwitching(true);
    setSwitchFailed(false);
    try {
      const next = await fetchPartnerDpa(orgId, locale);
      const nextDpa = next.kind === 'not_published' ? null : next.dpa;
      if (!nextDpa || !sameDpaVersion(dpa, nextDpa)) {
        // A new version was published (or withdrawn) meanwhile: show it, ask again.
        setDeclared(false);
        setUpdated(true);
      }
      setStatus(next);
      textRef.current?.closest('[data-dpa-body]')?.scrollTo?.({ top: 0 });
    } catch {
      // Keep the text on screen; say the other language could not be loaded.
      setSwitchFailed(true);
    } finally {
      setSwitching(false);
    }
  };

  const ready = canSign(signerName, signerRole, declared);

  const sign = async () => {
    if (!dpa || signed || !ready) return;
    setSaving(true);
    try {
      await signPartnerDpa(orgId, dpa, signerName, signerRole);
      notify(`${K}.signed`);
      onOpenChange(false);
      onSigned();
    } catch (e) {
      if (isStaleDpaError(e)) {
        // The agreement changed while this was open: show it, untick, ask again.
        setUpdated(true);
        await load();
        return;
      }
      const code = dpaSignErrorCode(e);
      notifyError(code ? DPA_ERROR_KEYS[code] : `${K}.signFailed`);
      if (code && DPA_RELOAD_ERRORS.includes(code)) await load();
    } finally {
      setSaving(false);
    }
  };

  const showingGerman = dpa?.locale === BINDING_DPA_LOCALE;
  const declaration = dpa?.signing_declaration ?? null;
  const bindingDeclaration = dpa && !showingGerman ? dpa.binding.signing_declaration : null;
  const signedDate = signed ? dateOf(signed.signedAt) : null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        fullscreenOnMobile
        className="md:max-w-3xl lg:flex lg:max-h-[calc(100dvh-2rem)] lg:flex-col lg:overflow-hidden lg:[&>div]:min-h-0 lg:[&>div]:flex-1"
        data-testid="partner-dpa-sheet"
      >
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <FileSignature className="h-6 w-6 shrink-0 text-amber-700" />
            {t(`${K}.title`)}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {/* The one scroll area: version, language, binding notice and the agreement text scroll together. */}
        <ResponsiveDialogBody className="min-h-0 space-y-4 md:mt-2 lg:flex-1 lg:overflow-y-auto" data-dpa-body>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : failed ? (
            <p className="text-sm text-muted-foreground" data-testid="partner-dpa-load-failed">
              {t(`${K}.loadFailed`)}
            </p>
          ) : !dpa ? (
            <p className="text-sm text-muted-foreground" data-testid="partner-dpa-none">
              {t(`${K}.notPublished`)}
            </p>
          ) : (
            <>
              {updated && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="partner-dpa-updated">
                  {t(`${K}.updated`)}
                </p>
              )}
              {status?.kind === 'unsigned' && status.resign && (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="partner-dpa-resign">
                  {t(`${K}.resignNotice`, { version: isolate(dpa.version) })}
                </p>
              )}
              {signed && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" data-testid="partner-dpa-signed">
                  {signedDate
                    ? t(`${K}.signedNotice`, { version: isolate(signed.signedVersion), date: isolate(signedDate) })
                    : t(`${K}.signedNoticeNoDate`, { version: isolate(signed.signedVersion) })}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" data-testid="partner-dpa-version">
                  {t(`${K}.version`, { version: isolate(dpa.version), date: isolate(dateOf(dpa.published_at) ?? '') })}
                </p>
                {dpa.available_locales.length > 1 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Languages className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">{t(`${K}.languageLabel`)}</span>
                    <Select value={dpa.locale} onValueChange={(v) => void switchTo(v)} disabled={switching || saving}>
                      <SelectTrigger className="h-10 w-48 rounded-xl" aria-label={t(`${K}.languageLabel`)} data-testid="partner-dpa-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent data-testid="partner-dpa-language-list">
                        {dpa.available_locales.map((l) => (
                          <SelectItem key={l} value={l} data-testid={`partner-dpa-language-${l}`}>
                            <span lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>
                              {DPA_LANGUAGE_NAMES[l] ?? l}
                            </span>
                            {l === BINDING_DPA_LOCALE && <span className="ms-2 text-xs text-muted-foreground">{t(`${K}.bindingShort`)}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>

              {/* German is binding — always on screen, whatever language is shown. */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950" data-testid="partner-dpa-binding-notice">
                <p>{t(`${K}.bindingNotice`)}</p>
                {!showingGerman && (
                  <button
                    type="button"
                    onClick={() => void switchTo(BINDING_DPA_LOCALE)}
                    disabled={switching}
                    className="mt-1 min-h-11 font-semibold text-amber-800 underline underline-offset-2"
                    data-testid="partner-dpa-read-german"
                  >
                    {t(`${K}.readGerman`)}
                  </button>
                )}
              </div>

              {dpa.fallback && (
                <p className="text-sm text-muted-foreground" data-testid="partner-dpa-fallback">
                  {t(`${K}.fallbackNotice`)}
                </p>
              )}
              {switchFailed && (
                <p className="text-sm text-destructive" data-testid="partner-dpa-switch-failed">
                  {t(`${K}.loadFailed`)}
                </p>
              )}

              <section className="rounded-2xl border border-border p-4" lang={dpa.locale} dir={dpa.direction} data-testid="partner-dpa-text">
                <h3 className="text-lg font-bold text-foreground">{dpa.text.title}</h3>
                <div ref={textRef} className="mt-2">
                  {switching ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <DpaBody dpa={dpa} />
                  )}
                </div>
              </section>
            </>
          )}
        </ResponsiveDialogBody>
        {/* The signer's name, role, the declaration and Sign live together in the footer, always on screen. */}
        <ResponsiveDialogFooter className="flex-col gap-3 sm:flex-col sm:justify-start sm:space-x-0" data-testid="partner-dpa-footer">
          {dpa && !signed && !loading && !failed && (
            <div className="space-y-3 rounded-xl bg-amber-50/60 p-3" data-testid="partner-dpa-form">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dpa-signer-name">{t(`${K}.nameLabel`)}</Label>
                  <Input
                    id="dpa-signer-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    maxLength={MAX_SIGNER_NAME}
                    autoComplete="name"
                    className="h-11 text-base focus-visible:ring-amber-500"
                    data-testid="partner-dpa-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dpa-signer-role">{t(`${K}.roleLabel`)}</Label>
                  <Input
                    id="dpa-signer-role"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    maxLength={MAX_SIGNER_ROLE}
                    autoComplete="organization-title"
                    className="h-11 text-base focus-visible:ring-amber-500"
                    data-testid="partner-dpa-role"
                  />
                </div>
              </div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-foreground">
                <Checkbox
                  checked={declared}
                  onCheckedChange={(v) => setDeclared(v === true)}
                  data-testid="partner-dpa-declaration"
                  className="mt-0.5"
                />
                {declaration ? (
                  <span lang={dpa.locale} dir={dpa.direction} data-testid="partner-dpa-declaration-text">
                    {declaration}
                  </span>
                ) : (
                  <span data-testid="partner-dpa-declaration-text">{t(`${K}.fallbackDeclaration`, { legal_name: legalName })}</span>
                )}
              </label>
              {bindingDeclaration && bindingDeclaration !== declaration && (
                <p className="ps-7 text-xs text-muted-foreground" data-testid="partner-dpa-binding-declaration">
                  {t(`${K}.bindingDeclarationLabel`)}{' '}
                  <span lang={BINDING_DPA_LOCALE} dir="ltr">
                    {bindingDeclaration}
                  </span>
                </p>
              )}
              <p className="ps-7 text-xs text-muted-foreground">{t(`${K}.signerHint`)}</p>
            </div>
          )}
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 flex-1 rounded-xl sm:flex-none">
              {t(`${K}.close`)}
            </Button>
            {dpa && !signed && (
              <Button
                onClick={() => void sign()}
                disabled={!ready || saving || switching || loading}
                data-testid="partner-dpa-sign"
                className="h-12 flex-1 rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800 sm:flex-none"
              >
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {t(`${K}.sign`)}
              </Button>
            )}
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
