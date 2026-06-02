/**
 * Phase 1 — Agent proposal card.
 *
 * Renders ONE agent-proposed universal-cart line (metadata.origin === 'agent').
 * Title hydrates via useMarketplaceProduct exactly like the buyable cart lines
 * (with the agent-supplied metadata.title as a fallback). Below the title we
 * render the agent's rationale, a SAFETY callout that is visually prominent
 * (destructive Alert) whenever metadata.safety_flags is non-empty — the user
 * must NOT be able to approve blind — plus a confidence read-out and
 * Keep / Remove actions.
 *
 * Remove uses the existing removeItem from useUniversalCart. Keep is a no-op
 * acknowledgement (the item is already in the cart and flows into the existing
 * Approve & Pay) — it just collapses the proposal's emphasis for that line.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { UniversalCartItem } from "@/lib/universal-cart-client";
import { useMarketplaceProduct } from "@/hooks/useMarketplace";
import { formatMoneyMinor, GatewayCurrency } from "@/lib/format-money";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

function asString(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function AgentProposalCard({
  item,
  onRemove,
  isRemoving,
  variant = "agent",
}: {
  item: UniversalCartItem;
  onRemove: (item: UniversalCartItem) => void | Promise<void>;
  isRemoving?: boolean;
  /**
   * Phase 2 — `reorder` renders a "Schon einmal gekauft" badge instead of the
   * "Vitana schlägt vor" treatment. Same rationale + safety + Keep/Remove.
   */
  variant?: "agent" | "reorder";
}) {
  const { data, isLoading } = useMarketplaceProduct(item.product_id);
  const product = data?.product;
  const [kept, setKept] = useState(false);

  const rationale = asString(item.metadata?.rationale);
  const safetyFlags = asStringArray(item.metadata?.safety_flags);
  const confidence =
    typeof item.metadata?.confidence === "number"
      ? (item.metadata.confidence as number)
      : null;
  const hasSafetyFlags = safetyFlags.length > 0;
  const isReorder = variant === "reorder";

  const snapshotPrice =
    item.unit_price_cents_snapshot != null
      ? formatMoneyMinor(
          item.unit_price_cents_snapshot,
          (item.currency_snapshot?.toUpperCase() as GatewayCurrency) || "EUR",
        )
      : null;

  const image = product?.images?.[0] ?? item.metadata?.item_image_url;
  const title =
    product?.title ??
    asString(item.metadata?.title) ??
    asString(item.metadata?.source_label);

  return (
    <Card className={hasSafetyFlags ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {typeof image === "string" && image ? (
              <img
                src={image}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-md object-cover bg-muted"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0 text-sm">
              {isReorder && (
                <Badge variant="outline" className="mb-1 inline-flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {t("universalCart.agent.reorderLabel")}
                </Badge>
              )}
              {title ? (
                <div className="font-medium break-words">{title}</div>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("universalCart.page.loading")}</span>
                </div>
              ) : (
                <div className="font-medium break-words">
                  {snapshotPrice ?? item.product_id}
                </div>
              )}
              {snapshotPrice && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {snapshotPrice}
                </div>
              )}
              <Link
                to={`/discover/product/${item.product_id}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
              >
                {t("universalCart.item.viewProduct")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item)}
            disabled={isRemoving}
            aria-label={t("universalCart.agent.remove")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {rationale && (
          <div className="text-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("universalCart.agent.rationaleLabel")}
            </div>
            <p className="mt-0.5 text-muted-foreground break-words">{rationale}</p>
          </div>
        )}

        {hasSafetyFlags && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("universalCart.agent.safetyTitle")}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-0.5">
                {safetyFlags.map((flag) => (
                  <li key={flag} className="break-words">
                    {flag}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          {confidence != null ? (
            <Badge variant="secondary" className="tabular-nums">
              {t("universalCart.agent.confidenceLabel", {
                value: fmtNumber(confidence, {
                  style: "percent",
                  maximumFractionDigits: 0,
                }),
              })}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={kept ? "secondary" : "outline"}
              size="sm"
              onClick={() => setKept(true)}
              disabled={kept}
            >
              <Check className="mr-2 h-4 w-4" />
              {t("universalCart.agent.keep")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(item)}
              disabled={isRemoving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("universalCart.agent.remove")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
