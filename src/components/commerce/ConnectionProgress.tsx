/**
 * The four-step track a merchant reads at a glance (VTID-03882).
 *
 * Pure presentation over `connectionStepIndex()` — an off-track connection
 * (degraded/suspended/revoked/failed) renders no track at all, because drawing
 * a revoked connection at "75% to live" would be a lie the badge then
 * contradicts.
 *
 * RTL: the connector line uses `start`/`end` insets, never left/right.
 */
import { Check } from 'lucide-react';
import { CONNECTION_STEPS, connectionStepIndex, isConnectionLive } from '@/lib/partner-portal';
import { t } from '@/lib/i18n-toast';

const STEP_LABELS: Record<(typeof CONNECTION_STEPS)[number], string> = {
  connect: 'screens.commerceportal.progress.connect',
  mapping: 'screens.commerceportal.progress.mapping',
  tests: 'screens.commerceportal.progress.tests',
  live: 'screens.commerceportal.progress.live',
};

export function ConnectionProgress({ state, className = '' }: { state: string; className?: string }) {
  const active = connectionStepIndex(state);

  if (active === null) {
    return (
      <p className={`text-xs text-slate-500 ${className}`}>{t('screens.commerceportal.progress.offTrack')}</p>
    );
  }

  const live = isConnectionLive(state);

  return (
    <ol className={`flex items-center gap-1.5 ${className}`}>
      {CONNECTION_STEPS.map((step, i) => {
        // The final step only counts as DONE once the connection is actually
        // serving. `certified` sits on it, waiting on platform approval.
        const done = i < active || (i === active && live);
        const current = i === active && !live;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={[
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                done
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : current
                    ? 'border-amber-400 text-amber-300'
                    : 'border-slate-700 text-slate-600',
              ].join(' ')}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={`truncate text-[11px] ${done || current ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {t(STEP_LABELS[step])}
            </span>
            {i < CONNECTION_STEPS.length - 1 && (
              <span
                aria-hidden
                className={`hidden h-px flex-1 sm:block ${i < active ? 'bg-amber-400/60' : 'bg-slate-700/70'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
