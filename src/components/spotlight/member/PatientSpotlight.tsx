import type { LucideIcon } from 'lucide-react';
import { FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { ScreenFrame } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { Button } from '@/components/ui/button';
import { usePatientHealthResults } from '@/hooks/usePatientHealthResults';
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import { MEMBER_ROWS, SpotlightEmpty, SpotlightError, SpotlightRowsSkeleton } from './MemberSpotlight';

/**
 * VTID-05117 — the /patient/* screens on the Spotlight `collection` archetype.
 *
 * Only real data is shown (SR-24): the member's health results from
 * `usePatientHealthResults()`. Screens that have no data source yet (care
 * team, goals, insurance, notifications — and the sample appointments and
 * vital signs of the legacy pages) show the honest "not available yet" state.
 */

/** The honest "not available yet" state, pointing to the real results. */
export function PatientComingSoonBody({ Icon }: { Icon: LucideIcon }) {
  const navigate = useNavigate();
  return (
    <SpotlightEmpty
      Icon={Icon}
      titleKey="screens.patient.comingSoon.title"
      descriptionKey="screens.patient.comingSoon.body"
      actionKey="screens.patient.results.viewAll"
      onAction={() => navigate('/patient/results')}
    />
  );
}

/** A whole coming-soon screen (used by the shared ComingSoonPlaceholder). */
export function PatientComingSoonSpotlight({ titleKey, Icon }: { titleKey: string; Icon: LucideIcon }) {
  return (
    <AppLayout>
      <ScreenFrame archetype="collection" header={{ title: t(titleKey), description: t('screens.patient.comingSoon.title') }}>
        <PatientComingSoonBody Icon={Icon} />
      </ScreenFrame>
    </AppLayout>
  );
}

/** The member's latest results as row cards (dashboard), real data only. */
export function RecentResultsRows({ limit = 3 }: { limit?: number }) {
  const navigate = useNavigate();
  const { data: results, isLoading, isError, refetch } = usePatientHealthResults();
  if (isLoading) return <SpotlightRowsSkeleton count={limit} />;
  if (isError) return <SpotlightError onRetry={() => refetch()} />;
  const recent = (results ?? []).slice(0, limit);
  if (recent.length === 0) return <SpotlightEmpty Icon={FlaskConical} titleKey="screens.patient.results.empty" />;
  return (
    <div className="flex flex-col gap-3">
      <ul className={MEMBER_ROWS}>
        {recent.map((r) => (
          <VCard
            key={r.id}
            as="li"
            size="row"
            badge={<FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />}
            title={t('screens.patient.results.markerCount', { count: r.biomarkers.length })}
            meta={formatDate(new Date(r.report_date ?? r.created_at), 'd MMM yyyy')}
          />
        ))}
      </ul>
      <div>
        <Button variant="outline" onClick={() => navigate('/patient/results')}>
          {t('screens.patient.results.viewAll')}
        </Button>
      </div>
    </div>
  );
}
