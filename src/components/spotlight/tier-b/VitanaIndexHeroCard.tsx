import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { VCard, VCardSkeleton } from '@/components/ui/vcard';
import { pillarKeys, pillarLabel, type VitanaIndexState } from '@/hooks/useVitanaIndex';
import { fmtDate, fmtNumber } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

const INDEX_MAX = 999;
const PILLAR_MAX = 200;

/**
 * VTID-05111 — the one `spotlight` card of the Health and Vitana Index
 * dashboards (contract SR-06): the member's real Vitana Index, its trend and
 * the five pillars. Nothing is invented: no index → the "first step" line and
 * no pillar bars; loading → the spotlight skeleton.
 */
export function VitanaIndexHeroCard({
  index,
  isLoading,
  actions,
  onOpen,
  openLabel,
  showPillars = true,
}: {
  index: VitanaIndexState | null;
  isLoading: boolean;
  actions?: React.ReactNode;
  /** Makes the whole card open something (e.g. the Index sheet). */
  onOpen?: () => void;
  openLabel?: string;
  /** Off where the screen shows its own pillar breakdown below the card. */
  showPillars?: boolean;
}) {
  if (isLoading && !index) return <VCardSkeleton size="spotlight" />;

  const trend = index?.trend;
  const line = !index
    ? t('vitanaIndexPage.hero.lineNoIndex')
    : trend === 'up'
      ? t('vitanaIndexPage.hero.lineUp')
      : trend === 'down'
        ? t('vitanaIndexPage.hero.lineDown')
        : t('vitanaIndexPage.hero.lineSteady');

  const interactive = onOpen
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': openLabel,
        onClick: (e: React.MouseEvent) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          onOpen();
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        },
      }
    : {};

  return (
    <VCard
      size="spotlight"
      data-testid="spotlight-vitana-index-hero"
      className={cn(onOpen && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      eyebrow={t('vitanaIndexPage.hero.eyebrow')}
      title={
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-extrabold tabular-nums text-foreground" data-testid="spotlight-vitana-index-score">
            {index ? fmtNumber(index.total) : '—'}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{t('profile.indexHero.ofMax', { max: INDEX_MAX })}</span>
          {index?.tier && <span className="text-sm font-semibold text-primary">{t(index.tier.labelKey)}</span>}
          {trend === 'up' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-success-subtle px-2.5 py-0.5 text-xs font-semibold text-status-success">
              <TrendingUp className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
              {t('vitanaIndexPage.hero.trendUp')}
            </span>
          )}
          {trend === 'down' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-warning-subtle px-2.5 py-0.5 text-xs font-semibold text-status-warning">
              <TrendingDown className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
              {t('vitanaIndexPage.hero.trendDown')}
            </span>
          )}
        </span>
      }
      meta={index?.lastUpdated ? t('vitanaIndexPage.hero.updated', { date: fmtDate(index.lastUpdated, { day: 'numeric', month: 'long' }) }) : undefined}
      body={
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">{line}</p>
          {index && showPillars && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2" aria-label={t('spotlightTierB.health.pillarsAria')}>
              {pillarKeys().map((key) => {
                const value = index.pillars[key] ?? 0;
                const pct = Math.max(0, Math.min(100, Math.round((value / PILLAR_MAX) * 100)));
                return (
                  <li key={key} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{pillarLabel(key)}</span>
                    <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-10 shrink-0 text-end text-xs font-semibold tabular-nums text-foreground">{fmtNumber(value)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      }
      actions={actions}
      {...interactive}
    />
  );
}
