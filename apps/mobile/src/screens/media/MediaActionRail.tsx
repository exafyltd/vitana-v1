/**
 * VTID-05677 — the compact mobile action rail of `MediaHub.tsx:706-773`:
 * Autopilot pill (opens the sheet the journey-autopilot lane registers, via the
 * overlay bus), the expandable search button (web `onSearch` only logs, so it
 * has no result action), the Shorts / Music / Podcasts mode pill, the Calendar
 * button (the shell handles `calendar:open`) and the primary Upload button.
 * The Vitana Index pill and the Autopilot pending count are class-B and belong
 * to the health and journey lanes (the merged Home port defers them the same way).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Text, TextInput, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { overlayBus } from '../../navigation/overlay-bus';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { Plus } from '../../ports/media-ui';

export type MediaMode = 'shorts' | 'music' | 'podcasts';

export function MediaActionRail({ mode, onModeChange, onUpload }: { mode: MediaMode; onModeChange: (m: MediaMode) => void; onUpload: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const modes: ModeOption[] = [
    { value: 'shorts', label: t('mediaHub.tabs.shorts'), icon: '📹' },
    { value: 'music', label: t('mediaHub.tabs.music'), icon: '🎵' },
    { value: 'podcasts', label: t('mediaHub.tabs.podcasts'), icon: '🎙' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} testID="media-action-rail">
      <Button variant="ghost" size="sm" onPress={() => overlayBus.emit('autopilot:open')} accessibilityLabel={t('actionBar.autopilot')} testID="media-autopilot" style={[styles.pill, { backgroundColor: colors.muted }]}>
        <View style={styles.pillContent}>
          <Icon name="Plane" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('actionBar.autopilot')}</Text>
        </View>
      </Button>
      {searchOpen ? (
        <TextInput value={query} onChangeText={setQuery} placeholder={t('mediaHub.searchPlaceholder')} accessibilityLabel={t('mediaHub.searchPlaceholder')} autoFocus returnKeyType="search" onBlur={() => !query && setSearchOpen(false)} testID="media-search-input" style={styles.search} />
      ) : (
        <IconButton name="Search" onPress={() => setSearchOpen(true)} accessibilityLabel={t('mediaHub.searchPlaceholder')} testID="media-search" />
      )}
      <MobileModePill modes={modes} activeMode={mode} onModeChange={(v) => onModeChange(v as MediaMode)} title={t('mediaHubNative.selectMode')} />
      <IconButton name="Calendar" onPress={() => overlayBus.emit('calendar:open')} accessibilityLabel={t('mediaHubNative.a11y.calendar')} testID="media-calendar" />
      <Button variant="default" size="sm" onPress={onUpload} accessibilityLabel={t('mediaHub.actions.upload')} testID="media-upload-open" style={styles.pill}>
        <View style={styles.pillContent}>
          <Plus size={16} color={colors.primaryForeground} />
          <Text size="sm" style={{ color: colors.primaryForeground }}>
            {t('mediaHub.actions.upload')}
          </Text>
        </View>
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pill: { borderRadius: 20, paddingHorizontal: 12 },
  pillContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  search: { width: 180 },
});
