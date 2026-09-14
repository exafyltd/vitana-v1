/** One connected business in the portal list (VTID-03882). */
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
  if (state === 'active') return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
  if (state === 'revoked' || state === 'failed') return 'border-red-400/40 bg-red-400/10 text-red-300';
  if (state === 'certified') return 'border-amber-400/40 bg-amber-400/10 text-amber-300';
  return 'border-slate-600/60 bg-slate-800/60 text-slate-300';
};

export function ConnectionCard({ row, onOpen }: { row: ConnectionRow; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      aria-label={`${row.name} — ${t('screens.commerceportal.openWorkbench')}`}
      className="group w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-start transition-colors hover:border-amber-500/40 hover:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{row.name}</p>
          <p className="truncate text-xs text-slate-500">
            {row.connector_id} · {row.provider_id}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${badgeTone(row.state)}`}>
          {stateLabel(row.state)}
        </Badge>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-amber-400 rtl:rotate-180" />
      </div>

      <ConnectionProgress state={row.state} className="mt-4" />

      <p className="mt-3 text-[11px] text-slate-600">{fmtDateTime(new Date(row.updated_at))}</p>
    </button>
  );
}
