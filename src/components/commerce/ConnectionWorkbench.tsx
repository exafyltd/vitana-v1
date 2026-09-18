/**
 * The whole of the old `pages/CommerceConnectionDetail.tsx`, as a drawer on the
 * one portal screen (VTID-03882). Same gateway calls, same owner-scoped `/my`
 * surface, same deliberate omission: there is NO activation button, because the
 * gateway does not expose `/approve-activation` to merchants — a certified
 * connection waits on the platform's single approval.
 *
 * Opened from the `?connection=<id>` search param, so a connection stays
 * deep-linkable and Back closes the drawer instead of leaving the portal.
 */
import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API } from '@/lib/commerce-host';
import { t, notifyError } from '@/lib/i18n-toast';
import { ConnectionProgress } from './ConnectionProgress';

interface Mapping {
  id: string;
  source_schema: string;
  source_field: string;
  canonical_entity: string;
  canonical_field: string;
  confidence: number;
  decided_by: string;
  sensitive: boolean;
}

interface Detail {
  id: string;
  name: string;
  connector_id: string;
  provider_id: string;
  state: string;
}

interface Preview {
  state: string;
  pipeline_status: string;
  mappings: Mapping[];
  pending_review: string[];
}

interface Activation {
  state: string;
  version: string | null;
  certification: { status: string; test_results?: Record<string, unknown> } | null;
  awaiting_platform_approval: boolean;
}

const stateLabel = (state: string) => t(`screens.partnerportal.states.${state}`);
const fieldClass = 'focus-visible:ring-amber-700';
const panelClass = 'rounded-2xl border border-border bg-card p-4';

