/** One partner organization the caller belongs to, in the portal list (VTID-03936). */
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n-toast';

export interface MyOrgRow {
  id: string;
  org_key: string;
  display_name: string;
  org_type: string;
  status: string;
  role: string;
}

const statusLabel = (status: string) => t(`screens.commerceportal.orgOnboarding.status${toPascal(status)}`);
const roleLabel = (role: string) => t(`screens.commerceportal.orgOnboarding.role${toPascal(role)}`);

function toPascal(snake: string): string {
  return snake
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const statusTone = (status: string) => {
  if (status === 'active') return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';
  if (status === 'rejected' || status === 'suspended') return 'border-red-400/40 bg-red-400/10 text-red-300';
  return 'border-amber-400/40 bg-amber-400/10 text-amber-300';
};

export function MyOrgCard({ org, onManage }: { org: MyOrgRow; onManage: (id: string) => void }) {
  const canManage = org.role === 'org_admin';
  return (
    <button
      type="button"
      onClick={() => canManage && onManage(org.id)}
      disabled={!canManage}
      aria-label={canManage ? `${org.display_name} — ${t('screens.commerceportal.orgOnboarding.manageRoster')}` : org.display_name}
      className="group w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-start transition-colors enabled:hover:border-amber-500/40 enabled:hover:bg-slate-900 disabled:cursor-default"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-100">{org.display_name}</p>
          <p className="truncate text-xs text-slate-500">
            {org.org_type} · {roleLabel(org.role)}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusTone(org.status)}`}>
          {statusLabel(org.status)}
        </Badge>
        {canManage && (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-amber-400 rtl:rotate-180" />
        )}
      </div>
    </button>
  );
}
