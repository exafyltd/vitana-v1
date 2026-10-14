import { Bot, Compass, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VCard, VCardSkeleton } from '@/components/ui/vcard';
import { useVitanaIndexCache } from '@/components/health/VitanaIndexProvider';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';
import { localizeGoal } from '@/lib/goalLabel';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import type { MyJourneyGoal, MyJourneyJourney } from '@/hooks/useMyJourney';
import { journeyProgressLabel, motivationKey } from './journey-model';

/**
 * VTID-05117 — My Journey (/autopilot) on the Spotlight `dashboard` archetype.
 *
 * `JourneyHero` is the one `spotlight` card of the screen (SR-06): the member's
 * goal and how far along it is, built only from the real `useMyJourney()`
 * response (no ring placeholder numbers, SR-24). Without a goal it is a
 * text-only spotlight card that invites the member to set one.
 * `JourneyRail` holds compact cards only (SR-08).
 */

export function JourneyHero({
  goal,
  journey,
  loading,
  error,
  onSetGoal,
  onRetry,
  onOpenPlan,
}: {
  goal: MyJourneyGoal | null;
  journey: MyJourneyJourney | null;
  loading: boolean;
  error: boolean;
  onSetGoal: () => void;
  onRetry: () => void;
  onOpenPlan: () => void;
}) {
  if (loading && !goal) return <VCardSkeleton size="spotlight" />;

  if (error && !goal) {
    return (
      <VCard
        size="spotlight"
        eyebrow={t('spotlightMember.journey.eyebrow')}
        title={t('screens.autopilotdashboard.journeyLoadErrorTitle')}
        body={t('screens.autopilotdashboard.journeyLoadErrorBody')}
        actions={
          <Button variant="outline" onClick={onRetry}>
            {t('screens.autopilotdashboard.retry')}
          </Button>
        }
        data-journey-hero="error"
      />
    );
  }

  if (!goal) {
    return (
      <VCard
        size="spotlight"
        eyebrow={t('spotlightMember.journey.eyebrow')}
        title={t('screens.autopilotdashboard.setGoalTitle')}
        body={t('screens.autopilotdashboard.setGoalSubtitle')}
        actions={
          <Button className="gap-2" onClick={onSetGoal}>
            <Compass className="size-4" aria-hidden="true" />
            {t('screens.autopilotdashboard.setGoalCta')}
          </Button>
        }
        data-journey-hero="no-goal"
      />
    );
  }

  return (
    <VCard
      size="spotlight"
      eyebrow={t('spotlightMember.journey.eyebrow')}
      title={<span className="text-2xl">{localizeGoal(goal.active_goal_text)}</span>}
      meta={journeyProgressLabel(goal, journey) ?? undefined}
      body={t(motivationKey())}
      actions={
        <>
          <Button onClick={onOpenPlan}>{t('screens.autopilotdashboard.openPlan')}</Button>
          <Button variant="outline" onClick={onSetGoal}>
            {t('screens.autopilotdashboard.adjustGoalCta')}
          </Button>
        </>
      }
      data-journey-hero="goal"
    />
  );
}

function IndexCompactCard() {
  const { index } = useVitanaIndexCache();
  const total = index?.total ?? null;
  const tier = index?.tier ?? null;
  const open = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));
  return (
    <VCard
      size="compact"
      eyebrow={t('screens.autopilotdashboard.yourIndex')}
      title={
        <button type="button" onClick={open} className="text-start hover:text-primary focus-visible:underline focus-visible:outline-none" aria-label={t('screens.autopilotdashboard.openIndexDrawerAria')}>
          {total === null ? t('spotlightMember.journey.indexPending') : fmtNumber(total)}
        </button>
      }
      meta={tier ? t(tier.labelKey) : undefined}
      badge={<Gauge className="size-5 text-primary" aria-hidden="true" />}
    />
  );
}

export function JourneyRail({ pendingCount, onOpenAutopilot }: { pendingCount: number; onOpenAutopilot: () => void }) {
  return (
    <>
      <VCard
        size="compact"
        eyebrow={t('screens.autopilotdashboard.autopilotCardTitle')}
        title={
          <button type="button" onClick={onOpenAutopilot} className="text-start hover:text-primary focus-visible:underline focus-visible:outline-none">
            {pendingCount > 0
              ? t('screens.autopilotdashboard.planStepsWaiting', { count: fmtNumber(pendingCount) })
              : t('screens.autopilotdashboard.planAllClear')}
          </button>
        }
        meta={t('screens.autopilotdashboard.autopilotCardSubtitle')}
        badge={<Bot className="size-5 text-primary" aria-hidden="true" />}
      />
      <IndexCompactCard />
    </>
  );
}
