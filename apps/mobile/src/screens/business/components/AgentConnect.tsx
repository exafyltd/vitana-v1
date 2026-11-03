/**
 * VTID-05524 — native twins of src/components/commerce/AgentConnectCard.tsx
 * (the legacy "Connect via AI Agent" card: in-development pill, status
 * detail, the MCP address + per-assistant steps under "Advanced", the
 * breathing halo) and src/components/commerce/McpConnectPanel.tsx ("Connect
 * your AI agent": the address and its Copy button, works-with line, "then
 * say", help tabs per assistant, Advanced details, manual fallback).
 *
 * Copy: the app ships no clipboard module, so Copy hands the address to the
 * phone's share sheet (which carries "Copy" — the system-sheet pattern the
 * native program allows); the address is also selectable text, the web's own
 * fallback when the clipboard is blocked (`copyBlocked`).
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PressableRow, Tabs, TabsContent, TabsList, TabsTrigger, Text, notify, useUITheme } from '../../../ports/ui';
import { BizIcon, BreathingHalo, shareText, withAlpha } from '../../../ports/business-ui';
import { COMMERCE_MCP_TOOL_NAMES, SUPPORTED_ASSISTANTS, normalizeMcpUrl } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceMcpMetadataUrl, commerceMcpUrl } from '../data/client';
import { Disclosure } from './parts';

/** `MCP_SERVER_URL` (src/lib/commerce-host.ts): `VITE_MCP_AS_URL` is set in no build, so the fallback is what ships. Display only. */
export const MCP_SERVER_URL = normalizeMcpUrl('https://mcp.vitanaland.com');

const HOSTS = [
  { id: 'claude', tab: 'screens.commerceportal.agentConnect.tabClaude', steps: ['screens.commerceportal.agentConnect.claudeStep1', 'screens.commerceportal.agentConnect.claudeStep2', 'screens.commerceportal.agentConnect.claudeStep3'] },
  {
    id: 'chatgpt',
    tab: 'screens.commerceportal.agentConnect.tabChatgpt',
    steps: ['screens.commerceportal.agentConnect.chatgptStep1', 'screens.commerceportal.agentConnect.chatgptStep2', 'screens.commerceportal.agentConnect.chatgptStep3'],
    note: 'screens.commerceportal.agentConnect.chatgptNote',
  },
  { id: 'gemini', tab: 'screens.commerceportal.agentConnect.tabGemini', steps: ['screens.commerceportal.agentConnect.geminiStep1', 'screens.commerceportal.agentConnect.geminiStep2'], note: 'screens.commerceportal.agentConnect.geminiNote' },
] as const;

const K = 'screens.commerceportal.mcpConnect';
const HELP = [
  { id: 'claude', label: 'Claude', steps: [`${K}.claudeStep1`, `${K}.claudeStep2`, `${K}.claudeStep3`] },
  { id: 'chatgpt', label: 'ChatGPT', steps: [`${K}.chatgptStep1`, `${K}.chatgptStep2`, `${K}.chatgptStep3`] },
  { id: 'gemini', label: 'Gemini', steps: [`${K}.geminiStep1`, `${K}.geminiStep2`], note: `${K}.geminiNote` },
] as const;

/** "Copied" for 2 s after a copy, like the web. */
function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const mark = () => {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return [copied, mark];
}

