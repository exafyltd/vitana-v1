import * as React from 'react';
import { Activity, CalendarCheck, Dna } from 'lucide-react';
import { VCard } from '@/components/ui/vcard';
import type { SpotlightGridRow } from '@/components/layout/spotlight';
import { pillarLabel, weakestPillar, type VitanaIndexState, type VitanaPillarKey } from '@/hooks/useVitanaIndex';
import type { AutopilotAction } from '@/types/autopilot';
import { fmtNumber } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { cardButtonProps } from './cardButtonProps';

const PILLAR_MAX = 200;
const ROW_MAX = 5;

/** The three pillar tiles of the grid, in reading order (plan D10). */
const TILE_PILLARS: VitanaPillarKey[] = ['sleep', 'exercise', 'nutrition'];

export interface HealthGridInput {
  /** The member's real Vitana Index; null → honest empty tiles, no invented numbers. */
  index: VitanaIndexState | null;
  /** `useAutopilot().pendingActions` — the real queue. */
  pendingActions: AutopilotAction[];
  /** Opens the Vitana Index sheet (pillar + trend tiles). */
  onOpenIndex: () => void;
  /** Opens the Autopilot pop-up (Today's plan tile + "Up next" cards). */
  onOpenAutopilot: () => void;
  /** Navigates (My Biology tile). */
  onNavigate: (to: string) => void;
}

function bar(pct: number) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}

function tileIcon(Icon: typeof Activity) {
  return <Icon className="h-4 w-4 text-primary" aria-hidden="true" />;
}

function pillarTile(key: VitanaPillarKey, index: VitanaIndexState | null, onOpenIndex: () => void) {
  const label = pillarLabel(key);
  const value = index ? index.pillars[key] ?? null : null;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, Math.round((value / PILLAR_MAX) * 100)));
  const button = cardButtonProps(onOpenIndex, label);
  return (
    <VCard
      key={`pillar-${key}`}
      size="standard"
      data-health-tile={key}
      {...button}
      className={cn(button.className, 'h-full')}
      eyebrow={label}
      title={
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tabular-nums text-foreground" data-health-tile-value="">
            {value == null ? '—' : fmtNumber(value)}
          </span>
          {value != null && <span className="text-xs font-medium text-muted-foreground">{t('profile.indexHero.ofMax', { max: PILLAR_MAX })}</span>}
        </span>
      }
      body={value == null ? <p>{t('spotlight.grid.emptyTiles')}</p> : bar(pct)}
    />
  );
}

function trendTile(index: VitanaIndexState | null, onOpenIndex: () => void) {
  const label = t('spotlight.grid.health.trend');
  const history = index?.history ?? [];
  const hasTrend = history.length >= 2;
  const max = hasTrend ? Math.max(...history.map((h) => h.score), 1) : 1;
  const line =
    index?.trend === 'up'
      ? t('vitanaIndexPage.hero.lineUp')
      : index?.trend === 'down'
        ? t('vitanaIndexPage.hero.lineDown')
        : t('vitanaIndexPage.hero.lineSteady');
  const button = cardButtonProps(onOpenIndex, label);
  return (
    <VCard
      key="trend"
      size="standard"
      data-health-tile="trend"
      {...button}
      className={cn(button.className, 'h-full')}
      eyebrow={label}
      title={
        <span className="text-2xl font-extrabold tabular-nums text-foreground" data-health-tile-value="">
          {hasTrend ? fmtNumber(history[history.length - 1].score) : '—'}
        </span>
      }
      body={
        hasTrend ? (
          <div className="flex flex-col gap-2">
            <span className="flex h-10 items-end gap-1" aria-hidden="true">
              {history.map((h) => (
                <span
                  key={h.date}
                  className="min-w-0 flex-1 rounded-sm bg-primary/70"
                  style={{ height: `${Math.max(8, Math.round((h.score / max) * 100))}%` }}
                />
              ))}
            </span>
            <p className="line-clamp-2">{line}</p>
          </div>
        ) : (
          <p>{t('spotlight.grid.emptyTiles')}</p>
        )
      }
    />
  );
}

function biologyTile(onNavigate: (to: string) => void) {
  const label = t('spotlight.grid.health.biology');
  const button = cardButtonProps(() => onNavigate('/health/my-biology'), label);
  return (
    <VCard
      key="biology"
      size="standard"
      data-health-tile="biology"
      {...button}
      className={cn(button.className, 'h-full')}
      eyebrow={tileIcon(Dna)}
      title={label}
      body={<p className="line-clamp-3">{t('spotlightTierB.health.biologyDescription')}</p>}
    />
  );
}

function todayPlanTile(pendingActions: AutopilotAction[], onOpenAutopilot: () => void) {
  const label = t('spotlight.grid.health.todayPlan');
  const first = pendingActions[0];
  const button = cardButtonProps(onOpenAutopilot, label);
  return (
    <VCard
      key="today-plan"
      size="standard"
      data-health-tile="today-plan"
      {...button}
      className={cn(button.className, 'h-full')}
      eyebrow={tileIcon(CalendarCheck)}
      title={label}
      meta={first ? t('screens.health.recommendedAction') : undefined}
      body={first ? <p className="line-clamp-3 text-foreground">{first.title}</p> : <p>{t('spotlight.grid.emptyTiles')}</p>}
    />
  );
}

/**
 * VTID-05419 — the six `standard` tiles of the /health Spotlight grid (contract
 * SR-31, plan D10), in reading order: Sleep, Movement, Nutrition (the member's
 * pillars), My Biology, 7-day trend, Today's plan. Real data only: no index →
 * "—" and the shared empty line, never a made-up number.
 */
export function healthGridTiles({ index, pendingActions, onOpenIndex, onOpenAutopilot, onNavigate }: HealthGridInput): React.ReactNode[] {
  return [
    ...TILE_PILLARS.map((key) => pillarTile(key, index, onOpenIndex)),
    biologyTile(onNavigate),
    trendTile(index, onOpenIndex),
    todayPlanTile(pendingActions, onOpenAutopilot),
  ];
}

/**
 * VTID-05419 — the "Up next · For you" row: the member's pending Autopilot
 * actions as `compact` cards, the next best action (the first one that lifts
 * the weakest pillar, as NextBestActionCard picks it) first. No actions → no
 * row (SpotlightGrid hides an empty row).
 */
export function healthUpNextRow({ index, pendingActions, onOpenAutopilot }: HealthGridInput): SpotlightGridRow | undefined {
  if (pendingActions.length === 0) return undefined;
  const weakest = index ? weakestPillar(index.pillars) : null;
  const best = weakest
    ? pendingActions.find((a) => {
        const v = a.contributionVector?.[weakest];
        return typeof v === 'number' && v > 0;
      })
    : undefined;
  const ordered = best ? [best, ...pendingActions.filter((a) => a !== best)] : pendingActions;
  return {
    title: t('spotlight.grid.health.upNext'),
    items: ordered.slice(0, ROW_MAX).map((action) => {
      const button = cardButtonProps(onOpenAutopilot, action.title);
      return (
        <VCard
          key={action.id}
          size="compact"
          data-health-up-next={action.id}
          {...button}
          className={cn(button.className, 'h-full')}
          title={
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{action.icon}</span>
              <span className="min-w-0">{action.title}</span>
            </span>
          }
          meta={action.reason}
        />
      );
    }),
  };
}
