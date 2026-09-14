/**
 * BackOffice › Settings › Company & Legal Entities (BO-059) — VTID-03849, Read tier.
 * `settings.company.list` (all legal entities in the tenant's ERP), the
 * tenant's active company via `settings.company.get` (the bridge scopes it —
 * no id travels from the browser), and its fiscal years via
 * `accounting.period.list` when the caller may read accounting.
 */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { fmtDate, fmtDateTime, fmtNumber } from "@/lib/locale-format";
import { monthName } from "@/lib/backoffice-format";
import { t } from "@/lib/i18n-toast";

const COMPANY_CAPS = ["erp.admin", "accounting.view"] as const;

interface Company {
  id: string;
  name: string;
  abbr: string | null;
  default_currency: string | null;
  country: string | null;
  tax_id: string | null;
  fiscal_year_start_month: number | null;
  three_way_match_policy: string | null;
  receipt_tolerance_pct: string | number | null;
  perpetual_inventory: number | boolean | null;
  enable_negative_stock: number | boolean | null;
  accounts_frozen_till_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}
interface CompanyList { companies?: Company[]; total_count?: number }
interface CompanyGet { company?: Company }
interface FiscalYear { id: string; name: string; start_date: string; end_date: string; is_closed: number | boolean }
interface FiscalYears { fiscal_years?: FiscalYear[] }

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm py-1 border-b last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""} dir={mono ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}

export default function BackOfficeCompany() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, COMPANY_CAPS));
  const canAccounting = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, ["accounting.view"]));
  const list = useErpRead<CompanyList>("settings.company.list", { limit: 50 }, { enabled });
  const active = useErpRead<CompanyGet>("settings.company.get", {}, { enabled });
  const years = useErpRead<FiscalYears>("accounting.period.list", {}, { enabled: enabled && canAccounting });
  const yes = t("screens.backoffice.company.yes");
  const no = t("screens.backoffice.company.no");
  const truthy = (v: number | boolean | null | undefined) => (v === 1 || v === true ? yes : no);
  const c = active.data?.result?.company;
  const companies = list.data?.result?.companies ?? [];

  return (
    <BackOfficePage sectionKey="settings" screenId="BO-059" emoji="🏢" title={t("screens.backoffice.company.title")} description={t("screens.backoffice.company.description")} capabilities={COMPANY_CAPS}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.company.active")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: me.isLoading || active.isLoading, error: active.error, isEmpty: !c, emptyTitle: t("screens.backoffice.company.empty"), rows: 6 }) ?? (
              <dl>
                <Row label={t("screens.backoffice.company.name")} value={<span className="font-medium">{c!.name}</span>} />
                <Row label={t("screens.backoffice.company.abbr")} value={c!.abbr ?? "—"} mono />
                <Row label={t("screens.backoffice.company.currency")} value={c!.default_currency ?? "—"} mono />
                <Row label={t("screens.backoffice.company.country")} value={c!.country ?? "—"} />
                <Row label={t("screens.backoffice.company.taxId")} value={c!.tax_id ?? t("screens.backoffice.company.none")} mono />
                <Row label={t("screens.backoffice.company.fiscalYearStart")} value={monthName(c!.fiscal_year_start_month)} />
                <Row label={t("screens.backoffice.company.threeWayMatch")} value={c!.three_way_match_policy ?? "—"} mono />
                <Row label={t("screens.backoffice.company.receiptTolerance")} value={c!.receipt_tolerance_pct == null ? "—" : fmtNumber(Number(c!.receipt_tolerance_pct) / 100, { style: "percent", maximumFractionDigits: 2 })} />
                <Row label={t("screens.backoffice.company.perpetualInventory")} value={truthy(c!.perpetual_inventory)} />
                <Row label={t("screens.backoffice.company.negativeStock")} value={truthy(c!.enable_negative_stock)} />
                <Row label={t("screens.backoffice.company.frozenTill")} value={c!.accounts_frozen_till_date ? fmtDate(c!.accounts_frozen_till_date, { dateStyle: "medium" }) : t("screens.backoffice.company.none")} />
                <Row label={t("screens.backoffice.company.id")} value={c!.id} mono />
                <Row label={t("screens.backoffice.company.updatedAt")} value={c!.updated_at ? fmtDateTime(c!.updated_at, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
              </dl>
            )}
            <DataSourceNote command={active.data?.command} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.company.fiscalYears")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!canAccounting ? (
              <p className="text-sm text-muted-foreground">{t("screens.backoffice.company.needsAccountingView")}</p>
            ) : (
              QueryState({ isLoading: me.isLoading || years.isLoading, error: years.error, isEmpty: (years.data?.result?.fiscal_years?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.company.noFiscalYears"), rows: 3 }) ?? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("screens.backoffice.company.fyName")}</TableHead>
                        <TableHead>{t("screens.backoffice.company.start")}</TableHead>
                        <TableHead>{t("screens.backoffice.company.end")}</TableHead>
                        <TableHead>{t("screens.backoffice.company.state")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(years.data?.result?.fiscal_years ?? []).map((fy) => (
                        <TableRow key={fy.id}>
                          <TableCell className="text-sm">{fy.name}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(fy.start_date, { dateStyle: "medium" })}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmtDate(fy.end_date, { dateStyle: "medium" })}</TableCell>
                          <TableCell>
                            <AdminStatusBadge variant={fy.is_closed === 1 || fy.is_closed === true ? "inactive" : "active"}>
                              {fy.is_closed === 1 || fy.is_closed === true ? t("screens.backoffice.company.closed") : t("screens.backoffice.company.open")}
                            </AdminStatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
            {canAccounting && <DataSourceNote command={years.data?.command} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.company.allCompanies")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: companies.length === 0, emptyTitle: t("screens.backoffice.company.empty"), rows: 3 }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.company.name")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.abbr")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.currency")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.country")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.taxId")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.fiscalYearStart")}</TableHead>
                    <TableHead>{t("screens.backoffice.company.id")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((co) => (
                    <TableRow key={co.id}>
                      <TableCell className="text-sm font-medium">
                        {co.name}
                        {c && co.id === c.id && <AdminStatusBadge variant="active" className="ms-2">{t("screens.backoffice.company.activeBadge")}</AdminStatusBadge>}
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{co.abbr ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{co.default_currency ?? "—"}</TableCell>
                      <TableCell className="text-xs">{co.country ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{co.tax_id ?? "—"}</TableCell>
                      <TableCell className="text-xs">{monthName(co.fiscal_year_start_month)}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground" dir="ltr">{shortId(co.id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={list.data?.command} />
        </CardContent>
      </Card>
    </BackOfficePage>
  );
}
