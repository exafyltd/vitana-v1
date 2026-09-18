/**
 * VTID-03993 — the mobile role ("mode") switcher: a bottom sheet listing the
 * Vitana roles this member holds. Presentational; the list and the write
 * come from useRoleSwitch(). Opened from the drawer header's role pill and
 * from the profile drawer's role badge.
 *
 * VTID-03999: a second group, "Dein Unternehmen", lists the businesses the
 * member belongs to with their business role (Org-Admin / Mitarbeiter /
 * Fachkraft). Picking one enters that business's area — a navigation, never
 * a role write (the two axes stay separate on purpose, see
 * lib/business-mode.ts). Exactly one entry across both groups is checked.
 */
import { useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsivePopover, ResponsivePopoverContent } from '@/components/ui/responsive-popover';
import type { UserRole } from '@/hooks/useRole';
import type { BusinessSwitchEntry } from '@/hooks/useRoleSwitch';
import { roleLabel } from '@/lib/role-labels';
import { businessRoleLabelKey } from '@/lib/business-mode';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

function EntryButton({
  active,
  switching,
  onClick,
  label,
  subtitle,
}: {
  active: boolean;
  switching: boolean;
  onClick: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={switching}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-start text-sm transition-colors',
        active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
        switching && 'opacity-60',
      )}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {subtitle && <span className="block truncate text-xs font-normal text-muted-foreground">{subtitle}</span>}
      </span>
      {active ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : switching ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      ) : null}
    </button>
  );
}

export function RoleSwitcherSheet({
  open,
  onOpenChange,
  availableRoles,
  activeRole,
  switching,
  onSelect,
  businessEntries = [],
  activeBusinessOrgId = null,
  onSelectBusiness,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: UserRole[];
  activeRole: UserRole;
  switching: boolean;
  onSelect: (role: UserRole) => void;
  businessEntries?: BusinessSwitchEntry[];
  activeBusinessOrgId?: string | null;
  onSelectBusiness?: (orgId: string) => void;
}) {
  // While in a business area the business entry is the checked one; the
  // Vitana mode is still the stored preference, but it is not what the app
  // is showing right now, so it must not claim the check mark as well.
  const inBusiness = activeBusinessOrgId !== null;
  const activeBusiness = inBusiness ? businessEntries.find((e) => e.orgId === activeBusinessOrgId) ?? null : null;
  const currentModeLabel = activeBusiness
    ? `${t(businessRoleLabelKey(activeBusiness.role))} · ${activeBusiness.orgName}`
    : roleLabel(activeRole);

  // VTID-03999: with the business group the list is long enough that its
  // last entry sits under the ORB button, which floats above every bottom
  // sheet — a tap on "Org-Admin · <business>" opened the ORB instead (seen in
  // the preview). `data-drawer-open` is the app's own switch for hiding the
  // bottom bar and the ORB while an overlay owns the screen
  // (MeetupDetailsDrawer uses it the same way).
  const isMobile = useIsMobile();
  useEffect(() => {
    if (!open || !isMobile) return;
    document.body.dataset.drawerOpen = 'true';
    return () => {
      delete document.body.dataset.drawerOpen;
    };
  }, [open, isMobile]);
  return (
    <ResponsivePopover open={open} onOpenChange={onOpenChange}>
      <ResponsivePopoverContent title={t('screens.profile.switchRole')}>
        {/* VTID-04041: name the active mode before the list, so the sheet
            states what is on now and not only what can be picked. */}
        <p className="px-1 pb-1 text-sm font-semibold text-foreground">
          {t('screens.mobile.currentModeIs', { role: currentModeLabel })}
        </p>
        <p className="px-1 pb-2 text-xs text-muted-foreground">{t('screens.mobile.switchRoleHint')}</p>
        <div role="radiogroup" aria-label={t('screens.profile.switchRole')} className="flex flex-col gap-1">
          {availableRoles.map((role) => (
            <EntryButton
              key={role}
              active={!inBusiness && role === activeRole}
              switching={switching}
              onClick={() => onSelect(role)}
              label={roleLabel(role)}
            />
          ))}
        </div>
        {businessEntries.length > 0 && (
          <>
            <p className="px-1 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('screens.mobile.businessModesTitle')}
            </p>
            <div role="radiogroup" aria-label={t('screens.mobile.businessModesTitle')} className="flex flex-col gap-1">
              {businessEntries.map((entry) => (
                <EntryButton
                  key={entry.orgId}
                  active={activeBusinessOrgId === entry.orgId}
                  switching={switching}
                  onClick={() => onSelectBusiness?.(entry.orgId)}
                  label={t(businessRoleLabelKey(entry.role))}
                  subtitle={entry.orgName}
                />
              ))}
            </div>
          </>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
