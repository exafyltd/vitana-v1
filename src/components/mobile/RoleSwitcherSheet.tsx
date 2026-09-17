/**
 * VTID-03993 — the mobile role ("mode") switcher: a bottom sheet listing the
 * Vitana roles this member holds. Presentational; the list and the write
 * come from useRoleSwitch(). Opened from the drawer header's role pill and
 * from the profile drawer's role badge.
 */
import { Check, Loader2 } from 'lucide-react';
import { ResponsivePopover, ResponsivePopoverContent } from '@/components/ui/responsive-popover';
import type { UserRole } from '@/hooks/useRole';
import { roleLabel } from '@/lib/role-labels';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

export function RoleSwitcherSheet({
  open,
  onOpenChange,
  availableRoles,
  activeRole,
  switching,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: UserRole[];
  activeRole: UserRole;
  switching: boolean;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <ResponsivePopover open={open} onOpenChange={onOpenChange}>
      <ResponsivePopoverContent title={t('screens.profile.switchRole')}>
        <p className="px-1 pb-2 text-xs text-muted-foreground">{t('screens.mobile.switchRoleHint')}</p>
        <div role="radiogroup" aria-label={t('screens.profile.switchRole')} className="flex flex-col gap-1">
          {availableRoles.map((role) => {
            const active = role === activeRole;
            return (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={switching}
                onClick={() => onSelect(role)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-sm transition-colors',
                  active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
                  switching && 'opacity-60',
                )}
              >
                <span>{roleLabel(role)}</span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : switching ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </button>
            );
          })}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
