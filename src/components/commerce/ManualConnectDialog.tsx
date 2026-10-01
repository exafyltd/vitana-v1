/**
 * "Connect your system" (VTID-03882, simplified in VTID-04796).
 *
 * A supplier sees one question: the address of their shop, product database
 * or API, and "Check connection". The storefront sniff (VTID-03601, read-only
 * on the gateway) does the rest:
 *   - Recognised platform (Shopify, WooCommerce, Magento, BigCommerce) →
 *     "Shopify detected" and one "Connect" button. The connection is created
 *     for the registered business through POST /partner-onboarding/:orgId/
 *     connections, which takes the business name and the jurisdiction (the
 *     business's country) from the business itself — the supplier never types
 *     a connector ID, provider ID or jurisdiction.
 *   - Not recognised → "I have API documentation" (opens Developer settings
 *     with the OpenAPI upload) or "I need help connecting" (Support).
 * Advanced / Developer settings keeps every capability the old form had:
 * connector ID, provider ID, OpenAPI (upload a file or paste it), and — only
 * for someone without a registered business, where nothing can be derived —
 * the business name and jurisdiction, through the original
 * POST /vcaop/portal/my/connections. Nothing existing integrations use moved.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, FileUp, LifeBuoy, Loader2, Search } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API, PARTNER_ONBOARDING_API } from '@/lib/commerce-host';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { BusinessContext } from '@/components/commerce/BusinessContext';
import { t, notify, notifyError } from '@/lib/i18n-toast';

const EMPTY_FORM = { name: '', connector_id: '', provider_id: '', jurisdiction: '', openapi: '' };

const fieldClass = 'h-12 text-base focus-visible:ring-amber-700';

type Detection = { connector_id: string; provider_id: string | null; name_hint: string | null };

/** Parse a pasted/uploaded OpenAPI document; null when empty, throws on invalid JSON. */
export function parseOpenApi(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;
  const doc = JSON.parse(raw);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('not an object');
  return doc;
}

