/** BackOffice › Accounting › Chart of Accounts (BO-019) — VTID-03857, Read tier: `accounting.coa.list`, `accounting.coa.get`. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ban, ListTree, Snowflake } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch } from "@/lib/backoffice-sales";
import { ROOT_TYPES, flag, flattenAccountTree, summarizeChart, type ErpAccount, type ErpAccountDetail } from "@/lib/backoffice-accounting";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["accounting.view"] as const;

function rootTypeLabel(rt: string): string {
  return (ROOT_TYPES as readonly string[]).includes(rt) ? t(`screens.backoffice.accounting.common.rootType.${rt}`) : rt;
}

export default function BackOfficeChartOfAccounts() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [rootType, setRootType] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useErpRead<{ accounts?: ErpAccount[] }>("accounting.coa.list", { limit: 200 }, { enabled });
  const detail = useErpRead<{ account?: ErpAccountDetail }>("accounting.coa.get", { account_id: selected ?? "" }, { enabled: enabled && !!selected });
  const all = list.data?.result?.accounts ?? [];
  const summary = summarizeChart(all);
  const filtered = all.filter((a) => (rootType === "all" || a.root_type === rootType) && fullTextMatch(search, a.account_number, a.name, a.account_type, a.currency));
  const tree = flattenAccountTree(filtered);
  const listRow = all.find((a) => a.id === selected);
  const d = detail.data?.result?.account;
  const parentName = (id: string | null) => (id ? all.find((a) => a.id === id)?.name ?? shortId(id) : "—");

  return (
    <BackOfficePage sectionKey="accounting" screenId="BO-019" emoji="🗂️" title={t("screens.backoffice.accounting.coa.title")} description={t("screens.backoffice.accounting.coa.description")} capabilities={CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.accounting.coa.accounts")} value={fmtNumber(summary.total)} subtitle={t("screens.backoffice.accounting.coa.accountsHint", { groups: fmtNumber(summary.groups), ledgers: fmtNumber(summary.ledgers) })} icon={ListTree} loading={enabled && list.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.accounting.coa.frozen")} value={fmtNumber(summary.frozen)} subtitle={t("screens.backoffice.accounting.coa.frozenHint")} icon={Snowflake} loading={enabled && list.isLoading} variant={summary.frozen > 0 ? "warning" : "default"} />
        <AdminStatsCard title={t("screens.backoffice.accounting.coa.disabled")} value={fmtNumber(summary.disabled)} subtitle={t("screens.backoffice.accounting.coa.disabledHint")} icon={Ban} loading={enabled && list.isLoading} />
      </div>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.accounting.coa.searchPlaceholder")}
        filters={[{ value: rootType, onChange: setRootType, placeholder: t("screens.backoffice.accounting.coa.rootType"), options: [{ value: "all", label: t("screens.backoffice.common.all") }, ...ROOT_TYPES.map((rt) => ({ value: rt, label: rootTypeLabel(rt) }))] }]}
        onReset={() => { setSearch(""); setRootType("all"); }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: tree.length === 0, emptyTitle: t("screens.backoffice.accounting.coa.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.accounting.coa.number")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.coa.name")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.coa.type")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.coa.currency")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.coa.flags")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tree.map(({ account: a, depth, hasChildren }) => (
                    <TableRow key={a.id} onClick={() => setSelected(a.id)} className={`cursor-pointer ${selected === a.id ? "bg-muted/60" : ""} ${flag(a.disabled) ? "opacity-60" : ""}`} aria-selected={selected === a.id} aria-level={depth + 1}>
                      <TableCell className="font-mono text-xs" dir="ltr">{a.account_number ?? "—"}</TableCell>
                      <TableCell className={`text-sm ${flag(a.is_group) ? "font-medium" : ""}`}>
                        <span style={{ paddingInlineStart: `${depth * 1.25}rem` }} className="inline-flex items-center gap-1">
                          {hasChildren && <span aria-hidden="true" className="text-muted-foreground">▸</span>}
                          {a.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{rootTypeLabel(a.root_type)}</div>
                        {a.account_type && <div className="text-[11px] text-muted-foreground">{a.account_type}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{a.currency ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {flag(a.is_group) && <AdminStatusBadge variant="info" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.group")}</AdminStatusBadge>}
                          {flag(a.is_frozen) && <AdminStatusBadge variant="warning" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.frozenBadge")}</AdminStatusBadge>}
                          {flag(a.disabled) && <AdminStatusBadge variant="inactive" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.disabledBadge")}</AdminStatusBadge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={list.data?.command} />
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.common.details")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selected ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.accounting.coa.detailsHint")}</p> : (
              QueryState({ isLoading: detail.isLoading, error: detail.error, isEmpty: !d, emptyTitle: t("screens.backoffice.errors.notFound"), rows: 5 }) ?? (
                <DetailList rows={[
                  { label: t("screens.backoffice.accounting.coa.number"), value: d!.account_number ?? "—", mono: true },
                  { label: t("screens.backoffice.accounting.coa.name"), value: d!.name },
                  { label: t("screens.backoffice.accounting.coa.rootType"), value: rootTypeLabel(d!.root_type) },
                  { label: t("screens.backoffice.accounting.coa.accountType"), value: d!.account_type ?? "—" },
                  { label: t("screens.backoffice.accounting.coa.parent"), value: parentName(d!.parent_id ?? listRow?.parent_id ?? null) },
                  { label: t("screens.backoffice.accounting.coa.balance"), value: <span className="font-medium">{flag(d!.is_group) ? "—" : formatMoney(d!.balance, d!.currency)}</span> },
                  { label: t("screens.backoffice.accounting.coa.debitTotal"), value: formatMoney(d!.debit_total, d!.currency) },
                  { label: t("screens.backoffice.accounting.coa.creditTotal"), value: formatMoney(d!.credit_total, d!.currency) },
                  { label: t("screens.backoffice.accounting.coa.direction"), value: d!.balance_direction ?? "—", mono: true },
                  { label: t("screens.backoffice.accounting.coa.flags"), value: (
                    <div className="flex flex-wrap gap-1">
                      {flag(d!.is_group) && <AdminStatusBadge variant="info" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.group")}</AdminStatusBadge>}
                      {flag(d!.is_frozen) && <AdminStatusBadge variant="warning" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.frozenBadge")}</AdminStatusBadge>}
                      {flag(d!.disabled) && <AdminStatusBadge variant="inactive" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.disabledBadge")}</AdminStatusBadge>}
                      {!flag(d!.is_group) && !flag(d!.is_frozen) && !flag(d!.disabled) && <AdminStatusBadge variant="active" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.ledger")}</AdminStatusBadge>}
                    </div>
                  ) },
                ]} />
              )
            )}
            {selected && <DataSourceNote command={detail.data?.command} />}
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
