/**
 * BackOffice › Finance & Treasury › Bank Reconciliation (BO-026) — VTID-03856, Read tier.
 * A read-only workbench over `finance.payment.list`: what is unmatched (submitted, unallocated),
 * what never reached the ledger (drafts), what is settled. Matching itself is `finance.bank.reconcile`
 * (Commit, `finance.reconcile`) and belongs to a later slice.
 */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, FileClock, CheckCircle2 } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, num } from "@/lib/backoffice-sales";
import { reconciliationBuckets, type ErpPaymentRow } from "@/lib/backoffice-finance";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["finance.view", "finance.reconcile"] as const;

function PaymentsTable({ rows, showUnallocated }: { rows: ErpPaymentRow[]; showUnallocated: boolean }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
            <TableHead>{t("screens.backoffice.finance.payments.type")}</TableHead>
            <TableHead>{t("screens.backoffice.finance.payments.party")}</TableHead>
            <TableHead>{t("screens.backoffice.sales.common.date")}</TableHead>
            <TableHead className="text-end">{t("screens.backoffice.finance.payments.amount")}</TableHead>
            {showUnallocated && <TableHead className="text-end">{t("screens.backoffice.finance.payments.unallocatedCol")}</TableHead>}
            <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs" dir="ltr">{p.naming_series ?? shortId(p.id)}</TableCell>
              <TableCell><AdminStatusBadge variant={p.payment_type === "receive" ? "active" : "warning"}>{p.payment_type === "receive" ? t("screens.backoffice.finance.payments.receive") : t("screens.backoffice.finance.payments.pay")}</AdminStatusBadge></TableCell>
              <TableCell className="text-sm">{p.party_name ?? shortId(p.party_id)}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{fmtDate(p.posting_date, { dateStyle: "medium" })}</TableCell>
              <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(p.paid_amount)}</TableCell>
              {showUnallocated && <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(p.unallocated_amount)}</TableCell>}
              <TableCell><DocStatusBadge status={p.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function BackOfficeBankReconciliation() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const list = useErpRead<{ payments?: ErpPaymentRow[] }>("finance.payment.list", { limit: 200 }, { enabled });
  const b = reconciliationBuckets(list.data?.result?.payments ?? []);
  const unallocatedNet = b.totals.unallocatedIn - b.totals.unallocatedOut;

  return (
    <BackOfficePage sectionKey="finance" screenId="BO-026" emoji="🏦" title={t("screens.backoffice.finance.reconciliation.title")} description={t("screens.backoffice.finance.reconciliation.description")} capabilities={CAPS}>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.finance.reconciliation.readOnlyNote")}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.finance.reconciliation.unmatched")} value={fmtNumber(b.unallocated.length)} subtitle={t("screens.backoffice.finance.reconciliation.unmatchedHint", { amount: formatMoney(unallocatedNet) })} icon={Scale} loading={enabled && list.isLoading} variant={b.unallocated.length > 0 ? "warning" : "default"} />
        <AdminStatsCard title={t("screens.backoffice.finance.reconciliation.drafts")} value={fmtNumber(b.drafts.length)} subtitle={t("screens.backoffice.finance.reconciliation.draftsHint", { amount: formatMoney(b.totals.draftIn - b.totals.draftOut) })} icon={FileClock} loading={enabled && list.isLoading} variant={b.drafts.length > 0 ? "error" : "default"} />
        <AdminStatsCard title={t("screens.backoffice.finance.reconciliation.settled")} value={fmtNumber(b.settled.length)} subtitle={t("screens.backoffice.finance.reconciliation.settledHint")} icon={CheckCircle2} loading={enabled && list.isLoading} variant="success" />
      </div>
      {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, rows: 4 }) ?? (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.finance.reconciliation.unmatchedTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {b.unallocated.length === 0 ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.finance.reconciliation.nothingUnmatched")}</p> : <PaymentsTable rows={b.unallocated} showUnallocated />}
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.finance.reconciliation.unmatchedExplain")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.finance.reconciliation.draftsTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {b.drafts.length === 0 ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.finance.reconciliation.noDrafts")}</p> : <PaymentsTable rows={b.drafts} showUnallocated={false} />}
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.finance.reconciliation.draftsExplain")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.finance.reconciliation.settledTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {b.settled.length === 0 ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.finance.reconciliation.noSettled")}</p> : <PaymentsTable rows={b.settled} showUnallocated={false} />}
              <p className="text-xs text-muted-foreground">{num(b.settled.length) > 0 ? t("screens.backoffice.finance.reconciliation.settledExplain") : ""}</p>
            </CardContent>
          </Card>
        </>
      )}
      <DataSourceNote command={list.data?.command} />
    </BackOfficePage>
  );
}
