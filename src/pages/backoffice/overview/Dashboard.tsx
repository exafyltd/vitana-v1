/**
 * BackOffice › Overview › Dashboard (BO-001) — VTID-03849, Read tier.
 * Counts come from the gateway's command/approval tables; ERP status from one
 * `erp.health.read` command. Quick access only lists sections the caller can use.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Inbox, CheckCircle2, XCircle, Activity as ActivityIcon } from "lucide-react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import CommandsTable from "@/components/backoffice/CommandsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBackOfficeContentSections, canUseBackOfficeSection } from "@/config/backoffice-navigation";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, useBackOfficeApprovals, useBackOfficeCommands, useErpRead } from "@/hooks/useBackOfficeCommands";
import { useTranslation } from "@/hooks/useTranslation";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

interface ErpStatus { status?: string; companies?: number; currencies?: number; uoms?: number; payment_terms?: number }

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function BackOfficeDashboard() {
  const { translate } = useTranslation();
  const me = useMyErpAccess();
  const caps = me.data?.capabilities ?? null;
  const anyCapability = !!me.data && (me.data.is_exafy_admin || me.data.capabilities.length > 0);
  const canHealth = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(caps, ["erp.admin", "audit.view"]));

  const approvals = useBackOfficeApprovals("pending", { enabled: anyCapability });
  const commands = useBackOfficeCommands({ limit: 200 });
  const health = useErpRead<ErpStatus>("erp.health.read", {}, { enabled: canHealth });

  const stats = useMemo(() => {
    const rows = commands.data ?? [];
    const since = Date.now() - SEVEN_DAYS_MS;
    const recent = rows.filter((c) => new Date(c.created_at).getTime() >= since);
    return {
      myOpen: rows.filter((c) => c.requester_id === me.data?.user_id && c.status === "awaiting_approval").length,
      executed7d: recent.filter((c) => c.status === "executed").length,
      failed7d: recent.filter((c) => c.status === "failed" || c.status === "rejected").length,
    };
  }, [commands.data, me.data?.user_id]);

  const sections = getBackOfficeContentSections().filter((s) => s.key !== "overview" && s.wave === 1 && canUseBackOfficeSection(s, caps));

  const erpValue = !canHealth ? "—" : health.isLoading ? "…" : health.error ? t("screens.backoffice.dashboard.erpNotOk") : health.data?.result?.status === "ok" ? t("screens.backoffice.dashboard.erpOk") : t("screens.backoffice.dashboard.erpUnknown");
  const erpVariant = !canHealth || health.isLoading ? "default" : health.error ? "error" : health.data?.result?.status === "ok" ? "success" : "warning";

  return (
    <BackOfficePage sectionKey="overview" screenId="BO-001" emoji="📊" title={t("screens.backoffice.dashboard.title")} description={t("screens.backoffice.dashboard.description")}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatsCard
          title={t("screens.backoffice.dashboard.pendingApprovals")}
          value={anyCapability ? fmtNumber(approvals.data?.length ?? 0) : "—"}
          subtitle={t("screens.backoffice.dashboard.pendingApprovalsHint")}
          icon={ClipboardCheck}
          loading={anyCapability && approvals.isLoading}
          variant={(approvals.data?.length ?? 0) > 0 ? "warning" : "default"}
        />
        <AdminStatsCard
          title={t("screens.backoffice.dashboard.myOpenRequests")}
          value={fmtNumber(stats.myOpen)}
          subtitle={t("screens.backoffice.dashboard.myOpenRequestsHint")}
          icon={Inbox}
          loading={commands.isLoading}
        />
        <AdminStatsCard
          title={t("screens.backoffice.dashboard.executed7d")}
          value={fmtNumber(stats.executed7d)}
          subtitle={t("screens.backoffice.dashboard.executed7dHint")}
          icon={CheckCircle2}
          loading={commands.isLoading}
          variant="success"
        />
        <AdminStatsCard
          title={t("screens.backoffice.dashboard.failed7d")}
          value={fmtNumber(stats.failed7d)}
          subtitle={t("screens.backoffice.dashboard.failed7dHint")}
          icon={XCircle}
          loading={commands.isLoading}
          variant={stats.failed7d > 0 ? "error" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("screens.backoffice.dashboard.quickAccess")}</CardTitle>
          </CardHeader>
          <CardContent>
            {me.data && sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("screens.backoffice.dashboard.noCapabilities")}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {sections.map((s) => {
                  const target = s.tabs.find((tb) => tb.key === s.defaultTab) ?? s.tabs[0];
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.key}
                      to={target.path}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm font-medium">{translate(`sidebar.backoffice.${s.key}`, s.label)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("screens.backoffice.dashboard.erpStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`text-2xl font-semibold ${erpVariant === "error" ? "text-red-600 dark:text-red-400" : erpVariant === "success" ? "text-green-600 dark:text-green-400" : erpVariant === "warning" ? "text-yellow-600 dark:text-yellow-400" : ""}`}>{erpValue}</div>
            {canHealth && health.data && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">{t("screens.backoffice.health.companies")}</dt>
                <dd>{fmtNumber(health.data.result?.companies ?? 0)}</dd>
                <dt className="text-muted-foreground">{t("screens.backoffice.health.currencies")}</dt>
                <dd>{fmtNumber(health.data.result?.currencies ?? 0)}</dd>
                <dt className="text-muted-foreground">{t("screens.backoffice.health.paymentTerms")}</dt>
                <dd>{fmtNumber(health.data.result?.payment_terms ?? 0)}</dd>
              </dl>
            )}
            {canHealth && health.error && <QueryState isLoading={false} error={health.error} />}
            {canHealth ? <DataSourceNote command={health.data?.command} /> : <p className="text-xs text-muted-foreground">{t("screens.backoffice.errors.noCapabilityHint")}</p>}
            <Link to="/backoffice/health" className="text-xs underline">{t("screens.backoffice.common.viewAll")}</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("screens.backoffice.dashboard.recentActivity")}</CardTitle>
          <Link to="/backoffice/activity" className="text-xs underline">{t("screens.backoffice.common.viewAll")}</Link>
        </CardHeader>
        <CardContent>
          {QueryState({ isLoading: commands.isLoading, error: commands.error, isEmpty: (commands.data?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.activity.empty"), rows: 3 }) ?? (
            <CommandsTable commands={(commands.data ?? []).slice(0, 5)} meUserId={me.data?.user_id} />
          )}
          <div className="mt-2"><DataSourceNote source="gateway" /></div>
        </CardContent>
      </Card>
    </BackOfficePage>
  );
}
