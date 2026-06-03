/**
 * Phase 2 — standing budget meter.
 *
 * Renders the user's spend-this-month vs their monthly cap as a progress bar
 * plus a status pill ('under' = neutral, 'near' = warning, 'over' = destructive),
 * using "{spent} von {cap} diesen Monat". The bar tracks
 * (spent + active cart subtotal) / cap so the user sees the projected month-end
 * spend if they pay for what's currently in the cart.
 *
 * When `monthly_cap_cents` is null the user hasn't set a budget yet — we show a
 * subtle hint linking to /settings/limitations instead of a bar.
 *
 * Money is formatted via the project's `formatMoneyMinor` util (NO raw
 * toLocaleString / Intl) and every visible string is a t() key.
 */

import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Settings2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BudgetSummary } from "@/lib/universal-cart-client";
import { formatMoneyMinor, GatewayCurrency } from "@/lib/format-money";
import { t } from "@/lib/i18n-toast";

const STATUS: Record<
  BudgetSummary["status"],
  {
    pillVariant: "secondary" | "outline" | "destructive";
    labelKey: string;
    Icon: typeof CheckCircle2;
  }
> = {
  under: { pillVariant: "secondary", labelKey: "universalCart.budget.statusUnder", Icon: CheckCircle2 },
  near: { pillVariant: "outline", labelKey: "universalCart.budget.statusNear", Icon: AlertTriangle },
  over: { pillVariant: "destructive", labelKey: "universalCart.budget.statusOver", Icon: AlertTriangle },
};

export function BudgetMeter({ budget }: { budget: BudgetSummary }) {
  const currency = (budget.currency?.toUpperCase() as GatewayCurrency) || "EUR";

  // No cap set yet — subtle hint to the Limitations settings instead of a bar.
  if (budget.monthly_cap_cents == null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 flex-shrink-0" />
            <span>{t("universalCart.budget.noCapHint")}</span>
          </div>
          <Link
            to="/settings/limitations"
            className="inline-flex flex-shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t("universalCart.budget.title")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const cap = budget.monthly_cap_cents;
  const projected = budget.spent_this_month_cents + budget.cart_active_subtotal_cents;
  const pct = cap > 0 ? Math.min(100, Math.max(0, (projected / cap) * 100)) : 0;

  const status = STATUS[budget.status] ?? STATUS.under;
  const { Icon } = status;

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4" />
            {t("universalCart.budget.title")}
          </div>
          <Badge variant={status.pillVariant} className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {t(status.labelKey)}
          </Badge>
        </div>
        <Progress value={pct} />
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("universalCart.budget.spentOfCap", {
            spent: formatMoneyMinor(projected, currency),
            cap: formatMoneyMinor(cap, currency),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
