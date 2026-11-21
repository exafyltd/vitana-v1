/**
 * VTID-05524 — `/commerce/health-orders` and `/commerce/health-orders/inbox`,
 * the native twin of src/pages/CommerceHealthOrders.tsx (mobile branch: the
 * stacked cards, `md:hidden`). A partner org's staff / professional members
 * see and act on their health-test orders through the org-scoped
 * `/api/v1/admin/partner-health/*` routes: Orders (status select or a badge
 * when the member cannot act, Upload result), Inbox for org admins / staff
 * only (Resolve → confirm-match; the member-link badge), Refresh, the upload
 * and confirm-match dialogs, the web's toasts. `/inbox` opens on the Inbox tab
 * (the business bottom bar points there). A failed list reads as empty, as on
 * the web (no separate error panel). Membership is read client-side
 * (`/partner-orgs/mine`), enforced server-side.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Button, PressableRow, Tabs, TabsContent, TabsList, TabsTrigger, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  BizIcon,
  Input,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Textarea,
} from '../../ports/business-ui';
import { confirmMatchErrorKey, memberLinkBadgeKey, type PartnerHealthInboxRow, type PartnerHealthOrder } from '../../ports/commerce';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { useCommerceOrgs, useConfirmPartnerInboxMatch, usePartnerHealthInbox, usePartnerHealthOrders, usePatchPartnerOrderStatus, useUploadPartnerOrderResult } from './data/hooks';
import { fmtDateTime } from './format';
import { ToneBadge } from './components/Cards';
import { CollectionSkeleton, Panel, SelectField } from './components/parts';

const STATUS_OPTIONS = ['ordered', 'sample_kit_shipped', 'sample_received', 'processing', 'delivered', 'cancelled', 'failed'];
/** The web's example result, the textarea's placeholder (data, not copy). */
const UPLOAD_PLACEHOLDER = '{\n  "result_date": "2026-09-14",\n  "biomarkers": [\n    { "name": "LDL Cholesterol", "value": 130, "unit": "mg/dL", "ref_low": 0, "ref_high": 100 }\n  ]\n}';

function partnerName(row: { partner_registry?: { display_name: string } | { display_name: string }[] | null }): string {
  const pr = row.partner_registry;
  const name = Array.isArray(pr) ? pr[0]?.display_name : pr?.display_name;
  return name ?? '—';
}

