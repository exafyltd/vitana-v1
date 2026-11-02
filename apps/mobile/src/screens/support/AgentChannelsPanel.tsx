/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twin of the
 * Autopilot channels panel on the Connectors "Autopilot" tab
 * (`src/components/business/vaea/VaeaChannelsPanel.tsx` + `useVaeaChannels`):
 * the member's channels with active switch, dry-run / paused badges, last
 * error, remove, and the add-channel form. GET /vaea/channels is a read; add
 * (POST), pause/resume (PATCH) and remove (DELETE) are writes, mocked in tests.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, IconButton, Spinner, Switch, Text, TextInput, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Panel, PanelTitle } from './components';
import {
  CHANNEL_PLATFORMS,
  VAEA_CHANNELS_QUERY_KEY,
  createVaeaChannel,
  fetchVaeaChannels,
  patchVaeaChannel,
  removeVaeaChannel,
  type ChannelPlatform,
} from './data/connectors';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function AgentChannelsPanel(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const channels = useQuery({ queryKey: VAEA_CHANNELS_QUERY_KEY, queryFn: fetchVaeaChannels });
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = () => queryClient.invalidateQueries({ queryKey: VAEA_CHANNELS_QUERY_KEY });

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      await reload();
    } catch {
      // The web leaves the row as it was on a failed toggle / remove; so does native.
    } finally {
      setBusyId(null);
    }
  };

  if (channels.isLoading) {
    return (
      <View style={styles.center} testID="agent-loading">
        <Spinner accessibilityLabel={t('mailhub.status.loading')} />
      </View>
    );
  }

  const list = channels.data ?? [];

  return (
    <Panel testID="agent-channels">
      <View style={styles.headRow}>
        <View style={styles.fill}>
          <PanelTitle title={t('screens.business.autopilotChannels')} subtitle={t('screens.business.channelsAutopilotListensForReferralOpportunities')} />
        </View>
        <Button size="sm" onPress={() => setShowForm((v) => !v)} testID="agent-toggle-form">
          {showForm ? t('supportNative.connectors.agent.close') : t('screens.business.addChannel')}
        </Button>
      </View>

      {channels.error ? (
        <View style={[styles.errorBox, { borderColor: colors.destructive, backgroundColor: colors.statusErrorSubtle }]} testID="agent-error">
          <Text size="sm" color={colors.destructive} style={styles.fill}>
            {t('supportNative.connectors.agent.loadError')}
          </Text>
          <Button variant="outline" size="sm" onPress={() => void reload()}>
            {t('screens.business.retry')}
          </Button>
        </View>
      ) : null}

      {showForm ? (
        <AddChannelForm
          onSubmit={async (payload) => {
            await createVaeaChannel(payload);
            await reload();
            setShowForm(false);
          }}
        />
      ) : null}

      {list.length === 0 && !showForm ? (
        <Text size="sm" muted style={styles.centerText} testID="agent-empty">
          {t('screens.business.noChannelsYetAutopilotWonT')}
        </Text>
      ) : (
        list.map((channel) => (
          <View key={channel.id} style={[styles.channel, { borderColor: colors.border }]} testID={`agent-channel-${channel.id}`}>
            <View style={styles.headRow}>
              <View style={[styles.badges, styles.fill]}>
                <Badge variant="outline">{capitalize(channel.platform)}</Badge>
                <Text size="sm" weight="500">
                  {channel.display_name || channel.channel_key}
                </Text>
                {channel.dry_run ? <Badge variant="secondary">{t('screens.business.dryrun')}</Badge> : null}
                {!channel.active ? <Badge variant="destructive">{t('screens.business.paused')}</Badge> : null}
              </View>
              <Switch
                checked={channel.active}
                disabled={busyId === channel.id}
                onCheckedChange={(v) => void run(channel.id, () => patchVaeaChannel(channel.id, { active: v }))}
                accessibilityLabel={channel.display_name || channel.channel_key}
                testID={`agent-active-${channel.id}`}
              />
              <IconButton
                name="Trash2"
                accessibilityLabel={t('supportNative.connectors.agent.remove')}
                onPress={() => void run(channel.id, () => removeVaeaChannel(channel.id))}
                testID={`agent-remove-${channel.id}`}
              />
            </View>
            {channel.last_error ? (
              <Text size="xs" color={colors.destructive}>
                {t('screens.business.lastErrorLast_error', { last_error: channel.last_error })}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </Panel>
  );
}

function AddChannelForm({
  onSubmit,
}: {
  onSubmit: (payload: { platform: ChannelPlatform; channel_key: string; display_name: string | null; dry_run: boolean }) => Promise<void>;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [platform, setPlatform] = useState<ChannelPlatform>('maxina');
  const [channelKey, setChannelKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.form, { backgroundColor: colors.muted }]} testID="agent-form">
      <Text size="xs" muted>
        {t('screens.business.platform')}
      </Text>
      <View style={styles.badges} accessibilityRole="radiogroup" accessibilityLabel={t('screens.business.platform')}>
        {CHANNEL_PLATFORMS.map((p) => (
          <Button
            key={p}
            size="xs"
            variant={p === platform ? 'default' : 'outline'}
            onPress={() => setPlatform(p)}
            accessibilityState={{ selected: p === platform }}
            testID={`agent-platform-${p}`}
          >
            {p}
          </Button>
        ))}
      </View>
      <Text size="xs" muted>
        {t('screens.business.channelKeyId')}
      </Text>
      <TextInput
        testID="agent-channel-key"
        value={channelKey}
        onChangeText={setChannelKey}
        placeholder={t('screens.business.platformspecificIdentifier')}
        accessibilityLabel={t('screens.business.channelKeyId')}
      />
      <Text size="xs" muted>
        {t('screens.business.displayNameOptional')}
      </Text>
      <TextInput
        testID="agent-display-name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder={t('screens.business.friendlyLabel')}
        accessibilityLabel={t('screens.business.displayNameOptional')}
      />
      {failed ? (
        <Text size="xs" color={colors.destructive}>
          {t('supportNative.connectors.agent.addError')}
        </Text>
      ) : null}
      <Button
        disabled={busy || !channelKey.trim()}
        testID="agent-add"
        onPress={async () => {
          setBusy(true);
          setFailed(false);
          try {
            await onSubmit({ platform, channel_key: channelKey.trim(), display_name: displayName.trim() || null, dry_run: true });
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t('screens.business.addChannel')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 24 },
  centerText: { textAlign: 'center', paddingVertical: 24 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  channel: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 12 },
  form: { borderRadius: 8, padding: 12, gap: 8 },
});
