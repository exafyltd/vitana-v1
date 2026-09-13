/** VTID-03855 — ERPClaw document/lifecycle/priority status pill, translated when a key exists, raw otherwise. */
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { statusVariant } from "@/lib/backoffice-sales";
import { lookup } from "@/lib/i18n-toast";

const KNOWN = new Set(["new", "open", "draft", "prospect", "lead", "qualified", "contacted", "submitted", "sent", "active", "customer", "won", "completed", "paid", "unqualified", "cancelled", "lost", "closed", "inactive", "churned", "overdue", "high", "urgent", "on_hold", "partially_paid", "medium", "low", "converted", "unpaid", "return"]);

export default function DocStatusBadge({ status }: { status: string | null | undefined }) {
  const s = String(status ?? "").toLowerCase();
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  const label = KNOWN.has(s) ? lookup(`screens.backoffice.sales.status.${s}`) : s;
  return <AdminStatusBadge variant={statusVariant(s)} className="whitespace-nowrap">{label}</AdminStatusBadge>;
}