export function CommerceHealthOrdersScreen(): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const initialTab = usePathname().endsWith('/inbox') ? 'inbox' : 'orders';
  const myOrgsQuery = useCommerceOrgs();
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

  const submitStatus = (orderId: string, status: string) =>
    patchStatus.mutate({ orderId, status }, { onSuccess: () => notify('screens.admin.statusUpdated'), onError: () => notifyError('toasts.admin.bulkActionFailed') });

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
      { inboxId: resolveRow.id, matched_user_id: resolveUserId, matched_tenant_id: resolveTenantId, test_name: resolveTestName, external_order_ref: resolveOrderRef || null },
      {
        onSuccess: () => {
          notify('screens.admin.matchProposed');
          setResolveRow(null);
          setResolveUserId('');
          setResolveTenantId('');
          setResolveTestName('');
          setResolveOrderRef('');
        },
        onError: (err) => notifyError(confirmMatchErrorKey(err)),
      },
    );
  };

  const orders = ordersQuery.data ?? [];
  const openInbox = (inboxQuery.data ?? []).filter((r) => !r.resolved);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-commerce-health-orders">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text size="2xl" weight="600" accessibilityRole="header">
          {t('screens.commerceportal.healthOrders.pageTitle')}
        </Text>
        <View style={styles.body}>
          {myOrgsQuery.isPending ? (
            <CollectionSkeleton testID="health-orders-loading" label={t('common.loading')} />
          ) : !isMember ? (
            <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]} testID="health-orders-not-member">
              <Text weight="500" style={styles.center}>
                {t('screens.commerceportal.healthOrders.notAMemberTitle')}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('screens.commerceportal.healthOrders.notAMemberBody')}
              </Text>
            </View>
          ) : ordersQuery.isLoading ? (
            <CollectionSkeleton testID="health-orders-loading" label={t('common.loading')} />
          ) : (
            <Tabs key={initialTab} defaultValue={hasFullAccess ? initialTab : 'orders'}>
              <View style={styles.tabsRow}>
                <TabsList>
                  <TabsTrigger value="orders" testID="health-tab-orders">{`${t('screens.admin.orders')} (${orders.length})`}</TabsTrigger>
                  {hasFullAccess ? <TabsTrigger value="inbox" testID="health-tab-inbox">{`${t('screens.admin.inbox')} (${openInbox.length})`}</TabsTrigger> : null}
                </TabsList>
                <PressableRow
                  accessibilityLabel={t('common.refresh')}
                  testID="health-refresh"
                  style={[styles.refresh, { borderColor: colors.border }]}
                  onPress={() => {
                    void ordersQuery.refetch();
                    if (hasFullAccess) void inboxQuery.refetch();
                  }}
                >
                  <BizIcon name="RefreshCw" size={16} />
                </PressableRow>
              </View>
              <TabsContent value="orders">
                {orders.length === 0 ? (
                  <Panel testID="health-orders-empty">
                    <Text muted style={styles.center}>
                      {t('screens.admin.noOrdersYet')}
                    </Text>
                  </Panel>
                ) : (
                  <View style={styles.list}>
                    {orders.map((o) => (
                      <Panel key={o.id} testID={`order-${o.id}`}>
                        <View style={styles.between}>
                          <View style={styles.fill}>
                            <Text weight="500" numberOfLines={1}>
                              {o.test_name}
                            </Text>
                            <Text size="xs" muted>
                              {o.external_order_ref ?? '—'}
                            </Text>
                          </View>
                          {!canActOn(o) ? <ToneBadge label={o.status} tone="neutral" testID={`order-status-${o.id}`} /> : null}
                        </View>
                        <Text size="sm" muted>
                          {partnerName(o)}
                        </Text>
                        <Text size="xs" muted>
                          {fmtDateTime(o.status_updated_at, language)}
                        </Text>
                        {canActOn(o) ? (
                          <View style={styles.gap}>
                            <SelectField
                              value={o.status}
                              onChange={(v) => submitStatus(o.id, v)}
                              disabled={patchStatus.isPending || o.status === 'result_ready'}
                              options={[...(o.status === 'result_ready' ? ['result_ready'] : []), ...STATUS_OPTIONS].map((s) => ({ value: s, label: s }))}
                              accessibilityLabel={t('screens.admin.status')}
                              testID={`order-select-${o.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => {
                                setUploadOrder(o);
                                setUploadJson('');
                              }}
                              testID={`order-upload-${o.id}`}
                            >
                              <BizIcon name="Upload" size={16} />
                              {t('screens.admin.uploadResult')}
                            </Button>
                          </View>
                        ) : null}
                      </Panel>
                    ))}
                  </View>
                )}
              </TabsContent>
              {hasFullAccess ? (
                <TabsContent value="inbox">
                  {openInbox.length === 0 ? (
                    <Panel testID="health-inbox-empty">
                      <Text muted style={styles.center}>
                        {t('screens.admin.inboxEmpty')}
                      </Text>
                    </Panel>
                  ) : (
                    <View style={styles.list}>
                      {openInbox.map((row) => {
                        const badge = memberLinkBadgeKey(row.member_link_status);
                        return (
                          <Panel key={row.id} testID={`inbox-${row.id}`}>
                            <View style={styles.between}>
                              <Text size="sm" muted numberOfLines={1} style={styles.fill}>
                                {partnerName(row)}
                              </Text>
                              <View style={styles.badges}>
                                <ToneBadge label={row.reason} tone="neutral" />
                                {badge ? <ToneBadge label={t(badge)} tone="neutral" testID={`member-link-badge-${row.id}`} /> : null}
                              </View>
                            </View>
                            <Text size="xs" muted>
                              {fmtDateTime(row.created_at, language)}
                            </Text>
                            <Button size="sm" disabled={row.member_link_status === 'pending_member'} onPress={() => setResolveRow(row)} testID={`inbox-resolve-${row.id}`}>
                              <BizIcon name="CheckCircle2" size={16} color={colors.primaryForeground} />
                              {t('screens.admin.resolve')}
                            </Button>
                          </Panel>
                        );
                      })}
                    </View>
                  )}
                </TabsContent>
              ) : null}
            </Tabs>
          )}
        </View>
      </ScrollView>

      <ResponsiveDialog open={uploadOrder !== null} onOpenChange={(o: boolean) => !o && setUploadOrder(null)}>
        <ResponsiveDialogContent testID="upload-dialog">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.admin.uploadResultFor', { name: uploadOrder?.test_name ?? '' })}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <View style={styles.gap}>
              <Text size="sm" muted>
                {t('screens.admin.uploadResultHelp')}
              </Text>
              <Textarea rows={10} placeholder={UPLOAD_PLACEHOLDER} value={uploadJson} onChangeText={setUploadJson} autoCapitalize="none" autoCorrect={false} style={styles.mono} testID="upload-json" accessibilityLabel={t('screens.admin.uploadResult')} />
            </View>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter style={styles.footer}>
            <Button variant="outline" onPress={() => setUploadOrder(null)} testID="upload-cancel">
              {t('screens.admin.cancel')}
            </Button>
            <Button onPress={submitUpload} disabled={uploadResult.isPending || !uploadJson.trim()} testID="upload-submit">
              {t('screens.admin.upload')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={resolveRow !== null} onOpenChange={(o: boolean) => !o && setResolveRow(null)}>
        <ResponsiveDialogContent testID="confirm-match-dialog">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('screens.admin.confirmMatch')}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <View style={styles.gap}>
              <Text size="sm" muted>
                {t('screens.admin.confirmMatchHelp')}
              </Text>
              <Input placeholder={t('screens.admin.matchedUserId')} accessibilityLabel={t('screens.admin.matchedUserId')} value={resolveUserId} onChangeText={setResolveUserId} autoCapitalize="none" testID="match-user" />
              <Input placeholder={t('screens.admin.matchedTenantId')} accessibilityLabel={t('screens.admin.matchedTenantId')} value={resolveTenantId} onChangeText={setResolveTenantId} autoCapitalize="none" testID="match-tenant" />
              <Input placeholder={t('screens.admin.testName')} accessibilityLabel={t('screens.admin.testName')} value={resolveTestName} onChangeText={setResolveTestName} testID="match-test" />
              <Input placeholder={t('screens.admin.externalOrderRefOptional')} accessibilityLabel={t('screens.admin.externalOrderRefOptional')} value={resolveOrderRef} onChangeText={setResolveOrderRef} autoCapitalize="none" testID="match-ref" />
            </View>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter style={styles.footer}>
            <Button variant="outline" onPress={() => setResolveRow(null)} testID="match-cancel">
              {t('screens.admin.cancel')}
            </Button>
            <Button onPress={submitConfirmMatch} disabled={confirmMatch.isPending} testID="match-submit">
              {t('screens.admin.confirmMatch')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 96 },
  body: { marginTop: 24 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 56, gap: 8 },
  center: { textAlign: 'center' },
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  list: { gap: 12 },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, flexShrink: 0 },
  gap: { gap: 8 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr', fontSize: 12 },
  refresh: { borderWidth: 1, borderRadius: 8, padding: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