export function ConnectionWorkbench({
  connectionId,
  onClose,
  onChanged,
}: {
  connectionId: string | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [fhirBaseUrl, setFhirBaseUrl] = useState('');
  const [fhirClientId, setFhirClientId] = useState('');
  const [fhirClientSecret, setFhirClientSecret] = useState('');
  const [fhirScope, setFhirScope] = useState('');
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    if (!connectionId) return;
    try {
      const [d, p, a] = await Promise.all([
        adminFetch(`${MY_PORTAL_API}/connections/${connectionId}`),
        adminFetch(`${MY_PORTAL_API}/connections/${connectionId}/mapping-preview`),
        adminFetch(`${MY_PORTAL_API}/connections/${connectionId}/activation-summary`),
      ]);
      setDetail(d.data);
      setPreview(p.data);
      setActivation(a.data);
    } catch {
      notifyError('screens.partnerportal.loadFailed');
    }
  }, [connectionId]);

  useEffect(() => {
    // Clear first: without this the drawer briefly shows the PREVIOUS
    // connection's mapping table while the new one loads.
    setDetail(null);
    setPreview(null);
    setActivation(null);
    void load();
  }, [load]);

  const act = async (key: string, path: string, init?: RequestInit) => {
    setBusy(key);
    try {
      await adminFetch(`${MY_PORTAL_API}/connections/${connectionId}${path}`, { method: 'POST', ...init });
      await load();
      await onChanged();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setBusy(null);
    }
  };

  const decide = (mappingId: string, decision: 'approve' | 'reject') =>
    act(`decide-${mappingId}`, '/mapping-decisions', {
      body: JSON.stringify({ mapping_id: mappingId, decision }),
    });

  // Track 2 (VTID-03603) / Track 3 (VTID-03605): kicks off the connector's
  // OAuth flow and redirects the browser to the returned authorize_url — both
  // connectors are dormant server-side until an operator configures real
  // credentials, so a not_configured response is expected today.
  const connectOauth = async (path: string, body: Record<string, unknown>) => {
    setConnecting(true);
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/connections/${connectionId}${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res?.data?.authorize_url) {
        window.location.href = res.data.authorize_url;
        return;
      }
      notifyError('screens.commerceportal.connectOauth.failed');
    } catch (err) {
      if (err instanceof Error && err.message === 'not_configured') {
        notifyError('screens.commerceportal.connectOauth.notConfigured');
      } else {
        notifyError('screens.commerceportal.connectOauth.failed');
      }
    } finally {
      setConnecting(false);
    }
  };

  const state = detail?.state ?? '';
  const canTest = state === 'mapping' || state === 'testing' || state === 'approval_required' || state === 'failed';
  const needsOauthConnect =
    (state === 'discovered' || state === 'authorization_required') &&
    (detail?.connector_id === 'shopify' || detail?.connector_id === 'smart_fhir');

  return (
    <Sheet open={connectionId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-background text-foreground sm:max-w-2xl"
      >
        {!detail ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="text-start">
              <SheetTitle className="truncate pe-8 text-foreground">{detail.name}</SheetTitle>
              <p className="truncate text-xs text-muted-foreground">
                {detail.connector_id} · {detail.provider_id}
              </p>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className={panelClass}>
                <div className="flex items-center justify-between gap-2">
                  <ConnectionProgress state={state} className="min-w-0 flex-1" />
                  <Badge variant="outline" className="shrink-0 border-border text-foreground">
                    {stateLabel(state)}
                  </Badge>
                </div>
              </div>

              {needsOauthConnect && (
                <div className={panelClass}>
                  <h3 className="text-sm font-medium text-foreground">
                    {t('screens.commerceportal.connectOauth.title')}
                  </h3>
                  {detail.connector_id === 'shopify' && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-muted-foreground">{t('screens.commerceportal.connectOauth.shopifyHint')}</p>
                      <Input
                        value={shopDomain}
                        onChange={(e) => setShopDomain(e.target.value)}
                        placeholder={t('screens.commerceportal.connectOauth.shopifyDomainPlaceholder')}
                        aria-label={t('screens.commerceportal.connectOauth.shopifyDomainPlaceholder')}
                        className={fieldClass}
                      />
                      <Button
                        className="bg-amber-700 font-semibold text-white hover:bg-amber-800"
                        disabled={connecting || !shopDomain.trim()}
                        onClick={() => void connectOauth('/shopify/authorize', { shop: shopDomain.trim() })}
                      >
                        {connecting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                        {connecting
                          ? t('screens.commerceportal.connectOauth.connecting')
                          : t('screens.commerceportal.connectOauth.shopifyButton')}
                      </Button>
                    </div>
                  )}
                  {detail.connector_id === 'smart_fhir' && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-muted-foreground">{t('screens.commerceportal.connectOauth.fhirHint')}</p>
                      <Input
                        value={fhirBaseUrl}
                        onChange={(e) => setFhirBaseUrl(e.target.value)}
                        placeholder={t('screens.commerceportal.connectOauth.fhirBaseUrlPlaceholder')}
                        aria-label={t('screens.commerceportal.connectOauth.fhirBaseUrlPlaceholder')}
                        type="url"
                        className={fieldClass}
                      />
                      <Input
                        value={fhirClientId}
                        onChange={(e) => setFhirClientId(e.target.value)}
                        placeholder={t('screens.commerceportal.connectOauth.fhirClientIdPlaceholder')}
                        aria-label={t('screens.commerceportal.connectOauth.fhirClientIdPlaceholder')}
                        className={fieldClass}
                      />
                      <Input
                        value={fhirClientSecret}
                        onChange={(e) => setFhirClientSecret(e.target.value)}
                        placeholder={t('screens.commerceportal.connectOauth.fhirClientSecretPlaceholder')}
                        aria-label={t('screens.commerceportal.connectOauth.fhirClientSecretPlaceholder')}
                        type="password"
                        className={fieldClass}
                      />
                      <Input
                        value={fhirScope}
                        onChange={(e) => setFhirScope(e.target.value)}
                        placeholder={t('screens.commerceportal.connectOauth.fhirScopePlaceholder')}
                        aria-label={t('screens.commerceportal.connectOauth.fhirScopePlaceholder')}
                        className={fieldClass}
                      />
                      <Button
                        className="bg-amber-700 font-semibold text-white hover:bg-amber-800"
                        disabled={connecting || !fhirBaseUrl.trim() || !fhirClientId.trim()}
                        onClick={() =>
                          void connectOauth('/fhir/authorize', {
                            fhir_base_url: fhirBaseUrl.trim(),
                            client_id: fhirClientId.trim(),
                            client_secret: fhirClientSecret.trim() || undefined,
                            scope: fhirScope.trim() || undefined,
                          })
                        }
                      >
                        {connecting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                        {connecting
                          ? t('screens.commerceportal.connectOauth.connecting')
                          : t('screens.commerceportal.connectOauth.fhirButton')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className={panelClass}>
                <h3 className="text-sm font-medium text-foreground">{t('screens.partnerportal.mappingPreview')}</h3>
                <div className="mt-3 space-y-3">
                  {preview?.pipeline_status === 'awaiting_specification' ? (
                    <p className="text-sm text-muted-foreground">{t('screens.partnerportal.awaitingSpec')}</p>
                  ) : preview && preview.mappings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('screens.partnerportal.awaitingFactory')}</p>
                  ) : preview ? (
                    <>
                      {preview.pending_review.length > 0 && (
                        <p className="text-sm font-medium text-amber-800">
                          {t('screens.partnerportal.pendingReview', { count: preview.pending_review.length })}
                        </p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-start text-xs text-muted-foreground">
                              <th className="py-2 pe-3 text-start">{t('screens.partnerportal.sourceField')}</th>
                              <th className="py-2 pe-3 text-start">{t('screens.partnerportal.canonicalField')}</th>
                              <th className="py-2 pe-3 text-start">{t('screens.partnerportal.confidence')}</th>
                              <th className="py-2 pe-3 text-start">{t('screens.partnerportal.decidedBy')}</th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {preview.mappings.map((m) => (
                              <tr key={m.id} className="border-b border-border/60 text-foreground">
                                <td className="py-2 pe-3">
                                  {m.source_schema}.{m.source_field}
                                  {m.sensitive && (
                                    <Badge variant="outline" className="ms-2 border-amber-300 bg-amber-50 text-amber-800">
                                      {t('screens.partnerportal.sensitive')}
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2 pe-3">
                                  {m.canonical_entity}.{m.canonical_field}
                                </td>
                                <td className="py-2 pe-3">{Math.round(m.confidence * 100)}%</td>
                                <td className="py-2 pe-3">{m.decided_by}</td>
                                <td className="py-2">
                                  {preview.pending_review.includes(m.id) && (
                                    <span className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-border bg-transparent text-foreground hover:bg-muted"
                                        disabled={busy !== null}
                                        onClick={() => void decide(m.id, 'approve')}
                                      >
                                        {t('screens.partnerportal.approve')}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground hover:bg-muted hover:text-foreground"
                                        disabled={busy !== null}
                                        onClick={() => void decide(m.id, 'reject')}
                                      >
                                        {t('screens.partnerportal.reject')}
                                      </Button>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}

                  {canTest && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="border-border bg-transparent text-foreground hover:bg-muted"
                        disabled={busy !== null}
                        onClick={() => void act('test', '/sandbox-tests')}
                      >
                        {busy === 'test' ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {t('screens.partnerportal.runningTests')}
                          </>
                        ) : (
                          t('screens.partnerportal.runSandboxTests')
                        )}
                      </Button>
                      {/* The gateway runs this in `gateway_dev_sandbox` mode with
                          contract_tests_executed hardcoded 0 — say so rather than
                          let a green state read as "we called your system". */}
                      <p className="text-xs text-muted-foreground">{t('screens.commerceportal.sandboxDevNote')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={panelClass}>
                <h3 className="text-sm font-medium text-foreground">{t('screens.partnerportal.activationSummary')}</h3>
                <div className="mt-3 space-y-3">
                  {activation?.certification && (
                    <p className="text-sm text-muted-foreground">
                      {t('screens.partnerportal.certification')}: {activation.certification.status}
                      {activation.version ? ` · v${activation.version}` : ''}
                    </p>
                  )}
                  {activation?.awaiting_platform_approval ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                      <Clock className="h-4 w-4" />
                      {t('screens.commerceportal.awaitingApproval')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('screens.commerceportal.activationHint')}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {state === 'active' && (
                      <Button
                        variant="outline"
                        className="border-border bg-transparent text-foreground hover:bg-muted"
                        disabled={busy !== null}
                        onClick={() => void act('pause', '/pause')}
                      >
                        {t('screens.partnerportal.pause')}
                      </Button>
                    )}
                    {state === 'suspended' && (
                      <Button
                        variant="outline"
                        className="border-border bg-transparent text-foreground hover:bg-muted"
                        disabled={busy !== null}
                        onClick={() => void act('resume', '/resume')}
                      >
                        {t('screens.partnerportal.resume')}
                      </Button>
                    )}
                    {state === 'active' && (
                      <Button
                        variant="outline"
                        className="border-border bg-transparent text-foreground hover:bg-muted"
                        disabled={busy !== null}
                        onClick={() => void act('reauthorize', '/reauthorize')}
                      >
                        {t('screens.partnerportal.reauthorize')}
                      </Button>
                    )}
                    {state !== 'revoked' && (
                      <Button
                        variant="destructive"
                        disabled={busy !== null}
                        onClick={() => {
                          if (window.confirm(t('screens.partnerportal.revokeConfirm'))) void act('revoke', '/revoke');
                        }}
                      >
                        {t('screens.partnerportal.revoke')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
