/**
 * VTID-05524 — native twin of src/components/commerce/ConnectionWorkbench.tsx:
 * one connection as a drawer on the portal (opened from `?connection=<id>`,
 * so `/commerce/connections/:id` and old links keep working). Same owner-
 * scoped calls (`/vcaop/portal/my/connections/:id`, `/mapping-preview`,
 * `/activation-summary`, mapping decisions, sandbox tests, pause / resume /
 * reauthorize / revoke), same deliberate omission (no activation button).
 *
 * Shopify / SMART-on-FHIR connect: the web sends the browser to the returned
 * `authorize_url`; natively it opens in the in-app system browser and, when
 * the member is back (browser closed, AppState active or focus), the
 * connection is re-read with a short bounded poll (data/external.ts) — the
 * web's return to the portal, which loads the connection afresh. The mapping
 * table is the phone's stacked rows. Revoke asks first (the web's
 * `window.confirm` → the system alert).
 */
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, notifyError, useUITheme } from '../../../ports/ui';
import { BizIcon, Input, Sheet, SheetContent, SheetHeader, SheetTitle, withAlpha } from '../../../ports/business-ui';
import { MY_PORTAL_API, platformName } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { useHostedPageReturn } from '../data/external';
import { ConnectionProgress, ToneBadge } from './Cards';
import { CenterSpinner, Panel } from './parts';

type Mapping = { id: string; source_schema: string; source_field: string; canonical_entity: string; canonical_field: string; confidence: number; decided_by: string; sensitive: boolean };
type Detail = { id: string; name: string; connector_id: string; provider_id: string; state: string };
type Preview = { state: string; pipeline_status: string; mappings: Mapping[]; pending_review: string[] };
type Activation = { state: string; version: string | null; certification: { status: string } | null; awaiting_platform_approval: boolean };

