/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — Chunk 7: admin review queue for
 * community-marketplace listing reports. Modeled on
 * src/pages/admin/marketplace/Products.tsx's shell.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminCommunityMarketplaceNavigation } from "@/config/navigation";
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { notify, notifyError, t } from "@/lib/i18n-toast";
import { formatDistanceToNow } from "@/lib/locale-format";
import { fmtNumber } from "@/lib/locale-format";

// VITE_GATEWAY_URL already ends in /api/v1 (e.g. "https://gateway.vitanaland.com/api/v1"),
// so it can't be the prefix for these `${GATEWAY_URL}/api/v1/admin/...` calls below —
// prefer the suffix-free VITE_GATEWAY_BASE, falling back to stripping the suffix.
const GATEWAY_URL = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "")
).replace(/\/+$/, "");

type ReportReason = "prohibited_item" | "misleading" | "counterfeit" | "spam" | "offensive" | "scam" | "other";

const PAGE_SIZE = 50;

interface AdminReport {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_status: string | null;
  seller_user_id: string | null;
  reporter_user_id: string;
  report_reason: ReportReason;
  report_note: string | null;
  status: "received" | "under_review" | "actioned" | "dismissed";
  admin_notes: string | null;
  created_at: string;
}

const REASON_LABEL_KEYS: Record<ReportReason, string> = {
  prohibited_item: "screens.communityMarketplace.reportReasonProhibited",
  counterfeit: "screens.communityMarketplace.reportReasonCounterfeit",
  misleading: "screens.communityMarketplace.reportReasonMisleading",
  scam: "screens.communityMarketplace.reportReasonScam",
  spam: "screens.communityMarketplace.reportReasonSpam",
  offensive: "screens.communityMarketplace.reportReasonOffensive",
  other: "screens.communityMarketplace.reportReasonOther",
};

const REPORT_STATUS_LABEL_KEYS: Record<AdminReport["status"], string> = {
  received: "screens.admin.communityMarketplaceReportStatusReceived",
  under_review: "screens.admin.communityMarketplaceReportStatusUnderReview",
  actioned: "screens.admin.communityMarketplaceReportStatusActioned",
  dismissed: "screens.admin.communityMarketplaceReportStatusDismissed",
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function AdminCommunityMarketplaceReports() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [items, setItems] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);

  const statusFilter = searchParams.get("status");

  const load = useCallback(async (offset: number) => {
    if (!GATEWAY_URL) {
      notifyError("toasts.admin.gatewayUrlNotConfigured");
      setLoading(false);
      return;
    }
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/community-marketplace/reports?${params.toString()}`, { headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setItems((prev) => (offset === 0 ? json.items ?? [] : [...prev, ...(json.items ?? [])]));
      setTotal(json.total ?? 0);
    } catch {
      notifyError("toasts.admin.loadFailed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load(0);
  }, [load]);

  const canLoadMore = items.length < total;
  const handleLoadMore = () => load(items.length);

  async function resolveReport(id: string, status: "actioned" | "dismissed") {
    if (!GATEWAY_URL) return;
    setBusyId(id);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/community-marketplace/reports/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      notify("toasts.admin.communityMarketplaceReportUpdated");
      await load(0);
    } catch {
      notifyError("toasts.admin.communityMarketplaceReportUpdateFailed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <SEO
        title={t("screens.admin.communityMarketplaceReportsTitle")}
        description={t("screens.admin.communityMarketplaceReportsDescription")}
        canonical={typeof window !== "undefined" ? window.location.href : ""}
      />
      <SubNavigation items={adminCommunityMarketplaceNavigation} />
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          <StandardHeader
            title={t("screens.admin.communityMarketplaceReportsTitle")}
            description={t("screens.admin.communityMarketplaceReportsDescription")}
          />

          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
              <Button size="sm" variant="outline" onClick={() => load(0)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">{t("screens.admin.value0Total", { value0: fmtNumber(total) })}</span>
            </CardContent>
          </Card>

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("screens.admin.loading")}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-medium">{t("screens.admin.communityMarketplaceNoReports")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-3 text-left font-medium">{t("screens.admin.communityMarketplaceReportedListing")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.communityMarketplace.reportDialogTitle")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.status")}</th>
                      <th className="p-3 text-left font-medium">{t("screens.admin.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="p-3">
                          <Link to={`/discover/community-marketplace/${r.listing_id}`} className="font-medium hover:underline" target="_blank" rel="noreferrer">
                            {r.listing_title ?? r.listing_id}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {t("screens.communityMarketplace.postedTimeAgo", { time: formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) })}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{t(REASON_LABEL_KEYS[r.report_reason])}</Badge>
                          {r.report_note && <div className="text-xs text-muted-foreground mt-1 max-w-xs">{r.report_note}</div>}
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === "received" || r.status === "under_review" ? "default" : "outline"}>
                            {t(REPORT_STATUS_LABEL_KEYS[r.status])}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {(r.status === "received" || r.status === "under_review") && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, "actioned")} disabled={busyId === r.id}>
                                <CheckCircle2 className="w-4 h-4 mr-1" /> {t("screens.admin.communityMarketplaceMarkActioned")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, "dismissed")} disabled={busyId === r.id}>
                                <XCircle className="w-4 h-4 mr-1" /> {t("screens.admin.dismiss")}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {!loading && canLoadMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t("screens.communityMarketplace.loadMore")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