function Steps({ keys }: { keys: readonly string[] }): ReactElement {
  const { t } = useI18n();
  return (
    <View style={styles.steps}>
      {keys.map((key, i) => (
        <View key={key} style={styles.stepRow}>
          <Text size="sm" weight="600" color={undefined} style={styles.stepNo}>
            {`${i + 1}.`}
          </Text>
          <Text size="sm" muted style={styles.fill}>
            {t(key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Address({ value, testID }: { value: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.address, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.accent, 0.7) }]}>
      <Text selectable size="sm" color={colors.primary} style={styles.mono} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

export function AgentConnectCard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [copied, markCopied] = useCopied();
  const [detailOpen, setDetailOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const copyUrl = async () => {
    if ((await shareText(MCP_SERVER_URL)) !== 'shared') return;
    markCopied();
    notify('screens.commerceportal.agentConnect.copied');
  };

  return (
    <View style={styles.relative} testID="agent-connect-card">
      <BreathingHalo color={withAlpha(colors.accent, 0.25)} />
      <View style={[styles.card, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]}>
        <View style={styles.pills}>
          <View style={[styles.pill, { borderColor: withAlpha(colors.primary, 0.3), backgroundColor: colors.accent }]}>
            <BizIcon name="Sparkles" size={14} color={colors.primary} />
            <Text size="xs" weight="600" color={colors.primary}>
              {t('screens.commerceportal.setupChooser.inDevelopment')}
            </Text>
          </View>
          <PressableRow
            onPress={() => setDetailOpen((v) => !v)}
            accessibilityLabel={t('screens.commerceportal.agentStatusPill')}
            accessibilityState={{ expanded: detailOpen } as never}
            testID="agent-status-pill"
            style={[styles.pill, { borderColor: colors.border }]}
          >
            <Text size="xs" muted>
              {t('screens.commerceportal.agentStatusPill')}
            </Text>
            <View style={detailOpen ? styles.turned : null}>
              <BizIcon name="ChevronDown" size={14} color={colors.mutedForeground} />
            </View>
          </PressableRow>
        </View>
        {detailOpen ? (
          <View style={[styles.note, { borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.5) }]}>
            <Text size="xs" muted testID="agent-status-detail">
              {t('screens.commerceportal.agentStatusDetail')}
            </Text>
          </View>
        ) : null}
        <Text size="lg" weight="600">
          {t('screens.commerceportal.agentConnect.title')}
        </Text>
        <Text size="sm" muted>
          {t('screens.commerceportal.agentPromise')}
        </Text>
        <Disclosure label={t('screens.commerceportal.agentConnect.manualMcp')} open={advancedOpen} onToggle={() => setAdvancedOpen((v) => !v)} testID="agent-advanced" />
        {advancedOpen ? (
          <View style={styles.gap}>
            <Address value={MCP_SERVER_URL} testID="agent-address" />
            <Button onPress={() => void copyUrl()} testID="agent-copy" style={styles.bigButton}>
              <BizIcon name={copied ? 'Check' : 'Copy'} size={16} color={colors.primaryForeground} />
              <Text weight="600" color={colors.primaryForeground}>
                {copied ? t('screens.commerceportal.agentConnect.copied') : t('screens.commerceportal.agentConnect.copyUrl')}
              </Text>
            </Button>
            <Text size="xs" muted>
              {t('screens.commerceportal.agentUrlHint')}
            </Text>
            <Tabs defaultValue="claude">
              <TabsList>
                {HOSTS.map((h) => (
                  <TabsTrigger key={h.id} value={h.id} testID={`agent-tab-${h.id}`}>
                    {t(h.tab)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {HOSTS.map((h) => (
                <TabsContent key={h.id} value={h.id}>
                  <Steps keys={h.steps} />
                  {'note' in h && h.note ? (
                    <Text size="xs" muted style={styles.noteText}>
                      {t(h.note)}
                    </Text>
                  ) : null}
                </TabsContent>
              ))}
            </Tabs>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function McpConnectPanel({ onRegisterManually }: { onRegisterManually?: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [copied, markCopied] = useCopied();
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const url = commerceMcpUrl();

  const copy = async () => {
    const r = await shareText(url);
    if (r === 'shared') {
      markCopied();
      notify(`${K}.copied`);
    } else if (r === 'failed') notify(`${K}.copyBlocked`);
  };

  return (
    <View style={[styles.card, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]} testID="mcp-connect-panel">
      <View style={[styles.pill, styles.selfStart, { borderColor: withAlpha(colors.primary, 0.3), backgroundColor: colors.accent }]}>
        <BizIcon name="Sparkles" size={14} color={colors.primary} />
        <Text size="xs" weight="600" color={colors.primary}>
          {t(`${K}.badge`)}
        </Text>
      </View>
      <Text size="lg" weight="600">
        {t(`${K}.title`)}
      </Text>
      <Text size="sm" muted>
        {t(`${K}.lead`)}
      </Text>
      <Address value={url} testID="mcp-address" />
      <Button onPress={() => void copy()} testID="mcp-copy" style={styles.bigButton}>
        <BizIcon name={copied ? 'Check' : 'Copy'} size={16} color={colors.primaryForeground} />
        <Text weight="600" color={colors.primaryForeground}>
          {copied ? t(`${K}.copied`) : t(`${K}.copy`)}
        </Text>
      </Button>
      <Text size="sm" muted>
        {`${t(`${K}.worksWith`)} `}
        <Text size="sm" weight="500">
          {SUPPORTED_ASSISTANTS.join(' · ')}
        </Text>
      </Text>
      <View style={[styles.note, { borderColor: 'transparent', backgroundColor: withAlpha(colors.muted, 0.5) }]}>
        <Text size="sm" muted>
          {t(`${K}.thenSay`)}
        </Text>
      </View>
      <Text size="xs" muted>
        {t(`${K}.confirmNote`)}
      </Text>
      <Disclosure label={t(`${K}.help`)} open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} testID="mcp-help" bordered />
      {helpOpen ? (
        <Tabs defaultValue="claude">
          <TabsList>
            {HELP.map((h) => (
              <TabsTrigger key={h.id} value={h.id} testID={`mcp-tab-${h.id}`}>
                {h.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {HELP.map((h) => (
            <TabsContent key={h.id} value={h.id}>
              <Steps keys={h.steps} />
              {'note' in h ? (
                <Text size="xs" muted style={styles.noteText}>
                  {t(h.note)}
                </Text>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
      <Disclosure label={t(`${K}.advanced`)} open={advancedOpen} onToggle={() => setAdvancedOpen((v) => !v)} testID="mcp-advanced" />
      {advancedOpen ? (
        <View style={[styles.note, { borderColor: colors.border }]} testID="mcp-advanced-details">
          {(
            [
              [`${K}.advEndpoint`, url, true],
              [`${K}.advTransport`, t(`${K}.advTransportValue`), false],
              [`${K}.advAuth`, t(`${K}.advAuthValue`), false],
              [`${K}.advMetadata`, commerceMcpMetadataUrl(), true],
              [`${K}.advTools`, COMMERCE_MCP_TOOL_NAMES.join(', '), true],
            ] as const
          ).map(([label, value, mono]) => (
            <View key={label} style={styles.dl}>
              <Text size="xs" weight="500">
                {t(label)}
              </Text>
              <Text size="xs" muted selectable style={mono ? styles.mono : null}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {onRegisterManually ? (
        <View style={[styles.fallback, { borderColor: colors.border }]}>
          <Button variant="ghost" onPress={onRegisterManually} testID="mcp-register-manually">
            <Text size="sm" weight="500" color={colors.primary}>
              {t(`${K}.manualFallback`)}
            </Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  relative: { position: 'relative' },
  card: { borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  selfStart: { alignSelf: 'flex-start' },
  turned: { transform: [{ rotate: '180deg' }] },
  note: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  noteText: { marginTop: 12 },
  gap: { gap: 8 },
  address: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr' },
  bigButton: { minHeight: 48, borderRadius: 12, gap: 8 },
  steps: { gap: 8, paddingTop: 12 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepNo: { minWidth: 18 },
  fill: { flex: 1, minWidth: 0 },
  dl: { gap: 2 },
  fallback: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, alignItems: 'center' },
});
