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
 *
 * VTID-03989 (mobile): the two tables collapse into stacked cards below `md`
 * — same dual-render pattern `CommerceHealthOrders.tsx` uses — the invite
 * form stacks vertically, and an invite link is handed to the phone's own
 * share sheet (`navigator.share`) with clipboard as the fallback. The accept
 * URL is also rendered as selectable text on the mobile card, because the
 * clipboard API is unreliable inside the Appilix webview.
 */
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Loader2, Share2 } from 'lucide-react';
import { useOrgMembers, useOrgInvites, useCreateOrgInvite, type OrgInviteRow } from '@/hooks/useOrgMembers';
import { t, notifyError, notifySuccess } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';

const panelClass = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4';
const cardClass = 'rounded-xl border border-slate-800 bg-slate-950/50 p-3';
const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

// `org_admin` → `roleOrgAdmin`: split on the underscore, same as MyOrgCard's
// toPascal — the previous charAt/slice version produced `roleOrg_admin`, a
// key that does not exist, and the raw key leaked into the members list.
const roleLabel = (role: string) =>
  t(`screens.commerceportal.orgOnboarding.role${role.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`);

const ROLE_OPTIONS: OrgInviteRow['role'][] = ['org_admin', 'staff', 'professional'];

const acceptUrlFor = (token: string) => `${window.location.origin}/commerce/invites/${token}/accept`;

const canNativeShare = () => typeof (navigator as Navigator & { share?: unknown }).share === 'function';

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
      await navigator.clipboard.writeText(acceptUrlFor(created.token)).catch(() => {});
    } catch {
      notifyError('screens.commerceportal.orgOnboarding.inviteFailed');
    }
  };

  const copyInviteLink = async (inv: OrgInviteRow) => {
    await navigator.clipboard.writeText(acceptUrlFor(inv.token)).catch(() => {});
    notifySuccess('screens.commerceportal.orgOnboarding.inviteLinkCopied');
  };

  const shareInviteLink = async (inv: OrgInviteRow) => {
    const url = acceptUrlFor(inv.token);
    if (canNativeShare()) {
      try {
        await (navigator as Navigator & { share: (d: { url: string; title: string }) => Promise<void> }).share({
          url,
          title: t('screens.commerceportal.orgOnboarding.inviteCta'),
        });
        return;
      } catch (err) {
        // The user dismissed the sheet — not a failure, and not a copy either.
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await copyInviteLink(inv);
  };

  const pendingInvites = (invitesQuery.data ?? []).filter((inv) => !inv.accepted_at);

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
                <>
                  {/* Desktop: table */}
                  <div className="hidden md:block">
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
                  </div>

                  {/* Mobile: stacked cards */}
                  <div className="flex flex-col gap-2 md:hidden">
                    {membersQuery.data.map((m) => (
                      <div key={m.id} className={`${cardClass} flex items-center justify-between gap-3`}>
                        <Badge variant="outline" className="border-slate-600/60 text-slate-300">
                          {roleLabel(m.role)}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {t('screens.commerceportal.orgOnboarding.grantedAt', { date: fmtDate(new Date(m.granted_at)) })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={panelClass}>
            <h3 className="text-sm font-medium text-slate-100">
              {t('screens.commerceportal.orgOnboarding.inviteCta')}
            </h3>
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                aria-label={t('screens.commerceportal.orgOnboarding.inviteEmail')}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                className={`w-full md:min-w-[200px] md:flex-1 ${fieldClass}`}
              />
              <Select value={role} onValueChange={(v) => setRole(v as OrgInviteRow['role'])}>
                <SelectTrigger
                  aria-label={t('screens.commerceportal.orgOnboarding.inviteRole')}
                  className="w-full border-slate-700 bg-slate-950/70 text-slate-100 focus-visible:ring-amber-500 md:w-[160px]"
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
                className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 md:w-auto"
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
                ) : pendingInvites.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.noInvites')}</p>
                ) : (
                  <>
                    {/* Desktop: table */}
                    <div className="hidden md:block">
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
                          {pendingInvites.map((inv) => (
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
                    </div>

                    {/* Mobile: stacked cards */}
                    <div className="flex flex-col gap-2 md:hidden">
                      {pendingInvites.map((inv) => (
                        <div key={inv.id} className={cardClass}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-mono text-sm text-slate-300">{inv.email}</div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {t('screens.commerceportal.orgOnboarding.expiresAt', { date: fmtDate(new Date(inv.expires_at)) })}
                              </div>
                            </div>
                            <Badge variant="outline" className="shrink-0 border-slate-600/60 text-slate-300">
                              {roleLabel(inv.role)}
                            </Badge>
                          </div>
                          <p className="mt-2 select-all break-all font-mono text-[11px] leading-snug text-slate-500">
                            {acceptUrlFor(inv.token)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                            onClick={() => void shareInviteLink(inv)}
                          >
                            <Share2 className="me-1.5 h-4 w-4" />
                            {t('screens.commerceportal.orgOnboarding.shareInvite')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
