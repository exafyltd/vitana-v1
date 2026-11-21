/**
 * VTID-05524 — native twin of src/components/commerce/ManualConnectDialog.tsx
 * ("Connect your system"): one question (the shop / API address) and "Check
 * connection"; a recognised platform → "Shopify detected" + one Connect
 * (`POST /partner-onboarding/:orgId/connections`, name and jurisdiction from
 * the business); not recognised → "I have API documentation" / "I need help
 * connecting" (Support). Advanced / Developer settings keep every field the
 * old form had (connector ID, provider ID, OpenAPI upload or paste, and —
 * only without a business — name + jurisdiction through `POST
 * /vcaop/portal/my/connections`). `parseOpenApi` is the web's own.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, notify, notifyError, useUITheme } from '../../../ports/ui';
import {
  BizIcon,
  Input,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Textarea,
  pickTextFile,
  withAlpha,
} from '../../../ports/business-ui';
import { MY_PORTAL_API, PARTNER_ONBOARDING_API, parseOpenApi, type MyOrgRow } from '../../../ports/commerce';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { BusinessContext } from './BusinessContext';
import { Disclosure, Field } from './parts';

const EMPTY_FORM = { name: '', connector_id: '', provider_id: '', jurisdiction: '', openapi: '' };
type Detection = { connector_id: string; provider_id: string | null; name_hint: string | null };

export function ManualConnectDialog({
  open,
  onOpenChange,
  onCreated,
  org = null,
  orgs = [],
  onSelectOrg,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
  org?: MyOrgRow | null;
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [creating, setCreating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [detected, setDetected] = useState<Detection | null>(null);
  const [notDetected, setNotDetected] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [openapiError, setOpenapiError] = useState(false);

  useEffect(() => {
    if (open) return;
    setStoreUrl('');
    setDetected(null);
    setNotDetected(false);
    setDevOpen(false);
    setForm(EMPTY_FORM);
    setOpenapiError(false);
  }, [open]);

  const detect = async () => {
    let url = storeUrl.trim();
    if (!url) return;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    setDetecting(true);
    setDetected(null);
    setNotDetected(false);
    try {
      const res = await commerceFetch(`${MY_PORTAL_API}/connections/detect-platform`, { method: 'POST', body: JSON.stringify({ url }) });
      if (res.connector_id) {
        let hostname = url;
        try {
          hostname = new URL(url).hostname;
        } catch {
          // defensive only
        }
        setDetected({ connector_id: res.connector_id, provider_id: res.provider_id ?? null, name_hint: res.name_hint ?? null });
        setForm((f) => ({ ...f, connector_id: res.connector_id, provider_id: res.provider_id ?? f.provider_id, name: f.name || (res.name_hint ? `${res.name_hint} (${hostname})` : f.name) }));
      } else setNotDetected(true);
    } catch {
      setNotDetected(true);
    } finally {
      setDetecting(false);
    }
  };

  const createFor = async (connector_id: string, provider_id: string, openapi_document: Record<string, unknown> | null) => {
    setCreating(true);
    try {
      if (org) {
        await commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}/connections`, { method: 'POST', body: JSON.stringify({ connector_id, provider_id, ...(openapi_document ? { openapi_document } : {}) }) });
      } else {
        await commerceFetch(`${MY_PORTAL_API}/connections`, {
          method: 'POST',
          body: JSON.stringify({ name: form.name.trim(), connector_id, provider_id, jurisdiction: form.jurisdiction.trim() || undefined, openapi_document: openapi_document ?? undefined }),
        });
      }
      notify('screens.commerceportal.connect.created');
      onOpenChange(false);
      await onCreated();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setCreating(false);
    }
  };

  const connectDetected = () => {
    if (!detected?.provider_id) {
      setDevOpen(true);
      return;
    }
    void createFor(detected.connector_id, detected.provider_id, null);
  };

  const createFromDeveloper = () => {
    let doc: Record<string, unknown> | null;
    try {
      doc = parseOpenApi(form.openapi);
      setOpenapiError(false);
    } catch {
      setOpenapiError(true);
      return;
    }
    void createFor(form.connector_id.trim(), form.provider_id.trim(), doc);
  };

  const uploadOpenapi = async () => {
    try {
      const r = await pickTextFile(['application/json', 'text/plain']);
      if (r.status !== 'picked') return;
      const text = await r.file.read();
      setForm((f) => ({ ...f, openapi: text }));
      setOpenapiError(false);
    } catch {
      /* the paste field stays */
    }
  };

  const devValid = !!form.connector_id.trim() && !!form.provider_id.trim() && (org ? true : !!form.name.trim());

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile testID="manual-connect">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Text size="2xl" weight="700">
              {t('screens.commerceportal.connect.title')}
            </Text>
          </ResponsiveDialogTitle>
          <Text size="sm" muted>
            {t('screens.commerceportal.connect.intro')}
          </Text>
          <BusinessContext org={org} orgs={orgs} onSelectOrg={onSelectOrg} />
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <View style={styles.stack}>
            <Field label={t('screens.commerceportal.connect.urlLabel')}>
              <Input
                type="url"
                value={storeUrl}
                onChangeText={(v: string) => {
                  setStoreUrl(v);
                  setDetected(null);
                  setNotDetected(false);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                testID="connect-url"
                accessibilityLabel={t('screens.commerceportal.connect.urlLabel')}
              />
            </Field>
            <Button onPress={() => void detect()} disabled={detecting || !storeUrl.trim()} testID="connect-check" style={styles.big}>
              <BizIcon name="Search" size={16} color={colors.primaryForeground} />
              {t('screens.commerceportal.connect.check')}
            </Button>

            {detected ? (
              <View style={[styles.detected, { borderColor: withAlpha(colors.statusSuccess, 0.4), backgroundColor: colors.statusSuccessSubtle }]} testID="connect-detected">
                <View style={styles.row}>
                  <BizIcon name="CheckCircle2" size={20} color={colors.statusSuccess} />
                  <Text weight="600" style={styles.fill}>
                    {t('screens.commerceportal.connect.detected', { platform: detected.name_hint ?? detected.connector_id })}
                  </Text>
                </View>
                <Text size="sm" muted>
                  {org ? t('screens.commerceportal.connect.detectedBody', { name: org.display_name }) : t('screens.commerceportal.connect.detectedNoOrg')}
                </Text>
                {org ? (
                  <Button onPress={connectDetected} disabled={creating} testID="connect-detected-go" style={styles.big}>
                    {t('screens.commerceportal.connect.connect')}
                  </Button>
                ) : null}
              </View>
            ) : null}

            {notDetected ? (
              <View style={styles.gap} testID="connect-not-detected">
                <Text size="sm" muted>
                  {t('screens.commerceportal.connect.notDetected')}
                </Text>
                <PressableRow onPress={() => setDevOpen(true)} testID="connect-have-docs" accessibilityLabel={t('screens.commerceportal.connect.haveDocs')} style={[styles.option, { borderColor: colors.border }]}>
                  <BizIcon name="FileUp" size={20} color={colors.primary} />
                  <Text weight="500" style={styles.fill}>
                    {t('screens.commerceportal.connect.haveDocs')}
                  </Text>
                </PressableRow>
                <PressableRow
                  onPress={() => {
                    onOpenChange(false);
                    navigateToWebPath('/support');
                  }}
                  accessibilityRole="link"
                  testID="connect-need-help"
                  accessibilityLabel={t('screens.commerceportal.connect.needHelp')}
                  style={[styles.option, { borderColor: colors.border }]}
                >
                  <BizIcon name="LifeBuoy" size={20} color={colors.primary} />
                  <Text weight="500" style={styles.fill}>
                    {t('screens.commerceportal.connect.needHelp')}
                  </Text>
                </PressableRow>
              </View>
            ) : null}

            <View style={styles.gap}>
              <Disclosure label={t('screens.commerceportal.connect.developer')} open={devOpen} onToggle={() => setDevOpen((o) => !o)} testID="connect-developer" bordered />
              {devOpen ? (
                <View style={styles.gap} testID="connect-developer-form">
                  {!org ? (
                    <>
                      <Input value={form.name} onChangeText={(v: string) => setForm((f) => ({ ...f, name: v }))} placeholder={t('screens.partnerportal.businessName')} accessibilityLabel={t('screens.partnerportal.businessName')} testID="connect-name" />
                      <Input value={form.jurisdiction} onChangeText={(v: string) => setForm((f) => ({ ...f, jurisdiction: v }))} placeholder={t('screens.partnerportal.jurisdiction')} accessibilityLabel={t('screens.partnerportal.jurisdiction')} testID="connect-jurisdiction" />
                    </>
                  ) : null}
                  <Input value={form.connector_id} onChangeText={(v: string) => setForm((f) => ({ ...f, connector_id: v }))} placeholder={t('screens.partnerportal.connectorId')} accessibilityLabel={t('screens.partnerportal.connectorId')} autoCapitalize="none" testID="connect-connector" />
                  <Input value={form.provider_id} onChangeText={(v: string) => setForm((f) => ({ ...f, provider_id: v }))} placeholder={t('screens.partnerportal.providerId')} accessibilityLabel={t('screens.partnerportal.providerId')} autoCapitalize="none" testID="connect-provider" />
                  {org ? (
                    <Text size="xs" muted>
                      {t('screens.commerceportal.connect.jurisdictionFromBusiness')}
                    </Text>
                  ) : null}
                  <Button variant="outline" onPress={() => void uploadOpenapi()} testID="connect-upload-openapi">
                    <BizIcon name="FileUp" size={16} />
                    {t('screens.commerceportal.connect.uploadOpenapi')}
                  </Button>
                  <Textarea
                    value={form.openapi}
                    onChangeText={(v: string) => {
                      setForm((f) => ({ ...f, openapi: v }));
                      setOpenapiError(false);
                    }}
                    placeholder={t('screens.commerceportal.connect.pasteOpenapi')}
                    accessibilityLabel={t('screens.commerceportal.connect.pasteOpenapi')}
                    rows={4}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="connect-openapi"
                  />
                  <Text size="xs" color={openapiError ? colors.destructive : colors.mutedForeground} testID="connect-openapi-hint">
                    {openapiError ? t('screens.commerceportal.connect.openapiInvalid') : t('screens.partnerportal.openapiHint')}
                  </Text>
                  <Button onPress={createFromDeveloper} disabled={creating || !devValid} testID="connect-create" style={styles.big}>
                    {creating ? t('screens.partnerportal.creating') : t('screens.partnerportal.create')}
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  big: { minHeight: 48 },
  detected: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  option: { minHeight: 48, borderWidth: 1, borderRadius: 16, padding: 12, gap: 12 },
});
