/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twins of the
 * mobile Connected Apps building blocks: `MobileIntegrationSection` (the
 * collapsible category header with its n/m badge), `MobileIntegrationRow`,
 * `MobileIntegrationDetailSheet` (connect / disconnect / configure) and
 * `MobileConnectionSummary`. Presentational: the screen decides what each
 * action does.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Badge,
  BottomSheet,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icon,
  PressableRow,
  Text,
  useUITheme,
} from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { Integration } from './data/connectors';

export function useIntegrationText() {
  const { t } = useI18n();
  return {
    name: (i: Integration) => i.name ?? (i.nameKey ? t(i.nameKey) : i.id),
    lastSync: (i: Integration) => i.lastSync ?? (i.lastSyncKey ? t(i.lastSyncKey) : ''),
  };
}

export function IntegrationSection({
  title,
  emoji,
  integrations,
  onSelect,
  defaultExpanded = false,
  testID,
}: {
  title: string;
  emoji: string;
  integrations: Integration[];
  onSelect: (app: Integration) => void;
  defaultExpanded?: boolean;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const [open, setOpen] = useState(defaultExpanded);
  const connected = integrations.filter((i) => i.connected).length;
  return (
    <Collapsible open={open} onOpenChange={setOpen} testID={testID}>
      <CollapsibleTrigger
        testID={testID ? `${testID}-trigger` : undefined}
        accessibilityLabel={title}
        style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.headerStart}>
          <Text size="lg">{emoji}</Text>
          <Text size="sm" weight="500">
            {title}
          </Text>
        </View>
        <View style={styles.headerEnd}>
          <Badge variant={connected > 0 ? 'default' : 'secondary'}>{`${connected}/${integrations.length}`}</Badge>
          <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={16} color={colors.mutedForeground} />
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent style={styles.rows}>
        {integrations.map((app) => (
          <IntegrationRow key={app.id} integration={app} onPress={() => onSelect(app)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function IntegrationRow({ integration, onPress }: { integration: Integration; onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const text = useIntegrationText();
  const name = text.name(integration);
  const subline = integration.statusLabelKey
    ? t(integration.statusLabelKey)
    : integration.connected
      ? t('connectedApps.status.connected')
      : integration.comingSoon
        ? t('connectedApps.status.comingSoon')
        : t(integration.syncKey);
  return (
    <PressableRow
      testID={`integration-${integration.id}`}
      onPress={onPress}
      accessibilityLabel={name}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        integration.connected ? { borderStartWidth: 2, borderStartColor: colors.statusSuccess } : null,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: integration.connected ? colors.statusSuccessSubtle : colors.muted }]}>
        <Icon name={integration.icon} size={20} />
      </View>
      <View style={styles.fill}>
        <Text size="sm" weight="500" numberOfLines={1}>
          {name}
        </Text>
        <Text size="xs" muted numberOfLines={1}>
          {subline}
        </Text>
      </View>
      {integration.connected ? (
        <Icon name="CircleCheck" size={20} color={colors.statusSuccess} />
      ) : integration.comingSoon ? (
        <Badge variant="secondary">{t('connectedApps.status.soon')}</Badge>
      ) : (
        <Icon name="ChevronRight" size={20} color={colors.mutedForeground} />
      )}
    </PressableRow>
  );
}

export function IntegrationDetailSheet({
  integration,
  onClose,
  onConnect,
  onDisconnect,
  onConfigure,
}: {
  integration: Integration | null;
  onClose: () => void;
  onConnect: (i: Integration) => void;
  onDisconnect: (i: Integration) => void;
  onConfigure: (i: Integration) => void;
}): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const text = useIntegrationText();
  if (!integration) return null;
  const name = text.name(integration);
  return (
    <BottomSheet open onClose={onClose} title={name} testID="integration-sheet">
      <View style={styles.sheetHead}>
        <View style={[styles.iconWrapLg, { backgroundColor: integration.connected ? colors.statusSuccessSubtle : colors.muted }]}>
          <Icon name={integration.icon} size={24} />
        </View>
        <Text size="sm" muted numberOfLines={1} style={styles.fill}>
          {integration.connected ? `${t('connectedApps.lastSync')}: ${text.lastSync(integration)}` : t('connectedApps.status.notConnected')}
        </Text>
      </View>
      {integration.connected ? (
        <>
          <View style={[styles.syncBox, { backgroundColor: colors.muted }]}>
            <Text size="sm" weight="500">
              {`${t('connectedApps.dataSync')}:`}
            </Text>
            <Text size="sm" muted>
              {t(integration.syncKey)}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button variant="outline" style={styles.fill} onPress={() => onConfigure(integration)} testID="integration-configure">
              {t('connectedApps.actions.configure')}
            </Button>
            <Button
              variant="destructive"
              style={styles.fill}
              onPress={() => {
                onDisconnect(integration);
                onClose();
              }}
              testID="integration-disconnect"
            >
              {t('connectedApps.actions.disconnect')}
            </Button>
          </View>
        </>
      ) : integration.comingSoon ? (
        <Text muted style={styles.centerText} testID="integration-coming-soon">
          {t('connectedApps.comingSoonMessage', { appName: name })}
        </Text>
      ) : (
        <Button
          size="lg"
          onPress={() => {
            onConnect(integration);
            onClose();
          }}
          testID="integration-connect"
        >
          {t('connectedApps.actions.connect')}
        </Button>
      )}
    </BottomSheet>
  );
}

export function ConnectionSummary({ connected, syncing }: { connected: number; syncing: number }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]} testID="connection-summary">
      <View style={styles.headerStart}>
        <View style={[styles.dot, { backgroundColor: colors.statusSuccess }]} />
        <Text size="sm" weight="500">{`${connected} ${t('connectedApps.connected')}`}</Text>
      </View>
      {syncing > 0 ? (
        <Text size="xs" muted>
          {`${syncing} ${t('connectedApps.syncing')}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  headerStart: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rows: { gap: 8, marginTop: 8 },
  row: { padding: 12, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconWrapLg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  syncBox: { padding: 12, borderRadius: 8, gap: 4, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 8 },
  centerText: { textAlign: 'center', paddingVertical: 24 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