export function ManualConnectDialog({
  open,
  onOpenChange,
  onCreated,
  org = null,
  orgs = [],
  onSelectOrg,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
  /** The registered business to connect (VTID-04796); without one, the developer form asks for name + jurisdiction. */
  org?: MyOrgRow | null;
  /** All businesses the user administers — with several, the dialog offers a selector. */
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [detected, setDetected] = useState<Detection | null>(null);
  const [notDetected, setNotDetected] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [openapiError, setOpenapiError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setStoreUrl('');
    setDetected(null);
    setNotDetected(false);
    setDevOpen(false);
    setForm(EMPTY_FORM);
    setOpenapiError(false);
  }, [open]);

  const detect = async () => {
    let url = storeUrl.trim();
    if (!url) return;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    setDetecting(true);
    setDetected(null);
    setNotDetected(false);
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/connections/detect-platform`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      if (res.connector_id) {
        let hostname = url;
        try {
          hostname = new URL(url).hostname;
        } catch {
          // url already passed the gateway's own parse — this is defensive only.
        }
        setDetected({ connector_id: res.connector_id, provider_id: res.provider_id ?? null, name_hint: res.name_hint ?? null });
        // The developer form starts from what was found, for anyone who opens it.
        setForm((f) => ({
          ...f,
          connector_id: res.connector_id,
          provider_id: res.provider_id ?? f.provider_id,
          name: f.name || (res.name_hint ? `${res.name_hint} (${hostname})` : f.name),
        }));
      } else {
        setNotDetected(true);
      }
    } catch {
      setNotDetected(true);
    } finally {
      setDetecting(false);
    }
  };

  const createFor = async (connector_id: string, provider_id: string, openapi_document: Record<string, unknown> | null) => {
    setCreating(true);
    try {
      if (org) {
        await adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/connections`, {
          method: 'POST',
          body: JSON.stringify({ connector_id, provider_id, ...(openapi_document ? { openapi_document } : {}) }),
        });
      } else {
        await adminFetch(`${MY_PORTAL_API}/connections`, {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            connector_id,
            provider_id,
            jurisdiction: form.jurisdiction.trim() || undefined,
            openapi_document: openapi_document ?? undefined,
          }),
        });
      }
      notify('screens.commerceportal.connect.created');
      onOpenChange(false);
      await onCreated();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setCreating(false);
    }
  };

  const connectDetected = () => {
    if (!detected?.provider_id) {
      setDevOpen(true);
      return;
    }
    void createFor(detected.connector_id, detected.provider_id, null);
  };

  const createFromDeveloper = () => {
    let doc: Record<string, unknown> | null;
    try {
      doc = parseOpenApi(form.openapi);
      setOpenapiError(false);
    } catch {
      setOpenapiError(true);
      return;
    }
    void createFor(form.connector_id.trim(), form.provider_id.trim(), doc);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setForm((f) => ({ ...f, openapi: text }));
    setOpenapiError(false);
  };

  const devValid =
    !!form.connector_id.trim() && !!form.provider_id.trim() && (org ? true : !!form.name.trim());

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile className="max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="text-2xl font-bold">{t('screens.commerceportal.connect.title')}</ResponsiveDialogTitle>
          <p className="text-sm text-muted-foreground">{t('screens.commerceportal.connect.intro')}</p>
          <BusinessContext org={org} orgs={orgs} onSelectOrg={onSelectOrg} />
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4 md:mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="mc-url">{t('screens.commerceportal.connect.urlLabel')}</Label>
            <Input
              id="mc-url"
              value={storeUrl}
              onChange={(e) => {
                setStoreUrl(e.target.value);
                setDetected(null);
                setNotDetected(false);
              }}
              type="url"
              inputMode="url"
              dir="ltr"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={fieldClass}
            />
          </div>
          <Button
            type="button"
            onClick={() => void detect()}
            disabled={detecting || !storeUrl.trim()}
            data-testid="connect-check"
            className="h-12 w-full bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
          >
            {detecting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Search className="me-2 h-4 w-4" />}
            {t('screens.commerceportal.connect.check')}
          </Button>

          {detected && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4" data-testid="connect-detected">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {t('screens.commerceportal.connect.detected', { platform: detected.name_hint ?? detected.connector_id })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {org
                  ? t('screens.commerceportal.connect.detectedBody', { name: org.display_name })
                  : t('screens.commerceportal.connect.detectedNoOrg')}
              </p>
              {org && (
                <Button
                  type="button"
                  onClick={connectDetected}
                  disabled={creating}
                  data-testid="connect-detected-go"
                  className="mt-3 h-12 w-full bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
                >
                  {creating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t('screens.commerceportal.connect.connect')}
                </Button>
              )}
            </div>
          )}

          {notDetected && (
            <div className="space-y-2" data-testid="connect-not-detected">
              <p className="text-sm text-muted-foreground">{t('screens.commerceportal.connect.notDetected')}</p>
              <button
                type="button"
                onClick={() => setDevOpen(true)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-border p-3 text-start font-medium text-foreground hover:border-amber-500/60"
              >
                <FileUp className="h-5 w-5 shrink-0 text-amber-700" />
                {t('screens.commerceportal.connect.haveDocs')}
              </button>
              <Link
                to="/support"
                onClick={() => onOpenChange(false)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-border p-3 font-medium text-foreground hover:border-amber-500/60"
              >
                <LifeBuoy className="h-5 w-5 shrink-0 text-amber-700" />
                {t('screens.commerceportal.connect.needHelp')}
              </Link>
            </div>
          )}

          {/* ADVANCED / DEVELOPER SETTINGS — every field the old form had. */}
          <section className="border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setDevOpen((o) => !o)}
              aria-expanded={devOpen}
              data-testid="connect-developer"
              className="flex min-h-11 w-full items-center justify-between text-start text-sm font-semibold text-foreground"
            >
              {t('screens.commerceportal.connect.developer')}
              <ChevronDown className={`h-4 w-4 transition-transform ${devOpen ? 'rotate-180' : ''}`} />
            </button>
            {devOpen && (
              <div className="mt-2 space-y-3">
                {!org && (
                  <>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={t('screens.partnerportal.businessName')}
                      aria-label={t('screens.partnerportal.businessName')}
                      className={fieldClass}
                    />
                    <Input
                      value={form.jurisdiction}
                      onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                      placeholder={t('screens.partnerportal.jurisdiction')}
                      aria-label={t('screens.partnerportal.jurisdiction')}
                      className={fieldClass}
                    />
                  </>
                )}
                <Input
                  id="mc-connector"
                  value={form.connector_id}
                  onChange={(e) => setForm((f) => ({ ...f, connector_id: e.target.value }))}
                  placeholder={t('screens.partnerportal.connectorId')}
                  aria-label={t('screens.partnerportal.connectorId')}
                  className={fieldClass}
                />
                <Input
                  value={form.provider_id}
                  onChange={(e) => setForm((f) => ({ ...f, provider_id: e.target.value }))}
                  placeholder={t('screens.partnerportal.providerId')}
                  aria-label={t('screens.partnerportal.providerId')}
                  className={fieldClass}
                />
                {org && (
                  <p className="text-xs text-muted-foreground">
                    {t('screens.commerceportal.connect.jurisdictionFromBusiness')}
                  </p>
                )}
                <div className="space-y-1.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => void onFile(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="h-11 w-full"
                  >
                    <FileUp className="me-2 h-4 w-4" />
                    {t('screens.commerceportal.connect.uploadOpenapi')}
                  </Button>
                  <Textarea
                    value={form.openapi}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, openapi: e.target.value }));
                      setOpenapiError(false);
                    }}
                    placeholder={t('screens.commerceportal.connect.pasteOpenapi')}
                    aria-label={t('screens.commerceportal.connect.pasteOpenapi')}
                    rows={4}
                    dir="ltr"
                    className="font-mono text-xs focus-visible:ring-amber-700"
                  />
                  <p className={`text-xs ${openapiError ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {openapiError
                      ? t('screens.commerceportal.connect.openapiInvalid')
                      : t('screens.partnerportal.openapiHint')}
                  </p>
                </div>
                <Button
                  className="h-12 w-full bg-amber-700 font-semibold text-white hover:bg-amber-800"
                  onClick={createFromDeveloper}
                  disabled={creating || !devValid}
                >
                  {creating ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('screens.partnerportal.creating')}
                    </>
                  ) : (
                    t('screens.partnerportal.create')
                  )}
                </Button>
              </div>
            )}
          </section>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
