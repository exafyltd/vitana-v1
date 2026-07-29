/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — Chunk 7: admin review queue for
 * community-marketplace listings. Modeled on
 * src/pages/admin/marketplace/Products.tsx (same shell, same
 * filter-tabs/bulk-action pattern), against the companion
 * admin-community-marketplace.ts routes.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { adminCommunityMarketplaceNavigation } from "@/config/navigation";
import { Search, Loader2, EyeOff, CheckCircle, Flag, RefreshCw, Ban, XCircle } from "lucide-react";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { fmtNumber } from "@/lib/locale-format";
import { categoryLabel } from "@/lib/community-marketplace-categories";
import { formatListingPrice } from "@/hooks/useCommunityMarketplace";

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_GATEWAY_BASE || "").replace(/\/+$/, "");

interface AdminListing {
  id: string;
  seller_user_id: string;
  seller_display_name: string | null;
  seller_vitana_id: string | null;
  listing_kind: "product" | "service";
  category: string;
  subcategory: string | null;
  title: string;
  price_cents: number | null;
  currency: string | null;
  price_on_request: boolean;
  status: string;
  requires_admin_review: boolean;
  admin_review_reason: string | null;
  admin_notes: string | null;
  created_at: string;
}

type BulkAction = "hide" | "reject" | "suspend_listing" | "clear_review" | "flag_review" | "reactivate";

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "screens.admin.communityMarketplaceStatusDraft",
  active: "screens.admin.active",
  paused: "screens.admin.communityMarketplaceStatusPaused",
  sold: "screens.admin.communityMarketplaceStatusSold",
  removed: "screens.admin.communityMarketplaceStatusRemoved",
  suspended: "screens.admin.communityMarketplaceStatusSuspended",
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function AdminCommunityMarketplaceListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<AdminListing[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  const reviewOnly = searchParams.get("requires_admin_review") === "true";
  const statusFilter = searchParams.get("status");

  const load = useCallback(async () => {
    if (!GATEWAY_URL) {
      notifyError("toasts.admin.gatewayUrlNotConfigured");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (reviewOnly) params.set("requires_admin_review", "true");
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "50");
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/community-marketplace/listings?${params.toString()}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setSelected(new Set());
    } catch {
      notifyError("toasts.admin.loadFailed");
    } finally {
      setLoading(false);
    }
  }, [reviewOnly, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function bulkAction(action: BulkAction) {
    if (selected.size === 0) {
      notify("toasts.admin.noListingsSelected");
      return;
    }
    if (action === "reject" && !reason.trim()) {
      notifyError("toasts.admin.communityMarketplaceReasonRequired");
      return;
    }
    if (!GATEWAY_URL) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/community-marketplace/listings/bulk-action`, {
        method: "POST",
        headers,
        body: JSON.stringify({ listing_ids: Array.from(selected), action, reason: reason.trim() || undefined }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      notify("toasts.admin.communityMarketplaceBulkActionApplied", undefined, { count: json.updated ?? 0 });
      setReason("");
      await load();
    } catch {
      notifyError("toasts.admin.bulkActionFailed");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function setFilter(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  return (
    <AppLayout>
      <SEO
        title={t("screens.admin.communityMarketplaceListingsTitle")}
        description={t("screens.admin.communityMarketplaceListingsDescription")}
        canonical={typeof window !== "undefined" ? window.location.href : ""}
      />
      <SubNavigation items={adminCommunityMarketplaceNavigation} />
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          <StandardHeader
            title={t("screens.admin.communityMarketplaceListingsTitle")}
            description={t("screens.admin.communityMarketplaceListingsDescription")}
          />

          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("screens.admin.searchTitle")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") load();
                  }}
                />
              </div>
              <Button
                size="sm"
                variant={reviewOnly ? "default" : "outline"}
                onClick={() => setFilter("requires_admin_review", reviewOnly ? null : "true")}
              >
                {t("screens.admin.needsReview")}
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "suspended" ? "default" : "outline"}
                onClick={() => setFilter("status", statusFilter === "suspended" ? null : "suspended")}
              >
                {t("screens.admin.communityMarketplaceStatusSuspended")}
              </Button>
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">{t("screens.admin.value0Total", { value0: fmtNumber(total) })}</span>
            </CardContent>
          </Card>

          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center bg-slate-100 border rounded-md p-3">
              <span className="text-sm font-medium">{t("screens.admin.sizeSelected", { size: selected.size })}</span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("screens.admin.communityMarketplaceReasonPlaceholder")}
                className="h-8 w-56"
              />
              <Button size="sm" variant="outline" onClick={() => bulkAction("clear_review")} disabled={busy}>
                <CheckCircle className="w-4 h-4 mr-1" /> {t("screens.admin.clearReview")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("flag_review")} disabled={busy}>
                <Flag className="w-4 h-4 mr-1" /> {t("screens.admin.flagForReview")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("hide")} disabled={busy}>
                <EyeOff className="w-4 h-4 mr-1" /> {t("screens.admin.hide")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("reactivate")} disabled={busy}>
                <RefreshCw className="w-4 h-4 mr-1" /> {t("screens.admin.communityMarketplaceReactivateAction")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction("reject")} disabled={busy}>
                <XCircle className="w-4 h-4 mr-1" /> {t("screens.admin.communityMarketplaceRejectAction")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction("suspend_listing")} disabled={busy}>
                <Ban className="w-4 h-4 mr-1" /> {t("screens.admin.communityMarketplaceSuspendListingAction")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {t("screens.admin.cancel")}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("screens.admin.loading")}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-medium">{t("screens.admin.communityMarketplaceNoListings")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox checked={selected.size === items.length && items.length > 0} onCheckedChange={toggleAll} />
                      </th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.product")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.communityMarketplaceSeller")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.category")}</th>
                      <th className="p-3 text-right font-medium">{t("screens.admin.price")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        className={`border-b last:border-b-0 ${it.requires_admin_review ? "bg-amber-50/40" : ""} ${
                          it.status === "removed" || it.status === "suspended" ? "opacity-60" : ""
                        }`}
                      >
                        <td className="p-3">
                          <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{it.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {it.listing_kind === "service" ? t("screens.communityMarketplace.listingKindService") : t("screens.communityMarketplace.listingKindProduct")}
                          </div>
                          {it.requires_admin_review && it.admin_review_reason && (
                            <div className="text-xs text-amber-700 mt-0.5">⚠ {it.admin_review_reason}</div>
                          )}
                        </td>
                        <td className="p-3">{it.seller_display_name ?? it.seller_vitana_id ?? "—"}</td>
                        <td className="p-3">
                          {categoryLabel(it.category)}
                          {it.subcategory && <span className="text-muted-foreground"> · {it.subcategory}</span>}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatListingPrice({ price_cents: it.price_cents, currency: it.currency, price_on_request: it.price_on_request }) ??
                            t("screens.communityMarketplace.priceOnRequest")}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={it.status === "active" ? "outline" : "secondary"}
                            className={it.requires_admin_review ? "bg-amber-500 text-white" : undefined}
                          >
                            {it.requires_admin_review ? t("screens.admin.review") : t(STATUS_LABEL_KEYS[it.status] ?? "screens.admin.communityMarketplaceStatusDraft")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
