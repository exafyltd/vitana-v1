/** One connected business in the portal list (VTID-03882). */
import { platformName } from '@/lib/commerce-platforms';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConnectionProgress } from './ConnectionProgress';
import { t } from '@/lib/i18n-toast';
import { fmtDateTime } from '@/lib/locale-format';

export interface ConnectionRow {
  id: string;
  name: string;
  connector_id: string;
  provider_id: string;
  state: string;
  jurisdiction?: string | null;
  updated_at: string;
}

const stateLabel = (state: string) => t(`screens.partnerportal.states.${state}`);

const badgeTone = (state: string) => {
  if (state === 'active') return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300';
  if (state === 'revoked' || state === 'failed') return 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300';
  if (state === 'certified') return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-700';
  return 'border-border bg-muted text-muted-foreground';
};

export function ConnectionCard({ row, onOpen }: { row: ConnectionRow; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      aria-label={`${row.name} — ${t('screens.commerceportal.openWorkbench')}`}
      className="group w-full rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-amber-600/50 hover:bg-amber-50/60 dark:hover:bg-amber-950/20"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {platformName(row.connector_id) ?? t('screens.commerceportal.connect.customApi')}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${badgeTone(row.state)}`}>
          {stateLabel(row.state)}
        </Badge>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-700 rtl:rotate-180" />
      </div>

      <ConnectionProgress state={row.state} className="mt-4" />

      <p className="mt-3 text-[11px] text-muted-foreground">{fmtDateTime(new Date(row.updated_at))}</p>
    </button>
  );
}
