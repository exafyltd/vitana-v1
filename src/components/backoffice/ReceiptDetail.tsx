/** VTID-03849 — a command's stored bridge receipt, verbatim, in a collapsible block. */
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BackOfficeReceipt } from "@/hooks/useBackOfficeCommands";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function ReceiptDetail({ receipt }: { receipt: BackOfficeReceipt | null }) {
  const [open, setOpen] = useState(false);
  if (!receipt) return <span className="text-xs text-muted-foreground">{t("screens.backoffice.receipts.noReceipt")}</span>;
  const meta: string[] = [];
  if (receipt.action) meta.push(String(receipt.action));
  if (typeof receipt.rc === "number") meta.push(`rc ${fmtNumber(receipt.rc)}`);
  if (typeof receipt.duration_ms === "number") meta.push(`${fmtNumber(receipt.duration_ms)} ms`);
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-foreground hover:underline"
      >
        {open ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
        <span>{open ? t("screens.backoffice.receipts.hide") : t("screens.backoffice.receipts.show")}</span>
        <span className="text-muted-foreground font-mono" dir="ltr">{meta.join(" · ")}</span>
      </button>
      {open && (
        <pre dir="ltr" className="mt-2 max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-start font-mono text-[11px] leading-snug">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      )}
    </div>
  );
}
