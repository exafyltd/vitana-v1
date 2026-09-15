/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — an org_admin's
 * roster drawer: members table + invite form + pending-invites table.
 *
 * Opened from `?org=<id>` on `CommercePortal.tsx` (same deep-linkable-drawer
 * pattern `ConnectionWorkbench.tsx` already uses for `?connection=<id>`).
 * The invite form/table is a near-literal port of `Invitations.tsx`'s
 * email/role-picker/table/copy-link UI, restyled to this drawer's dark
 * slate/amber palette; the members table is new (Phase 1 had no admin UI
 * for `partner_organization_members` at all).
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Loader2 } from 'lucide-react';
import { useOrgMembers, useOrgInvites, useCreateOrgInvite, type OrgInviteRow } from '@/hooks/useOrgMembers';
import { t, notifyError, notifySuccess } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';

const panelClass = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4';
const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

const roleLabel = (role: string) => t(`screens.commerceportal.orgOnboarding.role${role.charAt(0).toUpperCase()}${role.slice(1)}`);

const ROLE_OPTIONS: OrgInviteRow['role'][] = ['org_admin', 'staff', 'professional'];

export function PartnerOrgRoster({ orgId, orgName, onClose }: { orgId: string; orgName?: string; onClose: () => void }) {
  const membersQuery = useOrgMembers(orgId);
  const invitesQuery = useOrgInvites(orgId);
  const createInvite = useCreateOrgInvite(orgId);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgInviteRow['role']>('staff');

  const invite = async () => {
    try {
      const created = await createInvite.mutateAsync({ email: email.trim(), role });
      setEmail('');
      notifySuccess('screens.commerceportal.orgOnboarding.inviteSent');
      const acceptUrl = `${window.location.origin}/commerce/invites/${created.token}/accept`;
      await navigator.clipboard.writeText(acceptUrl).catch(() => {});
    } catch {
      notifyError('screens.commerceportal.orgOnboarding.inviteFailed');
    }
  };

  const copyInviteLink = async (inv: OrgInviteRow) => {
    const acceptUrl = `${window.location.origin}/commerce/invites/${inv.token}/accept`;
    await navigator.clipboard.writeText(acceptUrl).catch(() => {});
    notifySuccess('screens.commerceportal.orgOnboarding.inviteLinkCopied');
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="truncate pe-8 text-slate-100">
            {orgName
              ? t('screens.commerceportal.orgOnboarding.rosterTitle', { org: orgName })
              : t('screens.commerceportal.orgOnboarding.membersTitle')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className={panelClass}>
            <h3 className="text-sm font-medium text-slate-100">
              {t('screens.commerceportal.orgOnboarding.membersTitle')}
            </h3>
            <div className="mt-3">
              {membersQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                </div>
              ) : membersQuery.isError ? (
                <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.membersLoadFailed')}</p>
              ) : !membersQuery.data || membersQuery.data.length === 0 ? (
                <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.noMembers')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-500">{t('screens.commerceportal.orgOnboarding.inviteRole')}</TableHead>
                      <TableHead className="text-slate-500">{t('screens.commerceportal.orgOnboarding.memberSinceHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersQuery.data.map((m) => (
                      <TableRow key={m.id} className="border-slate-800/60">
                        <TableCell>
                          <Badge variant="outline" className="border-slate-600/60 text-slate-300">
                            {roleLabel(m.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{fmtDate(new Date(m.granted_at))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className={panelClass}>
            <h3 className="text-sm font-medium text-slate-100">
              {t('screens.commerceportal.orgOnboarding.inviteCta')}
            </h3>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                aria-label={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                type="email"
                className={`min-w-[200px] flex-1 ${fieldClass}`}
              />
              <Select value={role} onValueChange={(v) => setRole(v as OrgInviteRow['role'])}>
                <SelectTrigger
                  aria-label={t('screens.commerceportal.orgOnboarding.inviteRole')}
                  className="w-[160px] border-slate-700 bg-slate-950/70 text-slate-100 focus-visible:ring-amber-500"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                disabled={createInvite.isPending || !email.trim()}
                onClick={() => void invite()}
              >
                {createInvite.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('screens.commerceportal.orgOnboarding.inviteSending')}
                  </>
                ) : (
                  t('screens.commerceportal.orgOnboarding.inviteSend')
                )}
              </Button>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t('screens.commerceportal.orgOnboarding.invitesTitle')}
              </h4>
              <div className="mt-2">
                {invitesQuery.isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  </div>
                ) : invitesQuery.isError ? (
                  <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.invitesLoadFailed')}</p>
                ) : !invitesQuery.data || invitesQuery.data.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.noInvites')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-500">{t('screens.commerceportal.orgOnboarding.inviteEmail')}</TableHead>
                        <TableHead className="text-slate-500">{t('screens.commerceportal.orgOnboarding.inviteRole')}</TableHead>
                        <TableHead className="text-slate-500">{t('screens.commerceportal.orgOnboarding.expiresAtHeader')}</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitesQuery.data
                        .filter((inv) => !inv.accepted_at)
                        .map((inv) => (
                          <TableRow key={inv.id} className="border-slate-800/60">
                            <TableCell className="font-mono text-sm text-slate-300">{inv.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-slate-600/60 text-slate-300">
                                {roleLabel(inv.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">{fmtDate(new Date(inv.expires_at))}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                onClick={() => void copyInviteLink(inv)}
                                aria-label={t('screens.commerceportal.orgOnboarding.copyInviteLink')}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
