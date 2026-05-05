/**
 * Members > Invitations tab
 *
 * List pending/accepted/revoked invitations. "Invite member" button opens
 * an inline form with email + role picker. Revoke pending invitations.
 */

import { useState } from "react";
import { Plus, Copy, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from "@/hooks/useAdminMembers";
import { notifyError, notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

const AVAILABLE_ROLES = ["community", "patient", "professional", "staff", "admin"];

export default function MembersInvitations() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["community"]);

  const invitationsQuery = useInvitations(statusFilter !== "all" ? statusFilter : undefined);
  const createMutation = useCreateInvitation();
  const revokeMutation = useRevokeInvitation();

  const invitations = invitationsQuery.data || [];

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleInvite() {
    if (!email || !email.includes("@")) {
      notifyError('toasts.admin.pleaseEnterValidEmailAddress2');
      return;
    }
    if (selectedRoles.length === 0) {
      notifyError('toasts.admin.selectAtLeastOneRole');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({ email, roles: selectedRoles });
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setSelectedRoles(["community"]);
      setShowForm(false);

      // Copy accept URL to clipboard
      if (result?.invitation?.token) {
        const acceptUrl = `${window.location.origin}/admin/invitations/accept/${result.invitation.token}`;
        await navigator.clipboard.writeText(acceptUrl).catch(() => {});
        notifyInfo('toasts.admin.acceptLinkCopiedClipboard');
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create invitation");
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeMutation.mutateAsync(id);
      notifySuccess('toasts.admin.invitationRevoked');
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invitation");
    }
  }

  function getStatus(inv: any): { label: string; variant: "active" | "warning" | "error" | "inactive" } {
    if (inv.revoked_at) return { label: "Revoked", variant: "error" };
    if (inv.accepted_at) return { label: "Accepted", variant: "active" };
    if (new Date(inv.expires_at) < new Date()) return { label: "Expired", variant: "inactive" };
    return { label: "Pending", variant: "warning" };
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="members" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="✉️"
          title={t('screens.admin.invitations')}
          description="Invite new members to your tenant by email"
          rightAction={
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('screens.admin.inviteMember')}
            </Button>
          }
        />

        {/* Invite form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('screens.admin.newInvitation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('screens.admin.email')}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('screens.admin.rolesGrant')}</Label>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleInvite}
                  disabled={createMutation.isPending}
                  size="sm"
                >
                  {createMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  {t('screens.admin.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <AdminFilterBar
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder=""
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: "All statuses",
              options: [
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "accepted", label: "Accepted" },
                { value: "revoked", label: "Revoked" },
              ],
            },
          ]}
        />

        {invitationsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingInvitations')}</p>
        )}

        {!invitationsQuery.isLoading && invitations.length === 0 && (
          <AdminEmptyState
            title={t('screens.admin.noInvitationsYet')}
            description="Click 'Invite Member' above to send your first invitation."
            actionLabel="Invite Member"
            onAction={() => setShowForm(true)}
          />
        )}

        {invitations.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.email')}</TableHead>
                  <TableHead>{t('screens.admin.roles')}</TableHead>
                  <TableHead>{t('screens.admin.status')}</TableHead>
                  <TableHead>{t('screens.admin.created')}</TableHead>
                  <TableHead>{t('screens.admin.expires')}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const st = getStatus(inv);
                  const isPending = !inv.accepted_at && !inv.revoked_at && new Date(inv.expires_at) >= new Date();
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inv.roles.map((r) => (
                            <AdminStatusBadge key={r} variant="info">{r}</AdminStatusBadge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge variant={st.variant}>{st.label}</AdminStatusBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revokeMutation.isPending}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
