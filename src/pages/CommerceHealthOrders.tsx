/**
 * Commerce Partner Onboarding, Phase 4 (VTID-03951) — a partner org's own
 * staff/professional members see and act on their health-test orders here,
 * against the gateway's already org-scoped `/api/v1/admin/partner-health/*`
 * routes (Phase 1, VTID-03932).
 *
 * Deliberately NOT under `/professional/*` — that route tree is gated by
 * the Vitana-wide `dbRole`, a completely different axis from
 * `partner_organization_members` membership, which is what actually gates
 * every route this page calls. This lives alongside `PartnerOrgRoster.tsx`
 * in Commerce Portal instead, gated the same way that drawer already is:
 * client-side via `GET /partner-orgs/mine`, enforced server-side per-route.
 *
 * A `professional`-only member only ever sees orders assigned to them and
 * never the "Inbox" tab (`hasFullAccess` below) — the backend 403s those
 * routes for them regardless, but the UI doesn't render a control that
 * would only ever fail.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CommerceShell } from '@/components/commerce/CommerceShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useMyPartnerOrgs } from '@/hooks/useOrgMembers';
import {
  usePartnerHealthOrders,
  usePartnerHealthInbox,
  usePatchPartnerOrderStatus,
  useUploadPartnerOrderResult,
  useConfirmPartnerInboxMatch,
  type PartnerHealthOrder,
  type PartnerHealthInboxRow,
} from '@/hooks/usePartnerHealthOrders';
import { t, notify, notifyError } from '@/lib/i18n-toast';

const panelClass = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4';
const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

const STATUS_OPTIONS = ['ordered', 'sample_kit_shipped', 'sample_received', 'processing', 'delivered', 'cancelled', 'failed'];

function partnerName(row: { partner_registry?: { display_name: string } | { display_name: string }[] | null }): string {
  const pr = row.partner_registry;
  const name = Array.isArray(pr) ? pr[0]?.display_name : pr?.display_name;
  return name ?? '—';
}

export default function CommerceHealthOrders() {
  const { user } = useAuth();
  const myOrgsQuery = useMyPartnerOrgs();
  const hasFullAccess = (myOrgsQuery.data ?? []).some((o) => o.role === 'org_admin' || o.role === 'staff');
  const isMember = (myOrgsQuery.data?.length ?? 0) > 0;

  const ordersQuery = usePartnerHealthOrders();
  const inboxQuery = usePartnerHealthInbox(isMember && hasFullAccess);
  const patchStatus = usePatchPartnerOrderStatus();
  const uploadResult = useUploadPartnerOrderResult();
  const confirmMatch = useConfirmPartnerInboxMatch();

  const [uploadOrder, setUploadOrder] = useState<PartnerHealthOrder | null>(null);
  const [uploadJson, setUploadJson] = useState('');

  const [resolveRow, setResolveRow] = useState<PartnerHealthInboxRow | null>(null);
  const [resolveUserId, setResolveUserId] = useState('');
  const [resolveTenantId, setResolveTenantId] = useState('');
  const [resolveTestName, setResolveTestName] = useState('');
  const [resolveOrderRef, setResolveOrderRef] = useState('');

  const canActOn = (order: PartnerHealthOrder) => hasFullAccess || order.assigned_professional_user_id === user?.id;

  const submitStatus = (orderId: string, status: string) => {
    patchStatus.mutate(
      { orderId, status },
      {
        onSuccess: () => notify('screens.admin.statusUpdated'),
        onError: () => notifyError('toasts.admin.bulkActionFailed'),
      },
    );
  };

  const submitUpload = () => {
    if (!uploadOrder) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(uploadJson);
    } catch {
      notifyError('toasts.admin.invalidJson');
      return;
    }
    uploadResult.mutate(
      { orderId: uploadOrder.id, result: parsed },
      {
        onSuccess: () => {
          notify('screens.admin.resultUploaded');
          setUploadOrder(null);
          setUploadJson('');
        },
        onError: () => notifyError('toasts.admin.bulkActionFailed'),
      },
    );
  };

  const submitConfirmMatch = () => {
    if (!resolveRow) return;
    if (!resolveUserId || !resolveTenantId || !resolveTestName) {
      notifyError('toasts.admin.confirmMatchRequiresFields');
      return;
    }
    confirmMatch.mutate(
      {
        inboxId: resolveRow.id,
        matched_user_id: resolveUserId,
        matched_tenant_id: resolveTenantId,
        test_name: resolveTestName,
        external_order_ref: resolveOrderRef || null,
      },
      {
        onSuccess: () => {
          notify('screens.admin.matchConfirmed');
          setResolveRow(null);
          setResolveUserId('');
          setResolveTenantId('');
          setResolveTestName('');
          setResolveOrderRef('');
        },
        onError: () => notifyError('toasts.admin.bulkActionFailed'),
      },
    );
  };

  return (
    <CommerceShell>
      <div className="pt-8">
        <Link
          to="/commerce"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('screens.commerceportal.portalEyebrow')}
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-100">
          {t('screens.commerceportal.healthOrders.pageTitle')}
        </h1>

        <div className="mt-6">
          {myOrgsQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : !isMember ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-5 py-14 text-center">
              <p className="font-medium text-slate-200">{t('screens.commerceportal.healthOrders.notAMemberTitle')}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                {t('screens.commerceportal.healthOrders.notAMemberBody')}
              </p>
            </div>
          ) : ordersQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : (
            <Tabs defaultValue="orders">
              <div className="flex items-center justify-between">
                <TabsList className="border border-slate-800 bg-slate-900/60">
                  <TabsTrigger value="orders">
                    {t('screens.admin.orders')} ({ordersQuery.data?.length ?? 0})
                  </TabsTrigger>
                  {hasFullAccess && (
                    <TabsTrigger value="inbox">
                      {t('screens.admin.inbox')} ({(inboxQuery.data ?? []).filter((r) => !r.resolved).length})
                    </TabsTrigger>
                  )}
                </TabsList>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                  onClick={() => {
                    void ordersQuery.refetch();
                    if (hasFullAccess) void inboxQuery.refetch();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <TabsContent value="orders" className="mt-4">
                {(ordersQuery.data ?? []).length === 0 ? (
                  <div className={`${panelClass} py-10 text-center text-slate-500`}>
                    {t('screens.admin.noOrdersYet')}
                  </div>
                ) : (
                  <>
                    {/* Desktop: table */}
                    <div className={`hidden md:block ${panelClass}`}>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800">
                            <TableHead className="text-slate-500">{t('screens.admin.testColumn')}</TableHead>
                            <TableHead className="text-slate-500">{t('screens.admin.partner')}</TableHead>
                            <TableHead className="text-slate-500">{t('screens.admin.status')}</TableHead>
                            <TableHead className="text-slate-500">{t('screens.admin.updated')}</TableHead>
                            <TableHead className="w-[140px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordersQuery.data!.map((o) => (
                            <TableRow key={o.id} className="border-slate-800/60">
                              <TableCell>
                                <div className="font-medium text-slate-100">{o.test_name}</div>
                                <div className="text-xs text-slate-500">{o.external_order_ref ?? '—'}</div>
                              </TableCell>
                              <TableCell className="text-slate-300">{partnerName(o)}</TableCell>
                              <TableCell>
                                {canActOn(o) ? (
                                  <Select
                                    value={o.status}
                                    onValueChange={(v) => submitStatus(o.id, v)}
                                    disabled={patchStatus.isPending || o.status === 'result_ready'}
                                  >
                                    <SelectTrigger className="w-[180px] border-slate-700 bg-slate-950/70 text-slate-100 focus-visible:ring-amber-500">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {o.status === 'result_ready' && (
                                        <SelectItem value="result_ready">result_ready</SelectItem>
                                      )}
                                      {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline" className="border-slate-600/60 text-slate-300">
                                    {o.status}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {new Date(o.status_updated_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-end">
                                {canActOn(o) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                                    onClick={() => {
                                      setUploadOrder(o);
                                      setUploadJson('');
                                    }}
                                  >
                                    <Upload className="me-1 h-4 w-4" />
                                    {t('screens.admin.uploadResult')}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile: stacked cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {ordersQuery.data!.map((o) => (
                        <div key={o.id} className={panelClass}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-100">{o.test_name}</div>
                              <div className="text-xs text-slate-500">{o.external_order_ref ?? '—'}</div>
                            </div>
                            {!canActOn(o) && (
                              <Badge variant="outline" className="shrink-0 border-slate-600/60 text-slate-300">
                                {o.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-slate-300">{partnerName(o)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {new Date(o.status_updated_at).toLocaleString()}
                          </div>
                          {canActOn(o) && (
                            <div className="mt-3 flex flex-col gap-2">
                              <Select
                                value={o.status}
                                onValueChange={(v) => submitStatus(o.id, v)}
                                disabled={patchStatus.isPending || o.status === 'result_ready'}
                              >
                                <SelectTrigger className="w-full border-slate-700 bg-slate-950/70 text-slate-100 focus-visible:ring-amber-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {o.status === 'result_ready' && (
                                    <SelectItem value="result_ready">result_ready</SelectItem>
                                  )}
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                                onClick={() => {
                                  setUploadOrder(o);
                                  setUploadJson('');
                                }}
                              >
                                <Upload className="me-1 h-4 w-4" />
                                {t('screens.admin.uploadResult')}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {hasFullAccess && (
                <TabsContent value="inbox" className="mt-4">
                  {(inboxQuery.data ?? []).filter((r) => !r.resolved).length === 0 ? (
                    <div className={`${panelClass} py-10 text-center text-slate-500`}>
                      {t('screens.admin.inboxEmpty')}
                    </div>
                  ) : (
                    <>
                      {/* Desktop: table */}
                      <div className={`hidden md:block ${panelClass}`}>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-800">
                              <TableHead className="text-slate-500">{t('screens.admin.partner')}</TableHead>
                              <TableHead className="text-slate-500">{t('screens.admin.reason')}</TableHead>
                              <TableHead className="text-slate-500">{t('screens.admin.received')}</TableHead>
                              <TableHead className="w-[120px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inboxQuery
                              .data!.filter((r) => !r.resolved)
                              .map((row) => (
                                <TableRow key={row.id} className="border-slate-800/60">
                                  <TableCell className="text-slate-300">{partnerName(row)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="border-slate-600/60 text-slate-300">
                                      {row.reason}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {new Date(row.created_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-end">
                                    <Button
                                      size="sm"
                                      className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                                      onClick={() => setResolveRow(row)}
                                    >
                                      <CheckCircle2 className="me-1 h-4 w-4" />
                                      {t('screens.admin.resolve')}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile: stacked cards */}
                      <div className="flex flex-col gap-3 md:hidden">
                        {inboxQuery
                          .data!.filter((r) => !r.resolved)
                          .map((row) => (
                            <div key={row.id} className={panelClass}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 truncate text-sm text-slate-300">{partnerName(row)}</div>
                                <Badge variant="outline" className="shrink-0 border-slate-600/60 text-slate-300">
                                  {row.reason}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {new Date(row.created_at).toLocaleString()}
                              </div>
                              <Button
                                size="sm"
                                className="mt-3 w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                                onClick={() => setResolveRow(row)}
                              >
                                <CheckCircle2 className="me-1 h-4 w-4" />
                                {t('screens.admin.resolve')}
                              </Button>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>

      {/* Upload result dialog */}
      <Dialog open={uploadOrder !== null} onOpenChange={(o) => !o && setUploadOrder(null)}>
        <DialogContent className="max-w-lg border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{t('screens.admin.uploadResultFor', { name: uploadOrder?.test_name ?? '' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">{t('screens.admin.uploadResultHelp')}</p>
          <Textarea
            rows={10}
            className={`font-mono text-xs ${fieldClass}`}
            placeholder={'{\n  "result_date": "2026-09-14",\n  "biomarkers": [\n    { "name": "LDL Cholesterol", "value": 130, "unit": "mg/dL", "ref_low": 0, "ref_high": 100 }\n  ]\n}'}
            value={uploadJson}
            onChange={(e) => setUploadJson(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
              onClick={() => setUploadOrder(null)}
            >
              {t('screens.admin.cancel')}
            </Button>
            <Button
              className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              onClick={submitUpload}
              disabled={uploadResult.isPending || !uploadJson.trim()}
            >
              {t('screens.admin.upload')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm-match dialog */}
      <Dialog open={resolveRow !== null} onOpenChange={(o) => !o && setResolveRow(null)}>
        <DialogContent className="max-w-lg border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{t('screens.admin.confirmMatch')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">{t('screens.admin.confirmMatchHelp')}</p>
          <div className="space-y-3">
            <Input
              placeholder={t('screens.admin.matchedUserId')}
              value={resolveUserId}
              onChange={(e) => setResolveUserId(e.target.value)}
              className={fieldClass}
            />
            <Input
              placeholder={t('screens.admin.matchedTenantId')}
              value={resolveTenantId}
              onChange={(e) => setResolveTenantId(e.target.value)}
              className={fieldClass}
            />
            <Input
              placeholder={t('screens.admin.testName')}
              value={resolveTestName}
              onChange={(e) => setResolveTestName(e.target.value)}
              className={fieldClass}
            />
            <Input
              placeholder={t('screens.admin.externalOrderRefOptional')}
              value={resolveOrderRef}
              onChange={(e) => setResolveOrderRef(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
              onClick={() => setResolveRow(null)}
            >
              {t('screens.admin.cancel')}
            </Button>
            <Button
              className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              onClick={submitConfirmMatch}
              disabled={confirmMatch.isPending}
            >
              {t('screens.admin.confirmMatch')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CommerceShell>
  );
}
