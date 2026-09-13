/** BackOffice › Sales & CRM › Follow-ups (BO-008) — VTID-03855, Read tier: CRM tasks (`crm.task.list`) and activities (`crm.activity.list`). */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { fullTextMatch, isTaskOverdue, type ErpActivity, type ErpCrmTask } from "@/lib/backoffice-sales";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { DraftCommandButton } from "@/components/backoffice/DraftCommandDialog";

const CAPS = ["crm.view"] as const;

export default function BackOfficeFollowUps() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const tasks = useErpRead<{ crm_tasks?: ErpCrmTask[] }>("crm.task.list", { limit: 100 }, { enabled });
  const activities = useErpRead<{ activities?: ErpActivity[] }>("crm.activity.list", { limit: 100 }, { enabled });
  const taskRows = (tasks.data?.result?.crm_tasks ?? []).filter((x) => (status === "all" || x.status === status) && fullTextMatch(search, x.subject, x.description, x.priority));
  const activityRows = (activities.data?.result?.activities ?? []).filter((a) => fullTextMatch(search, a.subject, a.activity_type, a.description));

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-008" emoji="📌" title={t("screens.backoffice.sales.followups.title")} description={t("screens.backoffice.sales.followups.description")} capabilities={CAPS} rightAction={<div className="flex flex-wrap gap-2"><DraftCommandButton formId="task" /><DraftCommandButton formId="activity" /></div>}>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.sales.followups.searchPlaceholder")}
        filters={[{ value: status, onChange: setStatus, placeholder: t("screens.backoffice.sales.common.status"), options: [{ value: "all", label: t("screens.backoffice.common.all") }, ...["open", "completed", "cancelled"].map((s) => ({ value: s, label: t(`screens.backoffice.sales.status.${s}`) }))] }]}
        onReset={() => { setSearch(""); setStatus("open"); }}
      />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.followups.tasks")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: me.isLoading || tasks.isLoading, error: tasks.error, isEmpty: taskRows.length === 0, emptyTitle: t("screens.backoffice.sales.followups.noTasks"), rows: 3 }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.followups.subject")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.followups.priority")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.followups.due")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.followups.links")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskRows.map((x) => {
                    const overdue = isTaskOverdue(x);
                    return (
                      <TableRow key={x.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{x.subject}</div>
                          {x.description && <div className="text-xs text-muted-foreground">{x.description}</div>}
                        </TableCell>
                        <TableCell><DocStatusBadge status={x.priority} /></TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {x.due_date ? fmtDate(x.due_date, { dateStyle: "medium" }) : "—"}
                          {overdue && <AdminStatusBadge variant="error" className="ms-2">{t("screens.backoffice.sales.status.overdue")}</AdminStatusBadge>}
                        </TableCell>
                        <TableCell><DocStatusBadge status={x.status} /></TableCell>
                        <TableCell className="text-xs">{fmtNumber(x.linked_count ?? 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={tasks.data?.command} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.followups.activities")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: me.isLoading || activities.isLoading, error: activities.error, isEmpty: activityRows.length === 0, emptyTitle: t("screens.backoffice.sales.followups.noActivities"), rows: 3 }) ?? (
            <ol className="space-y-2">
              {activityRows.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <div className="w-24 shrink-0 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(a.activity_date, { dateStyle: "medium" })}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge variant="inactive">{a.activity_type}</AdminStatusBadge>
                      <span className="font-medium">{a.subject}</span>
                    </div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                    <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                      {a.opportunity_id ? `${t("screens.backoffice.sales.followups.opportunity")} ${shortId(a.opportunity_id)}` : a.lead_id ? `${t("screens.backoffice.sales.leads.lead")} ${shortId(a.lead_id)}` : a.customer_id ? `${t("screens.backoffice.sales.contacts.customer")} ${shortId(a.customer_id)}` : ""}
                      {a.next_action_date ? ` · ${t("screens.backoffice.sales.followups.nextAction")} ${fmtDate(a.next_action_date, { dateStyle: "medium" })}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <DataSourceNote command={activities.data?.command} />
        </CardContent>
      </Card>
    </BackOfficePage>
  );
}
