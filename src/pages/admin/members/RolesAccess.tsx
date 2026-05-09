/**
 * Members > Roles & Access tab — THE CENTERPIECE
 *
 * Table of members × granted-roles matrix. Each member row shows colored
 * pills for their granted roles. Toggle pills to grant/revoke roles.
 * developer + infra are hidden unless caller is exafy_admin.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayAvatarUrl } from "@/lib/autoAvatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { useMembers, useGrantRole, useRevokeRole } from "@/hooks/useAdminMembers";
import { notifyError, t } from '@/lib/i18n-toast';

const TENANT_ADMIN_ROLES = ["community", "patient", "professional", "staff", "admin"];
const SUPER_ADMIN_ROLES = [...TENANT_ADMIN_ROLES, "developer", "infra"];

const ROLE_VARIANT: Record<string, "active" | "warning" | "error" | "inactive" | "info"> = {
  admin: "error",
  staff: "warning",
  professional: "info",
  patient: "active",
  community: "inactive",
  developer: "info",
  infra: "warning",
};

export default function MembersRolesAccess() {
  const [search, setSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantRole, setGrantRole] = useState<string>("");

  const { activeTenantId, isExafyAdmin } = useTenant();
  const membersQuery = useMembers({ query: search });
  const grantMutation = useGrantRole();
  const revokeMutation = useRevokeRole();

  const members = membersQuery.data || [];
  const availableRoles = isExafyAdmin ? SUPER_ADMIN_ROLES : TENANT_ADMIN_ROLES;

  async function handleGrant(userId: string, role: string) {
    if (!activeTenantId) return;
    try {
      await grantMutation.mutateAsync({ userId, tenantId: activeTenantId, role });
      toast.success(`Granted ${role} role`);
      setGrantUserId(null);
      setGrantRole("");
    } catch (err: any) {
      toast.error(err.message || "Failed to grant role");
    }
  }

  async function handleRevoke(userId: string, role: string) {
    if (!activeTenantId) return;
    if (role === "community") {
      notifyError('toasts.admin.cannotRevokeCommunityRoleItS');
      return;
    }
    try {
      await revokeMutation.mutateAsync({ userId, tenantId: activeTenantId, role });
      toast.success(`Revoked ${role} role`);
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke role");
    }
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="members" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🔐"
          title={t('screens.admin.rolesAccess')}
          description="Grant and revoke roles for tenant members. Each member sees only their granted roles in the role switcher."
        />

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by email..."
          onReset={() => setSearch("")}
        />

        {membersQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingMembers')}</p>
        )}

        {!membersQuery.isLoading && members.length === 0 && (
          <AdminEmptyState title={t('screens.admin.noMembersFound')} />
        )}

        {members.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>{t('screens.admin.member')}</TableHead>
                  <TableHead>{t('screens.admin.activeRole')}</TableHead>
                  <TableHead>{t('screens.admin.grantedRoles')}</TableHead>
                  <TableHead className="w-[200px]">{t('screens.admin.grantRole')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const grantedRoles = m.memberships
                    .filter((mb) => mb.tenant_id === activeTenantId)
                    .map((mb) => mb.active_role);
                  const isEditing = grantUserId === m.user_id;

                  return (
                    <TableRow key={m.user_id}>
                      <TableCell>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getDisplayAvatarUrl(m)} />
                          <AvatarFallback className="text-xs">
                            {(m.display_name || m.email || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{m.display_name || "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.email}</div>
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge variant={ROLE_VARIANT[m.active_role || ""] || "inactive"}>
                          {m.active_role || "none"}
                        </AdminStatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {grantedRoles.length > 0 ? (
                            grantedRoles.map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRevoke(m.user_id, role)}
                                disabled={role === "community" || revokeMutation.isPending}
                                className="group"
                                title={role === "community" ? "Cannot revoke community role" : `Click to revoke ${role}`}
                              >
                                <AdminStatusBadge
                                  variant={ROLE_VARIANT[role] || "inactive"}
                                  className={role !== "community" ? "group-hover:line-through group-hover:opacity-60 cursor-pointer" : ""}
                                >
                                  {role}
                                </AdminStatusBadge>
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Select value={grantRole} onValueChange={setGrantRole}>
                              <SelectTrigger className="h-7 text-xs w-[120px]">
                                <SelectValue placeholder={t('screens.admin.pickRole')} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles
                                  .filter((r) => !grantedRoles.includes(r))
                                  .map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={!grantRole || grantMutation.isPending}
                              onClick={() => handleGrant(m.user_id, grantRole)}
                            >{t('screens.admin.grant')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setGrantUserId(null); setGrantRole(""); }}
                            >{t('screens.admin.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setGrantUserId(m.user_id); setGrantRole(""); }}
                          >{t('screens.admin.grant2')}
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
