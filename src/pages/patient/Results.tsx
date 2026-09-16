/**
 * Commerce Partner Onboarding, Phase 3 (VTID-03936) — "your results across
 * every partner and professional." Real data: `GET /api/v1/patient/health-
 * results` via `usePatientHealthResults.ts`, joining `lab_reports` +
 * `biomarker_results` with best-effort org attribution.
 *
 * Card/list pattern follows `src/pages/health/MyBiology.tsx`'s established
 * `HorizontalCardList`/`StandardHorizontalCardProps` usage — but with a
 * properly typed API response (see the hook's own header comment for why
 * that matters here specifically).
 */
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, FlaskConical, Loader2 } from 'lucide-react';
import { usePatientHealthResults, type PatientHealthResult } from '@/hooks/usePatientHealthResults';
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';

function orgLabel(result: PatientHealthResult): string {
  if (!result.org) return t('screens.patient.results.selfReported');
  return result.org.self_registered_name ?? result.org.display_name ?? t('screens.patient.results.selfReported');
}

function isAbnormal(status: string | null): boolean {
  return status === 'low' || status === 'high' || status === 'critical';
}

function statusLabel(status: string | null): string {
  if (!status) return t('screens.patient.results.statusUnknown');
  return t(`screens.patient.results.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

function buildCards(results: PatientHealthResult[], onOpen: (r: PatientHealthResult) => void): StandardHorizontalCardProps[] {
  return results.map((r) => {
    const abnormalCount = r.biomarkers.filter((b) => isAbnormal(b.status)).length;
    return {
      id: r.id,
      screenId: 'patient-health-results',
      icon: <FlaskConical className="h-5 w-5" />,
      title: t('screens.patient.results.markerCount', { count: r.biomarkers.length }),
      description: orgLabel(r),
      badges: abnormalCount > 0
        ? [{ label: t('screens.patient.results.needsAttention', { count: abnormalCount }), variant: 'destructive' as const }]
        : [{ label: t('screens.patient.results.allNormal'), variant: 'secondary' as const }],
      timestamp: r.report_date ? formatDate(new Date(r.report_date), 'MMM dd, yyyy') : formatDate(new Date(r.created_at), 'MMM dd, yyyy'),
      onClick: () => onOpen(r),
    };
  });
}

export default function PatientResults() {
  const { data: results, isLoading, isError, refetch } = usePatientHealthResults();
  const [openResult, setOpenResult] = useState<PatientHealthResult | null>(null);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('screens.patient.results.title')}</h1>
          <p className="text-muted-foreground">{t('screens.patient.results.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm text-muted-foreground">{t('screens.patient.results.loadFailed')}</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
              {t('screens.patient.results.retry')}
            </button>
          </div>
        ) : (
          <HorizontalCardList
            items={buildCards(results ?? [], setOpenResult)}
            variant="standard"
            screenId="patient-health-results"
            groupBy="none"
            gap="md"
            emptyState={
              <div className="text-center py-16 text-muted-foreground">
                <FlaskConical className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="font-medium">{t('screens.patient.results.empty')}</p>
              </div>
            }
          />
        )}
      </div>

      <Dialog open={openResult !== null} onOpenChange={(open) => !open && setOpenResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openResult ? orgLabel(openResult) : ''}</DialogTitle>
          </DialogHeader>
          {openResult && (
            openResult.biomarkers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('screens.patient.results.noBiomarkers')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('screens.patient.results.biomarker')}</TableHead>
                    <TableHead>{t('screens.patient.results.value')}</TableHead>
                    <TableHead>{t('screens.patient.results.range')}</TableHead>
                    <TableHead>{t('screens.patient.results.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openResult.biomarkers.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.name ?? b.biomarker_code}</TableCell>
                      <TableCell>{b.value != null ? `${b.value} ${b.unit ?? ''}`.trim() : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.ref_range_low != null && b.ref_range_high != null ? `${b.ref_range_low}–${b.ref_range_high}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isAbnormal(b.status) ? 'destructive' : 'secondary'}>{statusLabel(b.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
