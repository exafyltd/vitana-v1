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
  if (state === 'active') return 'border-status-success/40 bg-status-success-subtle text-status-success';
  if (state === 'revoked' || state === 'failed') return 'border-status-error/40 bg-status-error-subtle text-status-error';
  if (state === 'certified') return 'border-status-warning/40 bg-status-warning-subtle text-status-warning';
  return 'border-border bg-muted text-muted-foreground';
};

export function ConnectionCard({ row, onOpen }: { row: ConnectionRow; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      aria-label={`${row.name} — ${t('screens.commerceportal.openWorkbench')}`}
      className="group w-full rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-primary/30 hover:bg-accent/60"
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
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:rotate-180" />
      </div>

      <ConnectionProgress state={row.state} className="mt-4" />

      <p className="mt-3 text-[11px] text-muted-foreground">{fmtDateTime(new Date(row.updated_at))}</p>
    </button>
  );
}
