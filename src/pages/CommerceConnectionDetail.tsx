/**
 * Commerce Portal — merchant connection detail (VTID-03555). Same workflow
 * presentation as the admin detail screen, over the owner-scoped /my surface
 * (VTID-03553) — with ONE deliberate difference: there is no activation
 * button. The gateway does not expose /approve-activation to merchants;
 * a certified connection shows "waiting for platform approval" instead.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { t, notifyError } from '@/lib/i18n-toast';
import { stateBadgeVariant } from '@/lib/partner-portal';
import { MY_PORTAL_API } from '@/lib/commerce-host';

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

export default function CommerceConnectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, p, a] = await Promise.all([
        adminFetch(`${MY_PORTAL_API}/connections/${id}`),
        adminFetch(`${MY_PORTAL_API}/connections/${id}/mapping-preview`),
        adminFetch(`${MY_PORTAL_API}/connections/${id}/activation-summary`),
      ]);
      setDetail(d.data);
      setPreview(p.data);
      setActivation(a.data);
    } catch {
      notifyError('screens.partnerportal.loadFailed');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (key: string, path: string, init?: RequestInit) => {
    setBusy(key);
    try {
      await adminFetch(`${MY_PORTAL_API}/connections/${id}${path}`, { method: 'POST', ...init });
      await load();
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

  if (!detail) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const state = detail.state;
  const canTest = state === 'mapping' || state === 'testing' || state === 'approval_required' || state === 'failed';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/commerce/connections')}
          aria-label={t('screens.commerceportal.connectionsTitle')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-foreground">{detail.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {detail.connector_id} · {detail.provider_id}
          </p>
        </div>
        <Badge variant={stateBadgeVariant(state)}>{stateLabel(state)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('screens.partnerportal.mappingPreview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview?.pipeline_status === 'awaiting_specification' ? (
            <p className="text-sm text-muted-foreground">{t('screens.partnerportal.awaitingSpec')}</p>
          ) : preview && preview.mappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('screens.partnerportal.awaitingFactory')}</p>
          ) : preview ? (
            <>
              {preview.pending_review.length > 0 && (
                <p className="text-sm font-medium text-foreground">
                  {t('screens.partnerportal.pendingReview', { count: preview.pending_review.length })}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3">{t('screens.partnerportal.sourceField')}</th>
                      <th className="py-2 pr-3">{t('screens.partnerportal.canonicalField')}</th>
                      <th className="py-2 pr-3">{t('screens.partnerportal.confidence')}</th>
                      <th className="py-2 pr-3">{t('screens.partnerportal.decidedBy')}</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {preview.mappings.map((m) => (
                      <tr key={m.id} className="border-b border-border/50">
                        <td className="py-2 pr-3">
                          {m.source_schema}.{m.source_field}
                          {m.sensitive && (
                            <Badge variant="outline" className="ml-2">
                              {t('screens.partnerportal.sensitive')}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {m.canonical_entity}.{m.canonical_field}
                        </td>
                        <td className="py-2 pr-3">{Math.round(m.confidence * 100)}%</td>
                        <td className="py-2 pr-3">{m.decided_by}</td>
                        <td className="py-2">
                          {preview.pending_review.includes(m.id) && (
                            <span className="flex gap-1">
                              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void decide(m.id, 'approve')}>
                                {t('screens.partnerportal.approve')}
                              </Button>
                              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void decide(m.id, 'reject')}>
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
            <Button variant="secondary" disabled={busy !== null} onClick={() => void act('test', '/sandbox-tests')}>
              {busy === 'test' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('screens.partnerportal.runningTests')}
                </>
              ) : (
                t('screens.partnerportal.runSandboxTests')
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('screens.partnerportal.activationSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activation?.certification && (
            <p className="text-sm text-muted-foreground">
              {t('screens.partnerportal.certification')}: {activation.certification.status}
              {activation.version ? ` · v${activation.version}` : ''}
            </p>
          )}
          {activation?.awaiting_platform_approval ? (
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              {t('screens.commerceportal.awaitingApproval')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('screens.commerceportal.activationHint')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {state === 'active' && (
              <Button variant="outline" disabled={busy !== null} onClick={() => void act('pause', '/pause')}>
                {t('screens.partnerportal.pause')}
              </Button>
            )}
            {state === 'suspended' && (
              <Button variant="outline" disabled={busy !== null} onClick={() => void act('resume', '/resume')}>
                {t('screens.partnerportal.resume')}
              </Button>
            )}
            {state === 'active' && (
              <Button variant="outline" disabled={busy !== null} onClick={() => void act('reauthorize', '/reauthorize')}>
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
        </CardContent>
      </Card>
    </div>
  );
}
