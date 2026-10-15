/**
 * VTID-05221 — step 3 of the exafy-admin "New community" panel: renders
 * GET /api/v1/admin/tenants/:id/readiness (the only request this component
 * makes on its own). Every status is spoken as text, never colour only.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Info, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n-toast';
import {
  getTenantReadiness,
  TenantProvisioningError,
  type TenantReadiness,
} from '@/lib/tenant-provisioning-api';

const NS = 'tenantProvisioning.readiness';

const READINESS_QUERY_ROOT = ['tenant-provisioning', 'readiness'] as const;

/** Check keys computeReadiness() emits (gateway services/tenant-provisioning/readiness.ts). */
const KNOWN_CHECKS = new Set([
  'slug_valid_not_reserved',
  'path_url',
  'brand_colors',
  'assets_present',
  'legal_entity_line',
  'support_email',
  'sender',
  'locales_timezone_currency',
  'persona_facts.community_name',
  'instance_data',
  'first_admin',
  'open_signup',
]);

type Check = TenantReadiness['checks'][number];

function checkLabel(key: string): string {
  // i18n keys cannot contain the server's dotted key, so "a.b" → "a_b".
  return KNOWN_CHECKS.has(key) ? t(`${NS}.checks.${key.replace(/\./g, '_')}`) : t(`${NS}.checks.unknown`, { key });
}

function CheckRow({ check }: { check: Check }) {
  const state = check.informational ? 'info' : check.ok ? 'ok' : 'missing';
  const Icon = state === 'info' ? Info : state === 'ok' ? CheckCircle2 : XCircle;
  const tone = state === 'info' ? 'text-status-info' : state === 'ok' ? 'text-status-success' : 'text-status-error';
  return (
    <li className="flex items-start gap-3 py-2" data-testid={`readiness-check-${check.key}`} data-state={state}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{checkLabel(check.key)}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${tone}`}>{t(`${NS}.status.${state}`)}</span>
    </li>
  );
}

/**
 * `refreshSignal`: optional counter; each change re-reads readiness (the panel
 * bumps it after an asset upload).
 */
export function ReadinessChecklist({ tenantId, refreshSignal = 0 }: { tenantId: string; refreshSignal?: number }) {
  const query = useQuery({
    queryKey: [...READINESS_QUERY_ROOT, tenantId],
    queryFn: () => getTenantReadiness(tenantId),
    enabled: !!tenantId,
  });
  const { refetch } = query;
  useEffect(() => {
    if (refreshSignal > 0) void refetch();
  }, [refreshSignal, refetch]);
  const headingId = `readiness-heading-${tenantId}`;

  let body: React.ReactNode;
  if (query.isLoading) {
    body = (
      <div className="space-y-2" aria-busy="true" data-testid="readiness-loading">
        <span className="sr-only">{t(`${NS}.loading`)}</span>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  } else if (query.error) {
    const err = query.error;
    body = (
      <p role="alert" className="text-sm text-status-error" data-testid="readiness-error">
        {err instanceof TenantProvisioningError && err.i18nKey ? t(err.i18nKey) : t(`${NS}.loadFailed`)}
      </p>
    );
  } else if (query.data) {
    const data = query.data;
    const done = data.checks.filter((c) => !c.informational && c.ok).length;
    const total = data.checks.filter((c) => !c.informational).length;
    body = (
      <div className="space-y-3">
        <p
          className={`flex items-center gap-2 text-sm font-semibold ${data.ready ? 'text-status-success' : 'text-status-warning'}`}
          data-testid="readiness-summary"
          data-ready={data.ready ? 'true' : 'false'}
        >
          {data.ready ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
          {data.ready ? t(`${NS}.ready`) : t(`${NS}.notReady`, { done, total })}
        </p>
        {data.schema_missing && <p className="text-sm text-status-warning">{t(`${NS}.schemaMissing`)}</p>}
        {data.legacy && !data.schema_missing && <p className="text-sm text-muted-foreground">{t(`${NS}.legacy`)}</p>}
        <ul className="divide-y" aria-labelledby={headingId}>
          {data.checks.map((c) => (
            <CheckRow key={c.key} check={c} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3" data-testid="readiness-checklist">
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="text-base font-semibold">
          {t(`${NS}.title`)}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className="me-2 size-4" aria-hidden="true" />
          {t(`${NS}.refresh`)}
        </Button>
      </div>
      {body}
    </section>
  );
}
