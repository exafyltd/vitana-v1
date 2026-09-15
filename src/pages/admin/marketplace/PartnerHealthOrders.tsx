/**
 * VTID-03885 — Partner Health Test Integration: admin portal (Orders + Inbox).
 *
 * The fallback UI that makes DoctorBox usable today with zero DoctorBox
 * API access: an admin creates/updates orders after DoctorBox tells them
 * about a test out-of-band, uploads whatever result DoctorBox sent by
 * email/portal, and — the one hard-stop safety requirement in the whole
 * spec — an ambiguous/unmatched inbox result can only become a real order
 * via the explicit "Resolve" action below, which requires naming exactly
 * one user. Nothing here writes to the backend directly; every action
 * calls exafyltd/vitana-platform's routes/admin-partner-health.ts, which
 * itself only ever writes through services/partner-health/ingestion.ts.
 *
 * Modeled on Products.tsx's table/filter/patch pattern (same auth-header
 * helper, same GATEWAY_URL resolution, same load/toast/reload flow).
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Loader2, RefreshCw, Upload, CheckCircle2 } from "lucide-react";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_GATEWAY_BASE || "").replace(/\/+$/, "");

interface PartnerOrder {
  id: string;
  tenant_id: string;
  user_id: string;
  partner_id: string;
  external_order_ref: string | null;
  test_name: string;
  status: string;
  status_updated_at: string;
  ordered_at: string;
  partner_registry?: { display_name: string } | { display_name: string }[] | null;
}

interface InboxRow {
  id: string;
  partner_id: string;
  raw_payload: Record<string, unknown>;
  candidate_user_ids: string[];
  reason: string;
  resolved: boolean;
  created_at: string;
  partner_registry?: { display_name: string } | { display_name: string }[] | null;
}

const STATUS_OPTIONS = ['ordered', 'sample_kit_shipped', 'sample_received', 'processing', 'delivered', 'cancelled', 'failed'];

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function partnerName(row: { partner_registry?: { display_name: string } | { display_name: string }[] | null }): string {
  const pr = row.partner_registry;
  const name = Array.isArray(pr) ? pr[0]?.display_name : pr?.display_name;
  return name ?? "—";
}

export default function PartnerHealthOrders() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [uploadOrder, setUploadOrder] = useState<PartnerOrder | null>(null);
  const [uploadJson, setUploadJson] = useState("");

  const [resolveInboxRow, setResolveInboxRow] = useState<InboxRow | null>(null);
  const [resolveUserId, setResolveUserId] = useState("");
  const [resolveTenantId, setResolveTenantId] = useState("");
  const [resolveTestName, setResolveTestName] = useState("");
  const [resolveOrderRef, setResolveOrderRef] = useState("");

  const load = useCallback(async () => {
    if (!GATEWAY_URL) {
      notifyError('toasts.admin.gatewayUrlNotConfigured');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [ordersResp, inboxResp] = await Promise.all([
        fetch(`${GATEWAY_URL}/api/v1/admin/partner-health/orders`, { headers }),
        fetch(`${GATEWAY_URL}/api/v1/admin/partner-health/inbox`, { headers }),
      ]);
      if (!ordersResp.ok) throw new Error(`orders HTTP ${ordersResp.status}`);
      if (!inboxResp.ok) throw new Error(`inbox HTTP ${inboxResp.status}`);
      const ordersJson = await ordersResp.json();
      const inboxJson = await inboxResp.json();
      setOrders(ordersJson.orders ?? []);
      setInbox(inboxJson.inbox ?? []);
    } catch {
      notifyError('toasts.admin.loadFailed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchStatus(orderId: string, status: string) {
    setBusy(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/partner-health/orders/${orderId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${resp.status}`);
      }
      notify('screens.admin.statusUpdated');
      await load();
    } catch {
      notifyError('toasts.admin.bulkActionFailed');
    } finally {
      setBusy(false);
    }
  }

  async function submitUploadResult() {
    if (!uploadOrder) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(uploadJson);
    } catch {
      notifyError('toasts.admin.invalidJson');
      return;
    }
    setBusy(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/partner-health/inbox/${uploadOrder.id}/upload-result`, {
        method: "POST",
        headers,
        body: JSON.stringify({ order_id: uploadOrder.id, partner_key: 'doctorbox', result: parsed }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${resp.status}`);
      }
      notify('screens.admin.resultUploaded');
      setUploadOrder(null);
      setUploadJson("");
      await load();
    } catch {
      notifyError('toasts.admin.bulkActionFailed');
    } finally {
      setBusy(false);
    }
  }

  async function submitConfirmMatch() {
    if (!resolveInboxRow) return;
    if (!resolveUserId || !resolveTenantId || !resolveTestName) {
      notifyError('toasts.admin.confirmMatchRequiresFields');
      return;
    }
    setBusy(true);
    try {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_URL}/api/v1/admin/partner-health/inbox/${resolveInboxRow.id}/confirm-match`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          matched_user_id: resolveUserId,
          matched_tenant_id: resolveTenantId,
          test_name: resolveTestName,
          external_order_ref: resolveOrderRef || null,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${resp.status}`);
      }
      notify('screens.admin.matchConfirmed');
      setResolveInboxRow(null);
      setResolveUserId("");
      setResolveTenantId("");
      setResolveTestName("");
      setResolveOrderRef("");
      await load();
    } catch {
      notifyError('toasts.admin.bulkActionFailed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <SEO
        title={t('screens.admin.partnerHealthOrders')}
        description="Partner Health Test Integration — orders and the quarantine inbox."
        canonical={typeof window !== "undefined" ? window.location.href : ""}
      />
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          <StandardHeader
            title={t('screens.admin.partnerHealthOrders')}
            description="DoctorBox (Partner #001) test orders + the quarantine inbox for results that couldn't be safely auto-matched."
          />

          {loading ? (
            <div className="p-8 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('screens.admin.loading')}
            </div>
          ) : (
            <Tabs defaultValue="orders">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="orders">{t('screens.admin.orders')} ({orders.length})</TabsTrigger>
                  <TabsTrigger value="inbox">{t('screens.admin.inbox')} ({inbox.filter((r) => !r.resolved).length})</TabsTrigger>
                </TabsList>
                <Button size="sm" variant="outline" onClick={load} disabled={busy}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <TabsContent value="orders" className="mt-4">
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="p-3 text-left font-medium">{t('screens.admin.testColumn')}</th>
                          <th className="p-3 text-left font-medium">{t('screens.admin.partner')}</th>
                          <th className="p-3 text-left font-medium">{t('screens.admin.status')}</th>
                          <th className="p-3 text-left font-medium">{t('screens.admin.updated')}</th>
                          <th className="p-3 text-left font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('screens.admin.noOrdersYet')}</td></tr>
                        ) : orders.map((o) => (
                          <tr key={o.id} className="border-b last:border-b-0">
                            <td className="p-3">
                              <div className="font-medium">{o.test_name}</div>
                              <div className="text-xs text-muted-foreground">{o.external_order_ref ?? "—"}</div>
                            </td>
                            <td className="p-3">{partnerName(o)}</td>
                            <td className="p-3">
                              <select
                                className="border rounded px-2 py-1 text-sm bg-background"
                                value={o.status}
                                disabled={busy || o.status === 'result_ready'}
                                onChange={(e) => patchStatus(o.id, e.target.value)}
                              >
                                {o.status === 'result_ready' && <option value="result_ready">result_ready</option>}
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(o.status_updated_at).toLocaleString()}</td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => { setUploadOrder(o); setUploadJson(""); }}>
                                <Upload className="w-4 h-4 mr-1" /> {t('screens.admin.uploadResult')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inbox" className="mt-4">
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="p-3 text-left font-medium">{t('screens.admin.partner')}</th>
                          <th className="p-3 text-left font-medium">{t('screens.admin.reason')}</th>
                          <th className="p-3 text-left font-medium">{t('screens.admin.received')}</th>
                          <th className="p-3 text-left font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {inbox.filter((r) => !r.resolved).length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">{t('screens.admin.inboxEmpty')}</td></tr>
                        ) : inbox.filter((r) => !r.resolved).map((row) => (
                          <tr key={row.id} className="border-b last:border-b-0">
                            <td className="p-3">{partnerName(row)}</td>
                            <td className="p-3"><Badge variant="secondary">{row.reason}</Badge></td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                            <td className="p-3 text-right">
                              <Button size="sm" onClick={() => setResolveInboxRow(row)}>
                                <CheckCircle2 className="w-4 h-4 mr-1" /> {t('screens.admin.resolve')}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Upload result dialog */}
      <ResponsiveDialog open={uploadOrder !== null} onOpenChange={(o) => { if (!o) setUploadOrder(null); }}>
        <ResponsiveDialogContent className="sm:max-w-[560px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.admin.uploadResultFor', { name: uploadOrder?.test_name ?? '' })}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <p className="text-sm text-muted-foreground mb-2">
              {t('screens.admin.uploadResultHelp')}
            </p>
            <Textarea
              rows={10}
              className="font-mono text-xs"
              placeholder={'{\n  "result_date": "2026-09-14",\n  "biomarkers": [\n    { "name": "LDL Cholesterol", "value": 130, "unit": "mg/dL", "ref_low": 0, "ref_high": 100 }\n  ]\n}'}
              value={uploadJson}
              onChange={(e) => setUploadJson(e.target.value)}
            />
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setUploadOrder(null)}>{t('screens.admin.cancel')}</Button>
            <Button onClick={submitUploadResult} disabled={busy || !uploadJson.trim()}>{t('screens.admin.upload')}</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Confirm-match dialog — the hard-stop step */}
      <ResponsiveDialog open={resolveInboxRow !== null} onOpenChange={(o) => { if (!o) setResolveInboxRow(null); }}>
        <ResponsiveDialogContent className="sm:max-w-[520px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.admin.confirmMatch')}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('screens.admin.confirmMatchHelp')}</p>
            <Input placeholder={t('screens.admin.matchedUserId')} value={resolveUserId} onChange={(e) => setResolveUserId(e.target.value)} />
            <Input placeholder={t('screens.admin.matchedTenantId')} value={resolveTenantId} onChange={(e) => setResolveTenantId(e.target.value)} />
            <Input placeholder={t('screens.admin.testName')} value={resolveTestName} onChange={(e) => setResolveTestName(e.target.value)} />
            <Input placeholder={t('screens.admin.externalOrderRefOptional')} value={resolveOrderRef} onChange={(e) => setResolveOrderRef(e.target.value)} />
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setResolveInboxRow(null)}>{t('screens.admin.cancel')}</Button>
            <Button onClick={submitConfirmMatch} disabled={busy}>{t('screens.admin.confirmMatch')}</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </AppLayout>
  );
}
