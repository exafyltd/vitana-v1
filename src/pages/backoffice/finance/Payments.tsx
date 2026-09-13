/** BackOffice › Finance & Treasury › Payments (BO-025) — VTID-03856, Read tier: `finance.payment.summary`, `finance.payment.list`, `finance.payment.get`, `finance.fx.list*`. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownToLine, ArrowUpFromLine, Landmark } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch, num } from "@/lib/backoffice-sales";
import { isEnabledCurrency, yearToDateWindow, type ErpCurrency, type ErpExchangeRate, type ErpPaymentDetail, type ErpPaymentRow, type ErpPaymentSummary } from "@/lib/backoffice-finance";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["finance.view"] as const;

export default function BackOfficePayments() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [window] = useState(() => yearToDateWindow());
  const summary = useErpRead<ErpPaymentSummary>("finance.payment.summary", window, { enabled });
  const list = useErpRead<{ payments?: ErpPaymentRow[] }>("finance.payment.list", { limit: 200 }, { enabled });
  const detail = useErpRead<ErpPaymentDetail>("finance.payment.get", { payment_entry_id: selected ?? "" }, { enabled: enabled && !!selected });
  const currencies = useErpRead<{ currencies?: ErpCurrency[] }>("finance.fx.list", { limit: 50 }, { enabled });
  const rates = useErpRead<{ rates?: ErpExchangeRate[] }>("finance.fx.list.list_exchange_rates", { limit: 50 }, { enabled });
  const all = list.data?.result?.payments ?? [];
  const rows = all.filter((p) => (type === "all" || p.payment_type === type) && fullTextMatch(search, p.party_name, p.naming_series, p.status, p.party_type));
  const listRow = all.find((p) => p.id === selected);
  const d = detail.data?.result;
  const s = summary.data?.result;
  const unallocatedTotal = all.filter((p) => String(p.status).toLowerCase() !== "draft" && String(p.status).toLowerCase() !== "cancelled").reduce((acc, p) => acc + num(p.unallocated_amount), 0);

  return (
    <BackOfficePage sectionKey="finance" screenId="BO-025" emoji="💸" title={t("screens.backoffice.finance.payments.title")} description={t("screens.backoffice.finance.payments.description")} capabilities={CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.finance.payments.receivedYtd")} value={formatMoney(s?.total_received ?? 0)} subtitle={t("screens.backoffice.finance.payments.receivedYtdHint", { from: fmtDate(window.from_date, { dateStyle: "medium" }) })} icon={ArrowDownToLine} loading={enabled && summary.isLoading} variant="success" />
        <AdminStatsCard title={t("screens.backoffice.finance.payments.paidYtd")} value={formatMoney(s?.total_paid ?? 0)} subtitle={t("screens.backoffice.finance.payments.paidYtdHint")} icon={ArrowUpFromLine} loading={enabled && summary.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.finance.payments.unallocated")} value={formatMoney(unallocatedTotal)} subtitle={t("screens.backoffice.finance.payments.unallocatedHint")} icon={Landmark} loading={enabled && list.isLoading} variant={unallocatedTotal > 0 ? "warning" : "default"} />
      </div>
      {summary.error && <QueryState isLoading={false} error={summary.error} />}
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.finance.payments.searchPlaceholder")}
        filters={[{ value: type, onChange: setType, placeholder: t("screens.backoffice.finance.payments.type"), options: [{ value: "all", label: t("screens.backoffice.common.all") }, { value: "receive", label: t("screens.backoffice.finance.payments.receive") }, { value: "pay", label: t("screens.backoffice.finance.payments.pay") }] }]}
        onReset={() => { setSearch(""); setType("all"); }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.finance.payments.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
                    <TableHead>{t("screens.backoffice.finance.payments.type")}</TableHead>
                    <TableHead>{t("screens.backoffice.finance.payments.party")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.date")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.finance.payments.amount")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.finance.payments.unallocatedCol")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id} onClick={() => setSelected(p.id)} className={`cursor-pointer ${selected === p.id ? "bg-muted/60" : ""}`} aria-selected={selected === p.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">{p.naming_series ?? shortId(p.id)}</TableCell>
                      <TableCell><AdminStatusBadge variant={p.payment_type === "receive" ? "active" : "warning"}>{p.payment_type === "receive" ? t("screens.backoffice.finance.payments.receive") : t("screens.backoffice.finance.payments.pay")}</AdminStatusBadge></TableCell>
                      <TableCell className="text-sm">
                        <div>{p.party_name ?? shortId(p.party_id)}</div>
                        <div className="text-[11px] text-muted-foreground">{p.party_type ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(p.posting_date, { dateStyle: "medium" })}</TableCell>
                      <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(p.paid_amount)}</TableCell>
                      <TableCell className="text-end text-sm whitespace-nowrap">{num(p.unallocated_amount) > 0 ? formatMoney(p.unallocated_amount) : "—"}</TableCell>
                      <TableCell><DocStatusBadge status={p.status} /></TableCell>
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
            {!selected ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.common.selectHint")}</p> : (
              QueryState({ isLoading: detail.isLoading, error: detail.error, isEmpty: !d, emptyTitle: t("screens.backoffice.errors.notFound"), rows: 5 }) ?? (
                <DetailList rows={[
                  { label: t("screens.backoffice.sales.common.reference"), value: d!.naming_series ?? shortId(d!.id), mono: true },
                  { label: t("screens.backoffice.finance.payments.type"), value: d!.payment_type === "receive" ? t("screens.backoffice.finance.payments.receive") : t("screens.backoffice.finance.payments.pay") },
                  { label: t("screens.backoffice.finance.payments.party"), value: listRow?.party_name ?? shortId(d!.party_id) },
                  { label: t("screens.backoffice.sales.common.date"), value: fmtDate(d!.posting_date, { dateStyle: "medium" }) },
                  { label: t("screens.backoffice.sales.common.status"), value: <DocStatusBadge status={listRow?.status ?? "draft"} /> },
                  { label: t("screens.backoffice.finance.payments.amount"), value: <span className="font-medium">{formatMoney(d!.paid_amount, d!.payment_currency)}</span> },
                  { label: t("screens.backoffice.finance.payments.unallocatedCol"), value: formatMoney(d!.unallocated_amount, d!.payment_currency) },
                  { label: t("screens.backoffice.finance.payments.allocations"), value: fmtNumber((d!.allocations ?? []).length) },
                  { label: t("screens.backoffice.finance.payments.bankReference"), value: d!.reference_number ?? "—", mono: true },
                  { label: t("screens.backoffice.finance.payments.referenceDate"), value: d!.reference_date ? fmtDate(d!.reference_date, { dateStyle: "medium" }) : "—" },
                  { label: t("screens.backoffice.finance.payments.fromAccount"), value: d!.paid_from_account ? shortId(d!.paid_from_account) : "—", mono: true },
                  { label: t("screens.backoffice.finance.payments.toAccount"), value: d!.paid_to_account ? shortId(d!.paid_to_account) : "—", mono: true },
                  { label: t("screens.backoffice.finance.payments.currency"), value: `${d!.payment_currency ?? "—"} · ${fmtNumber(num(d!.exchange_rate ?? 1), { maximumFractionDigits: 4 })}`, mono: true },
                ]} />
              )
            )}
            {selected && <DataSourceNote command={detail.data?.command} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.finance.fx.currencies")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: me.isLoading || currencies.isLoading, error: currencies.error, isEmpty: (currencies.data?.result?.currencies?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.finance.fx.noCurrencies"), rows: 3 }) ?? (
              <div className="flex flex-wrap gap-1" dir="ltr">
                {(currencies.data?.result?.currencies ?? []).map((c) => (
                  <AdminStatusBadge key={c.code} variant={isEnabledCurrency(c) ? "active" : "inactive"} className="whitespace-nowrap">{c.code}{c.symbol && c.symbol !== c.code ? ` ${c.symbol}` : ""}</AdminStatusBadge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("screens.backoffice.finance.fx.currenciesHint")}</p>
            <DataSourceNote command={currencies.data?.command} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.finance.fx.rates")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {QueryState({ isLoading: me.isLoading || rates.isLoading, error: rates.error, isEmpty: (rates.data?.result?.rates?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.finance.fx.noRates"), rows: 3 }) ?? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("screens.backoffice.finance.fx.pair")}</TableHead>
                      <TableHead className="text-end">{t("screens.backoffice.finance.fx.rate")}</TableHead>
                      <TableHead>{t("screens.backoffice.finance.fx.effective")}</TableHead>
                      <TableHead>{t("screens.backoffice.finance.fx.source")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rates.data?.result?.rates ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs" dir="ltr">{r.from_currency} → {r.to_currency}</TableCell>
                        <TableCell className="text-end text-sm font-medium">{fmtNumber(num(r.rate), { maximumFractionDigits: 6 })}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.effective_date, { dateStyle: "medium" })}</TableCell>
                        <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DataSourceNote command={rates.data?.command} />
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
