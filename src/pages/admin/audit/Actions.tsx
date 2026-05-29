/**
 * Audit & Compliance > Admin Actions — audit trail of admin operations
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditActions } from "@/hooks/useAdminAudit";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
const ACTION_TYPES = ["All", "create", "update", "delete", "invite", "grant", "revoke"] as const;

export default function AuditActions() {
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const query = useAuditActions({
    action: actionFilter === "All" ? undefined : actionFilter,
    limit: 100,
  });
  const allActions = query.data || [];
  const actions = search
    ? allActions.filter((a) => a.action.includes(search) || a.target_resource.includes(search))
    : allActions;

  return (
    <AppLayout>
      <AdminTabs sectionKey="audit" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="📝"
          title={t('screens.admin.adminActions')}
          description="Audit trail of all administrative operations performed in your tenant"
        />

        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search actions..."
          filters={[
            {
              placeholder: "Action Type",
              value: actionFilter,
              options: ACTION_TYPES.map((t) => ({ label: t, value: t })),
              onChange: setActionFilter,
            },
          ]}
        />

        {query.isLoading && (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('screens.admin.loadingAuditActions')}</p>
        )}

        {!query.isLoading && actions.length === 0 && (
          <AdminEmptyState title={t('screens.admin.noAuditActions')} description="Admin actions will appear here as they occur." />
        )}

        {actions.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.admin.time')}</TableHead>
                  <TableHead>{t('screens.admin.actor')}</TableHead>
                  <TableHead>{t('screens.admin.action')}</TableHead>
                  <TableHead>{t('screens.admin.target')}</TableHead>
                  <TableHead>{t('screens.admin.changes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {fmtDateTime(new Date(a.created_at))}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {a.actor_user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm font-medium">{a.action}</TableCell>
                    <TableCell className="text-sm">{a.target_resource}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {a.before_state || a.after_state
                        ? `${a.before_state ? "before" : ""} ${a.before_state && a.after_state ? "/" : ""} ${a.after_state ? "after" : ""}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
