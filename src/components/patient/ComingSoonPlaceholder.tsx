/**
 * Commerce Partner Onboarding, Phase 3 (VTID-03936) — an explicit
 * "not available yet" state for a `/patient/*` route with no backing data
 * source (appointments, care-team, goals, insurance, notifications: no
 * table/relationship exists for any of these). Deliberately NOT fabricated
 * data — replaces the previous bare title-only placeholder with an honest
 * one instead of pretending the screen is finished.
 */
import type { LucideIcon } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { t } from '@/lib/i18n-toast';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { PatientComingSoonSpotlight } from '@/components/spotlight/member/PatientSpotlight';

export function ComingSoonPlaceholder({ icon: Icon, titleKey }: { icon: LucideIcon; titleKey: string }) {
  // VTID-05117 — Spotlight (desktop + flag): the same honest state inside the collection frame.
  const spotlight = useSpotlightEnabled();
  if (spotlight) return <PatientComingSoonSpotlight titleKey={titleKey} Icon={Icon} />;
  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Icon className="h-10 w-10 opacity-50" />
          <p className="font-medium">{t('screens.patient.comingSoon.title')}</p>
          <p className="max-w-sm text-sm">{t('screens.patient.comingSoon.body')}</p>
        </div>
      </div>
    </AppLayout>
  );
}
