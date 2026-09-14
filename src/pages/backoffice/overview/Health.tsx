/**
 * BackOffice › Overview › Health (BO-004) — VTID-03849, Read tier.
 * Four `erp.health.read*` commands (status, check-installation,
 * get-schema-version, list-modules); needs erp.admin or audit.view.
 */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, useErpRead } from "@/hooks/useBackOfficeCommands";
import { fmtDateTime, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const HEALTH_CAPS = ["erp.admin", "audit.view"] as const;

interface ErpStatus { status?: string; companies?: number; currencies?: number; uoms?: number; payment_terms?: number; schema_versions?: Record<string, number> }
interface Installation { status?: string; total_skills_available?: number; installed_count?: number; missing_count?: number; shared_library_installed?: boolean; database_tables?: number; company_count?: number }
interface SchemaVersion { module?: string; version?: number; updated_at?: string; status?: string }
interface ModuleRow { name: string; display_name?: string; version?: string; category?: string; action_count?: number; install_status?: string; installed_at?: string }
interface Modules { modules?: ModuleRow[]; total?: number }

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-end">{value}</dd>
    </div>
  );
}

export default function BackOfficeHealth() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, HEALTH_CAPS));
  const status = useErpRead<ErpStatus>("erp.health.read", {}, { enabled });
  const install = useErpRead<Installation>("erp.health.read.check_installation", {}, { enabled });
  const schema = useErpRead<SchemaVersion>("erp.health.read.get_schema_version", {}, { enabled });
  const modules = useErpRead<Modules>("erp.health.read.list_modules", {}, { enabled });
  const yesNo = (v: boolean | undefined) => (v ? t("screens.backoffice.company.yes") : t("screens.backoffice.company.no"));

  return (
    <BackOfficePage sectionKey="overview" screenId="BO-004" emoji="🩺" title={t("screens.backoffice.health.title")} description={t("screens.backoffice.health.description")} capabilities={HEALTH_CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.health.status")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: status.isLoading, error: status.error, rows: 3 }) ?? (
              <dl className="space-y-1">
                <Stat label={t("screens.backoffice.health.status")} value={<AdminStatusBadge variant={status.data?.result?.status === "ok" ? "active" : "error"}>{status.data?.result?.status ?? "—"}</AdminStatusBadge>} />
                <Stat label={t("screens.backoffice.health.companies")} value={fmtNumber(status.data?.result?.companies ?? 0)} />
                <Stat label={t("screens.backoffice.health.currencies")} value={fmtNumber(status.data?.result?.currencies ?? 0)} />
                <Stat label={t("screens.backoffice.health.uoms")} value={fmtNumber(status.data?.result?.uoms ?? 0)} />
                <Stat label={t("screens.backoffice.health.paymentTerms")} value={fmtNumber(status.data?.result?.payment_terms ?? 0)} />
                <Stat label={t("screens.backoffice.health.schemaVersions")} value={fmtNumber(Object.keys(status.data?.result?.schema_versions ?? {}).length)} />
              </dl>
            )}
            <DataSourceNote command={status.data?.command} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.health.installation")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: install.isLoading, error: install.error, rows: 3 }) ?? (
              <dl className="space-y-1">
                <Stat label={t("screens.backoffice.health.status")} value={<AdminStatusBadge variant={install.data?.result?.status === "ok" ? "active" : "error"}>{install.data?.result?.status ?? "—"}</AdminStatusBadge>} />
                <Stat label={t("screens.backoffice.health.installedSkills")} value={`${fmtNumber(install.data?.result?.installed_count ?? 0)} / ${fmtNumber(install.data?.result?.total_skills_available ?? 0)}`} />
                <Stat label={t("screens.backoffice.health.sharedLibrary")} value={yesNo(install.data?.result?.shared_library_installed)} />
                <Stat label={t("screens.backoffice.health.databaseTables")} value={fmtNumber(install.data?.result?.database_tables ?? 0)} />
                <Stat label={t("screens.backoffice.health.companies")} value={fmtNumber(install.data?.result?.company_count ?? 0)} />
              </dl>
            )}
            <DataSourceNote command={install.data?.command} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.health.schemaVersion")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: schema.isLoading, error: schema.error, rows: 3 }) ?? (
              <dl className="space-y-1">
                <Stat label={t("screens.backoffice.health.module")} value={<span className="font-mono text-xs" dir="ltr">{schema.data?.result?.module ?? "—"}</span>} />
                <Stat label={t("screens.backoffice.health.version")} value={fmtNumber(schema.data?.result?.version ?? 0)} />
                <Stat label={t("screens.backoffice.health.updatedAt")} value={schema.data?.result?.updated_at ? fmtDateTime(schema.data.result.updated_at, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
              </dl>
            )}
            <DataSourceNote command={schema.data?.command} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.health.modules")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: modules.isLoading, error: modules.error, isEmpty: (modules.data?.result?.modules?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.health.noModules") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.health.moduleName")}</TableHead>
                    <TableHead>{t("screens.backoffice.health.version")}</TableHead>
                    <TableHead>{t("screens.backoffice.health.category")}</TableHead>
                    <TableHead>{t("screens.backoffice.health.actions")}</TableHead>
                    <TableHead>{t("screens.backoffice.health.installStatus")}</TableHead>
                    <TableHead>{t("screens.backoffice.health.installedAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(modules.data?.result?.modules ?? []).map((m) => (
                    <TableRow key={m.name}>
                      <TableCell>
                        <div className="text-sm font-medium">{m.display_name ?? m.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{m.name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{m.version ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.category ?? "—"}</TableCell>
                      <TableCell className="text-xs">{fmtNumber(m.action_count ?? 0)}</TableCell>
                      <TableCell><AdminStatusBadge variant={m.install_status === "installed" ? "active" : "warning"}>{m.install_status ?? "—"}</AdminStatusBadge></TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{m.installed_at ? fmtDateTime(m.installed_at, { dateStyle: "medium", timeStyle: "short" }) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={modules.data?.command} />
        </CardContent>
      </Card>
    </BackOfficePage>
  );
}
