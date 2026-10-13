/**
 * Commerce Partner Onboarding, Phase 3 (VTID-03936) — an explicit
 * "not available yet" state for a `/patient/*` route with no backing data
 * source (appointments, care-team, goals, insurance, notifications: no
 * table/relationship exists for any of these). Deliberately NOT fabricated
 * data — replaces the previous bare title-only placeholder with an honest
 * one instead of pretending the screen is finished.
 *
 * VTID-05117: with Spotlight on, the same honest state renders inside
 * `<ScreenFrame>` — `workspace` for the professional/staff routes (operator
 * screens), `collection` for the member `/patient/*` routes, matching each
 * route's archetype in src/design/screen-manifest.json. Flag off: unchanged.
 */
import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { t } from '@/lib/i18n-toast';
import { PatientComingSoonSpotlight } from '@/components/spotlight/member/PatientSpotlight';

export function ComingSoonPlaceholder({ icon: Icon, titleKey }: { icon: LucideIcon; titleKey: string }) {
  const spotlight = useSpotlightEnabled();
  const { pathname } = useLocation();

  const body = (
    <>
      <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        <Icon className="h-10 w-10 opacity-50" />
        <p className="font-medium">{t('screens.patient.comingSoon.title')}</p>
        <p className="max-w-sm text-sm">{t('screens.patient.comingSoon.body')}</p>
      </div>
    </>
  );

  // Member /patient/* routes: the collection frame (7.5a). Operator placeholders: the workspace frame (7.5b).
  if (spotlight && pathname.startsWith('/patient')) return <PatientComingSoonSpotlight titleKey={titleKey} Icon={Icon} />;
  if (spotlight) {
    return (
      <AppLayout>
        <ScreenFrame archetype="workspace">{body}</ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">{body}</div>
    </AppLayout>
  );
}
