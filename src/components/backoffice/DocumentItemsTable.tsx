/** VTID-03855 — line items of a quotation / invoice / credit note. */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, num, type ErpDocumentItem } from "@/lib/backoffice-sales";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function DocumentItemsTable({ items, currency }: { items: ErpDocumentItem[]; currency?: string | null }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{t("screens.backoffice.sales.docs.noItems")}</p>;
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("screens.backoffice.sales.docs.item")}</TableHead>
            <TableHead className="text-end">{t("screens.backoffice.sales.docs.qty")}</TableHead>
            <TableHead className="text-end">{t("screens.backoffice.sales.docs.rate")}</TableHead>
            <TableHead className="text-end">{t("screens.backoffice.sales.docs.amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell>
                <div className="text-sm">{it.item_name ?? it.item_id}</div>
                {it.item_code && <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{it.item_code}</div>}
              </TableCell>
              <TableCell className="text-end text-xs whitespace-nowrap">{fmtNumber(num(it.quantity))}{it.uom ? ` ${it.uom}` : ""}</TableCell>
              <TableCell className="text-end text-xs whitespace-nowrap">{formatMoney(it.rate, currency)}</TableCell>
              <TableCell className="text-end text-xs whitespace-nowrap font-medium">{formatMoney(it.net_amount ?? it.amount, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
