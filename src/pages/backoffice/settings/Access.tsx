/**
 * BackOffice › Settings › Access — ERP capability grants per member (VTID-03834)
 *
 * Cloned from admin/members/RolesAccess.tsx. Members come from the existing
 * admin members endpoint; grants come from /api/v1/backoffice/access; every
 * change goes through /api/v1/backoffice/access/grant|revoke (the browser never
 * writes erp_capability_grants). The gateway enforces who may grant; this screen
 * only reflects it (`can_manage_access` from /me).
 */
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import BackOfficeTabs from "@/components/backoffice/BackOfficeTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenant } from "@/hooks/useTenant";
import { useMembers } from "@/hooks/useAdminMembers";
import {
  useMyErpAccess,
  useErpAccessList,
  useGrantErpCapability,
  useRevokeErpCapability,
  isExplicitOnlyCapability,
} from "@/hooks/useBackOfficeAccess";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const CAPABILITY_VARIANT = (capability: string): "active" | "warning" | "error" | "inactive" | "info" => {
  if (capability === "erp.admin") return "error";
  if (isExplicitOnlyCapability(capability)) return "warning";
  if (capability.endsWith(".view")) return "inactive";
  if (/\.(pay|close|approve|sign)$/.test(capability)) return "error";
  return "info";
};

export default function BackOfficeSettingsAccess() {
  const [search, setSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantCapability, setGrantCapability] = useState<string>("");

  const { activeTenantId } = useTenant();
  const me = useMyErpAccess();
  const accessList = useErpAccessList();
  const membersQuery = useMembers({ query: search });
  const grantMutation = useGrantErpCapability();
  const revokeMutation = useRevokeErpCapability();

  const members = membersQuery.data || [];
  const catalog = accessList.data?.catalog ?? me.data?.catalog ?? [];
  const canManage = me.data?.can_manage_access === true;
  const grantsByUser = new Map((accessList.data?.users ?? []).map((u) => [u.user_id, u.capabilities]));

  async function handleGrant(userId: string, capability: string) {
    if (!activeTenantId) return;
    try {
      await grantMutation.mutateAsync({ userId, capability });
      notify("toasts.backoffice.capabilityGranted");
      setGrantUserId(null);
      setGrantCapability("");
    } catch {
      notifyError("toasts.backoffice.grantFailed");
    }
  }

  async function handleRevoke(userId: string, capability: string) {
    if (!activeTenantId) return;
    try {
      await revokeMutation.mutateAsync({ userId, capability });
      notify("toasts.backoffice.capabilityRevoked");
    } catch {
      notifyError("toasts.backoffice.revokeFailed");
    }
  }

  return (
    <AppLayout>
      <BackOfficeTabs sectionKey="settings" />
      <div className="p-6 space-y-4" data-screen-id="BO-060">
        <AdminHeader
          emoji="🔐"
          title={t("screens.backoffice.access.title")}
          description={t("screens.backoffice.access.description")}
        />

        {me.data && (
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
            <div className="font-medium mb-1">{t("screens.backoffice.access.mine")}</div>
            <div className="flex flex-wrap gap-1" dir="ltr">
              {me.data.capabilities.map((c) => (
                <AdminStatusBadge key={c} variant={CAPABILITY_VARIANT(c)}>{c}</AdminStatusBadge>
              ))}
            </div>
            {!canManage && (
              <p className="text-xs text-muted-foreground mt-2">{t("screens.backoffice.access.noManage")}</p>
            )}
          </div>
        )}

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("screens.backoffice.access.searchPlaceholder")}
          onReset={() => setSearch("")}
        />

        {(membersQuery.isLoading || accessList.isLoading) && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("screens.backoffice.access.loading")}</p>
        )}

        {!membersQuery.isLoading && members.length === 0 && (
          <AdminEmptyState title={t("screens.backoffice.access.empty")} />
        )}

        {members.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>{t("screens.backoffice.access.member")}</TableHead>
                  <TableHead>{t("screens.backoffice.access.role")}</TableHead>
                  <TableHead>{t("screens.backoffice.access.granted")}</TableHead>
                  <TableHead className="w-[260px]">{t("screens.backoffice.access.grant")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const granted = grantsByUser.get(m.user_id) ?? [];
                  const isEditing = grantUserId === m.user_id;
                  return (
                    <TableRow key={m.user_id}>
                      <TableCell>
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={m.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(m.display_name || m.email || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{m.display_name || "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono" dir="ltr">{m.email}</div>
                      </TableCell>
                      <TableCell>
                        <AdminStatusBadge variant="inactive">{m.active_role || "none"}</AdminStatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1" dir="ltr">
                          {granted.length > 0 ? (
                            granted.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => canManage && handleRevoke(m.user_id, c)}
                                disabled={!canManage || revokeMutation.isPending}
                                className="group"
                                title={canManage ? t("screens.backoffice.access.revokeHint") : undefined}
                              >
                                <AdminStatusBadge
                                  variant={CAPABILITY_VARIANT(c)}
                                  className={canManage ? "group-hover:line-through group-hover:opacity-60 cursor-pointer" : ""}
                                >
                                  {c}
                                </AdminStatusBadge>
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!canManage ? null : isEditing ? (
                          <div className="flex gap-1">
                            <Select value={grantCapability} onValueChange={setGrantCapability}>
                              <SelectTrigger className="h-7 text-xs w-[170px]" dir="ltr">
                                <SelectValue placeholder={t("screens.backoffice.access.pick")} />
                              </SelectTrigger>
                              <SelectContent>
                                {catalog
                                  .filter((c) => !granted.includes(c))
                                  .map((c) => (
                                    <SelectItem key={c} value={c}>
                                      <span dir="ltr">{c}</span>
                                      {isExplicitOnlyCapability(c) && (
                                        <span className="ms-2 text-xs text-muted-foreground">{t("screens.backoffice.access.explicitOnly")}</span>
                                      )}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={!grantCapability || grantMutation.isPending}
                              onClick={() => handleGrant(m.user_id, grantCapability)}
                            >
                              {t("screens.backoffice.access.grantAction")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setGrantUserId(null); setGrantCapability(""); }}
                            >
                              {t("screens.backoffice.access.cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setGrantUserId(m.user_id); setGrantCapability(""); }}
                          >
                            {t("screens.backoffice.access.grant")}
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