export function ConnectionWorkbench({ connectionId, onClose, onChanged }: { connectionId: string | null; onClose: () => void; onChanged: () => void | Promise<void> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [fhirBaseUrl, setFhirBaseUrl] = useState('');
  const [fhirClientId, setFhirClientId] = useState('');
  const [fhirClientSecret, setFhirClientSecret] = useState('');
  const [fhirScope, setFhirScope] = useState('');
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    if (!connectionId) return;
    try {
      const [d, p, a] = await Promise.all([
        commerceFetch(`${MY_PORTAL_API}/connections/${connectionId}`),
        commerceFetch(`${MY_PORTAL_API}/connections/${connectionId}/mapping-preview`),
        commerceFetch(`${MY_PORTAL_API}/connections/${connectionId}/activation-summary`),
      ]);
      setDetail(d.data);
      setPreview(p.data);
      setActivation(a.data);
    } catch {
      notifyError('screens.partnerportal.loadFailed');
    }
  }, [connectionId]);

  useEffect(() => {
    setDetail(null);
    setPreview(null);
    setActivation(null);
    void load();
  }, [load]);

  const hosted = useHostedPageReturn(async () => {
    await load();
    await onChanged();
  });

  const act = async (key: string, path: string, init?: RequestInit) => {
    setBusy(key);
    try {
      await commerceFetch(`${MY_PORTAL_API}/connections/${connectionId}${path}`, { method: 'POST', ...init });
      await load();
      await onChanged();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setBusy(null);
    }
  };

  const decide = (mappingId: string, decision: 'approve' | 'reject') => act(`decide-${mappingId}`, '/mapping-decisions', { body: JSON.stringify({ mapping_id: mappingId, decision }) });

  const connectOauth = async (path: string, body: Record<string, unknown>) => {
    setConnecting(true);
    try {
      const res = await commerceFetch(`${MY_PORTAL_API}/connections/${connectionId}${path}`, { method: 'POST', body: JSON.stringify(body) });
      if (res?.data?.authorize_url) {
        setConnecting(false);
        await hosted.open(res.data.authorize_url);
        return;
      }
      notifyError('screens.commerceportal.connectOauth.failed');
    } catch (err) {
      if (err instanceof Error && err.message === 'not_configured') notifyError('screens.commerceportal.connectOauth.notConfigured');
      else notifyError('screens.commerceportal.connectOauth.failed');
    } finally {
      setConnecting(false);
    }
  };

  const confirmRevoke = () =>
    Alert.alert(t('screens.partnerportal.revoke'), t('screens.partnerportal.revokeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('screens.partnerportal.revoke'), style: 'destructive', onPress: () => void act('revoke', '/revoke') },
    ]);

  const state = detail?.state ?? '';
  const canTest = state === 'mapping' || state === 'testing' || state === 'approval_required' || state === 'failed';
  const needsOauthConnect = (state === 'discovered' || state === 'authorization_required') && (detail?.connector_id === 'shopify' || detail?.connector_id === 'smart_fhir');

  return (
    <Sheet open={connectionId !== null} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent side="end" style={styles.sheet} testID="connection-workbench">
        {!detail ? (
          <CenterSpinner testID="workbench-loading" />
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SheetHeader>
              <SheetTitle>
                <Text size="lg" weight="600" numberOfLines={1} testID="workbench-name">
                  {detail.name}
                </Text>
              </SheetTitle>
              <Text size="xs" muted numberOfLines={1}>
                {platformName(detail.connector_id) ?? t('screens.commerceportal.connect.customApi')}
              </Text>
            </SheetHeader>

            <Panel>
              <View style={styles.row}>
                <View style={styles.fill}>
                  <ConnectionProgress state={state} />
                </View>
                <ToneBadge label={t(`screens.partnerportal.states.${state}`)} tone="neutral" testID="workbench-state" />
              </View>
            </Panel>

            {needsOauthConnect ? (
              <Panel testID="workbench-oauth">
                <Text size="sm" weight="500">
                  {t('screens.commerceportal.connectOauth.title')}
                </Text>
                {detail.connector_id === 'shopify' ? (
                  <View style={styles.gap}>
                    <Text size="sm" muted>
                      {t('screens.commerceportal.connectOauth.shopifyHint')}
                    </Text>
                    <Input value={shopDomain} onChangeText={setShopDomain} placeholder={t('screens.commerceportal.connectOauth.shopifyDomainPlaceholder')} accessibilityLabel={t('screens.commerceportal.connectOauth.shopifyDomainPlaceholder')} autoCapitalize="none" autoCorrect={false} testID="workbench-shop" />
                    <Button disabled={connecting || !shopDomain.trim()} onPress={() => void connectOauth('/shopify/authorize', { shop: shopDomain.trim() })} testID="workbench-shopify">
                      {connecting ? t('screens.commerceportal.connectOauth.connecting') : t('screens.commerceportal.connectOauth.shopifyButton')}
                    </Button>
                  </View>
                ) : (
                  <View style={styles.gap}>
                    <Text size="sm" muted>
                      {t('screens.commerceportal.connectOauth.fhirHint')}
                    </Text>
                    <Input type="url" value={fhirBaseUrl} onChangeText={setFhirBaseUrl} placeholder={t('screens.commerceportal.connectOauth.fhirBaseUrlPlaceholder')} accessibilityLabel={t('screens.commerceportal.connectOauth.fhirBaseUrlPlaceholder')} autoCapitalize="none" testID="workbench-fhir-url" />
                    <Input value={fhirClientId} onChangeText={setFhirClientId} placeholder={t('screens.commerceportal.connectOauth.fhirClientIdPlaceholder')} accessibilityLabel={t('screens.commerceportal.connectOauth.fhirClientIdPlaceholder')} autoCapitalize="none" testID="workbench-fhir-client" />
                    <Input type="password" value={fhirClientSecret} onChangeText={setFhirClientSecret} placeholder={t('screens.commerceportal.connectOauth.fhirClientSecretPlaceholder')} accessibilityLabel={t('screens.commerceportal.connectOauth.fhirClientSecretPlaceholder')} testID="workbench-fhir-secret" />
                    <Input value={fhirScope} onChangeText={setFhirScope} placeholder={t('screens.commerceportal.connectOauth.fhirScopePlaceholder')} accessibilityLabel={t('screens.commerceportal.connectOauth.fhirScopePlaceholder')} autoCapitalize="none" testID="workbench-fhir-scope" />
                    <Button
                      disabled={connecting || !fhirBaseUrl.trim() || !fhirClientId.trim()}
                      onPress={() => void connectOauth('/fhir/authorize', { fhir_base_url: fhirBaseUrl.trim(), client_id: fhirClientId.trim(), client_secret: fhirClientSecret.trim() || undefined, scope: fhirScope.trim() || undefined })}
                      testID="workbench-fhir"
                    >
                      {connecting ? t('screens.commerceportal.connectOauth.connecting') : t('screens.commerceportal.connectOauth.fhirButton')}
                    </Button>
                  </View>
                )}
              </Panel>
            ) : null}

            <Panel testID="workbench-mapping">
              <Text size="sm" weight="500">
                {t('screens.partnerportal.mappingPreview')}
              </Text>
              {preview?.pipeline_status === 'awaiting_specification' ? (
                <Text size="sm" muted>
                  {t('screens.partnerportal.awaitingSpec')}
                </Text>
              ) : preview && preview.mappings.length === 0 ? (
                <Text size="sm" muted>
                  {t('screens.partnerportal.awaitingFactory')}
                </Text>
              ) : preview ? (
                <View style={styles.gap}>
                  {preview.pending_review.length > 0 ? (
                    <Text size="sm" weight="500" color={colors.primary}>
                      {t('screens.partnerportal.pendingReview', { count: preview.pending_review.length })}
                    </Text>
                  ) : null}
                  {preview.mappings.map((m) => (
                    <View key={m.id} style={[styles.mapRow, { borderColor: colors.border }]} testID={`mapping-${m.id}`}>
                      <View style={styles.rowWrap}>
                        <Text size="sm" style={styles.mono}>{`${m.source_schema}.${m.source_field}`}</Text>
                        {m.sensitive ? (
                          <View style={[styles.sensitive, { borderColor: withAlpha(colors.primary, 0.3), backgroundColor: colors.accent }]}>
                            <Text size="xs" color={colors.primary}>
                              {t('screens.partnerportal.sensitive')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text size="xs" muted>{`${t('screens.partnerportal.canonicalField')}: ${m.canonical_entity}.${m.canonical_field}`}</Text>
                      <Text size="xs" muted>{`${t('screens.partnerportal.confidence')}: ${Math.round(m.confidence * 100)}% · ${t('screens.partnerportal.decidedBy')}: ${m.decided_by}`}</Text>
                      {preview.pending_review.includes(m.id) ? (
                        <View style={styles.rowWrap}>
                          <Button size="sm" variant="outline" disabled={busy !== null} onPress={() => void decide(m.id, 'approve')} testID={`mapping-approve-${m.id}`}>
                            {t('screens.partnerportal.approve')}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy !== null} onPress={() => void decide(m.id, 'reject')} testID={`mapping-reject-${m.id}`}>
                            {t('screens.partnerportal.reject')}
                          </Button>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {canTest ? (
                <View style={styles.gap}>
                  <Button variant="outline" disabled={busy !== null} onPress={() => void act('test', '/sandbox-tests')} testID="workbench-test" style={styles.selfStart}>
                    {busy === 'test' ? t('screens.partnerportal.runningTests') : t('screens.partnerportal.runSandboxTests')}
                  </Button>
                  <Text size="xs" muted>
                    {t('screens.commerceportal.sandboxDevNote')}
                  </Text>
                </View>
              ) : null}
            </Panel>

            <Panel testID="workbench-activation">
              <Text size="sm" weight="500">
                {t('screens.partnerportal.activationSummary')}
              </Text>
              {activation?.certification ? (
                <Text size="sm" muted>
                  {`${t('screens.partnerportal.certification')}: ${activation.certification.status}${activation.version ? ` · v${activation.version}` : ''}`}
                </Text>
              ) : null}
              {activation?.awaiting_platform_approval ? (
                <View style={styles.row}>
                  <BizIcon name="Clock" size={16} color={colors.primary} />
                  <Text size="sm" weight="500" color={colors.primary}>
                    {t('screens.commerceportal.awaitingApproval')}
                  </Text>
                </View>
              ) : (
                <Text size="xs" muted>
                  {t('screens.commerceportal.activationHint')}
                </Text>
              )}
              <View style={styles.rowWrap}>
                {state === 'active' ? (
                  <Button variant="outline" disabled={busy !== null} onPress={() => void act('pause', '/pause')} testID="workbench-pause">
                    {t('screens.partnerportal.pause')}
                  </Button>
                ) : null}
                {state === 'suspended' ? (
                  <Button variant="outline" disabled={busy !== null} onPress={() => void act('resume', '/resume')} testID="workbench-resume">
                    {t('screens.partnerportal.resume')}
                  </Button>
                ) : null}
                {state === 'active' ? (
                  <Button variant="outline" disabled={busy !== null} onPress={() => void act('reauthorize', '/reauthorize')} testID="workbench-reauthorize">
                    {t('screens.partnerportal.reauthorize')}
                  </Button>
                ) : null}
                {state !== 'revoked' ? (
                  <Button variant="destructive" disabled={busy !== null} onPress={confirmRevoke} testID="workbench-revoke">
                    {t('screens.partnerportal.revoke')}
                  </Button>
                ) : null}
              </View>
            </Panel>
          </ScrollView>
        )}
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { width: '100%' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  gap: { gap: 8 },
  mapRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 4 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr' },
  sensitive: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  selfStart: { alignSelf: 'flex-start' },
});
