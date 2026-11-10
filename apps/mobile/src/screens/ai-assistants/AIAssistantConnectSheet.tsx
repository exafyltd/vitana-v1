/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — the native twin of
 * `src/components/AIAssistantConnectModal.tsx` (the phone's bottom `Sheet`
 * branch), the paste-and-verify step of the `useAIAssistants` flow:
 *   1. `POST /integrations/ai-assistants/apikey/:provider` (the gateway
 *      encrypts and stores the key),
 *   2. `POST /integrations/ai-assistants/verify/:provider` (live check),
 *   3. success shows only `prefix•••last4` and the latency; any other
 *      verify status or a failed call shows the error and keeps the form.
 * The key lives only in this sheet's state while typed (secure entry), is
 * sent once and is cleared on success and on close; it is never stored,
 * logged or shown back. Both mutations invalidate the `['ai-assistants']`
 * queries.
 *
 * On the web this sheet is opened from Connected Apps
 * (`MobileConnectedAppsView.tsx:539`), not from `/assistant`
 * (`AIAssistant.tsx` imports no part of it).
 */
import { useState, type ReactElement } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Spinner, Text, TextInput, useUITheme } from '../../ports/ui';
import { AssistantIcon, Label } from '../../ports/assistant';
import { useI18n } from '../../i18n/I18nProvider';
import { useConnectAIProvider, useVerifyAIProvider } from './data/hooks';
import type { AIProviderId } from './data/requests';
import { AlertBox } from './components';

/** web `PROVIDER_META` — product names, key pages and key prefixes (not UI copy). */
export const PROVIDER_META: Record<AIProviderId, { display_name: string; key_url: string; key_url_label: string; placeholder: string; prefix: string }> = {
  chatgpt: {
    display_name: 'ChatGPT',
    key_url: 'https://platform.openai.com/api-keys',
    key_url_label: 'platform.openai.com/api-keys',
    placeholder: 'sk-…',
    prefix: 'sk-',
  },
  claude: {
    display_name: 'Claude',
    key_url: 'https://console.anthropic.com/settings/keys',
    key_url_label: 'console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-…',
    prefix: 'sk-ant-',
  },
};

type Phase = 'input' | 'connecting' | 'verifying' | 'success' | 'error';
type ErrorMsg = { key: string; params?: Record<string, string | number> } | null;

export function AIAssistantConnectSheet({ open, provider, onClose }: { open: boolean; provider: AIProviderId | null; onClose: () => void }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [apiKey, setApiKey] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [errorMsg, setErrorMsg] = useState<ErrorMsg>(null);
  const [verifyResult, setVerifyResult] = useState<{ last4: string; latency_ms: number } | null>(null);
  const connectMut = useConnectAIProvider();
  const verifyMut = useVerifyAIProvider();

  if (!provider) return null;
  const meta = PROVIDER_META[provider];

  const reset = () => {
    setApiKey('');
    setPhase('input');
    setErrorMsg(null);
    setVerifyResult(null);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setErrorMsg({ key: 'aiAssistantsNative.connect.missingKey' });
      return;
    }
    if (!apiKey.startsWith(meta.prefix)) {
      setErrorMsg({ key: 'aiAssistantsNative.connect.wrongPrefix', params: { prefix: meta.prefix } });
      return;
    }
    setErrorMsg(null);
    setPhase('connecting');
    try {
      const connectRes = await connectMut.mutateAsync({ provider, api_key: apiKey.trim() });
      setPhase('verifying');
      const verifyRes = await verifyMut.mutateAsync({ provider });
      if (verifyRes.status === 'ok') {
        setVerifyResult({ last4: connectRes.key_last4, latency_ms: verifyRes.latency_ms });
        setApiKey('');
        setPhase('success');
      } else {
        setErrorMsg(
          verifyRes.status === 'unauthorized'
            ? { key: 'aiAssistantsNative.connect.unauthorized' }
            : verifyRes.status === 'network'
              ? { key: 'aiAssistantsNative.connect.network' }
              : { key: 'aiAssistantsNative.connect.verifyFailed', params: { status: verifyRes.error || String(verifyRes.status) } },
        );
        setPhase('error');
      }
    } catch (err) {
      setErrorMsg({ key: 'aiAssistantsNative.connect.failed', params: { code: err instanceof Error ? err.message : String(err) } });
      setPhase('error');
    }
  };

  const busy = phase === 'connecting' || phase === 'verifying';
  const connectLabel = phase === 'connecting' ? t('aiAssistantsNative.connect.saving') : phase === 'verifying' ? t('aiAssistantsNative.connect.verifying') : t('aiAssistantsNative.connect.connect');

  return (
    <BottomSheet open={open} onClose={handleClose} title={t('screens.common.connectDisplay_name', { display_name: meta.display_name })} testID="ai-connect">
      <View style={styles.body}>
        {phase === 'success' && verifyResult ? (
          <View style={styles.body} testID="ai-connect-success">
            <AlertBox icon="CheckCircle2" tone="success">
              <Text size="sm">
                <Text size="sm" weight="700">
                  {meta.display_name}
                </Text>
                {t('screens.common.connectedVerified')}
              </Text>
              <Text size="xs" muted testID="ai-connect-key-hint">
                {t('screens.common.key')} {`${meta.prefix}•••${verifyResult.last4}`}
                {t('screens.common.verifiedLatency_msMs', { latency_ms: verifyResult.latency_ms })}
              </Text>
            </AlertBox>
            <Button onPress={handleClose} testID="ai-connect-done">
              {t('screens.common.done')}
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.gap4}>
              <Text size="sm" muted>
                {t('screens.common.pasteDisplay_nameApiKeyWeStore', { display_name: meta.display_name })}
              </Text>
              <Button variant="link" size="sm" onPress={() => void Linking.openURL(meta.key_url)} style={styles.link} testID="ai-connect-key-link">
                <AssistantIcon name="ExternalLink" size={12} color={colors.primary} />
                {t('screens.common.getYourApiKeyAtKey_url_label', { key_url_label: meta.key_url_label })}
              </Button>
            </View>

            <View style={styles.gap4}>
              <Label>{t('screens.common.apiKey')}</Label>
              <TextInput
                testID="ai-connect-key"
                accessibilityLabel={t('screens.common.apiKey')}
                secureTextEntry
                autoComplete="off"
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                placeholder={meta.placeholder}
                value={apiKey}
                onChangeText={setApiKey}
                editable={!busy}
              />
            </View>

            {errorMsg ? (
              <AlertBox icon="AlertCircle" tone="destructive" testID="ai-connect-error">
                <Text size="sm" color={colors.destructive}>
                  {t(errorMsg.key, errorMsg.params)}
                </Text>
              </AlertBox>
            ) : null}

            <View style={styles.row}>
              <AssistantIcon name="Shield" size={12} color={colors.mutedForeground} />
              <Text size="xs" muted style={styles.fill}>
                {t('screens.common.encryptedTransitTlsAtRestAes256gcm')}
              </Text>
            </View>

            <View style={styles.row}>
              <Button variant="outline" onPress={handleClose} disabled={busy} style={styles.fill} testID="ai-connect-cancel">
                {t('screens.common.cancel')}
              </Button>
              <Button onPress={() => void handleConnect()} disabled={busy || !apiKey} style={styles.fill} testID="ai-connect-submit">
                {busy ? <Spinner /> : null}
                {connectLabel}
              </Button>
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  gap4: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  link: { alignSelf: 'flex-start', gap: 4, paddingHorizontal: 0 },
});
