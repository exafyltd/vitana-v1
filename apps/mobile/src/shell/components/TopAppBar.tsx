/**
 * VTID-05186 (N3, plan change 18) — src/components/mobile/TopAppBar.tsx:
 * kebab (start) · tenant name (centre, uppercased, truncating) · mute + LIVE
 * (end). Maxina gets the brand gradient, other tenants a plain bar. LIVE is
 * hidden inside a live room. Logic pinned in scripts/native/shell-pins.json.
 */
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PressableRow, Text, useUITheme } from '../../ports/ui';
import { maxinaTopbar } from '../../ports/tokens';
import { useSoundscape } from '../../ports/soundscape';
import { useI18n } from '../../i18n/I18nProvider';
import { useTenant } from '../../identity/TenantProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { getInstantTenantName } from '../logic/tenant-display';

export const TOP_BAR_HEIGHT = 32;

export function TopAppBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { tenant, storedSlug, registry } = useTenant();
  const soundscape = useSoundscape();

  const instantName = getInstantTenantName(pathname, storedSlug, registry);
  const tenantName = instantName || tenant?.name || '';
  const resolvedSlug = instantName ? instantName.toLowerCase() : tenant?.slug;
  const isMaxina = resolvedSlug === 'maxina';
  const isInLiveRoom = pathname.startsWith('/comm/live-rooms/') || pathname.startsWith('/community/live-rooms/');
  const showLive = !isInLiveRoom;
  const fg = isMaxina ? maxinaTopbar.color : colors.foreground;

  return (
    <View
      testID="top-app-bar"
      style={[
        styles.bar,
        { paddingTop: insets.top },
        isMaxina ? { experimental_backgroundImage: maxinaTopbar.backgroundImage } : { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.side, styles.start]}>
          <IconButton testID="top-bar-menu" name="MoreVertical" color={fg} onPress={onMenuClick} accessibilityLabel={t('screens.mobile.openNavigationMenu')} />
        </View>
        <Text testID="top-bar-tenant" numberOfLines={1} style={[styles.title, { color: fg, letterSpacing: isMaxina ? 3.8 : 1.6, fontWeight: isMaxina ? '500' : '600' }]}>
          {tenantName.toUpperCase()}
        </Text>
        <View style={[styles.side, styles.end]}>
          <IconButton
            testID="top-bar-mute"
            name={soundscape.isMuted ? 'VolumeX' : 'Volume2'}
            size={18}
            color={fg}
            onPress={soundscape.toggleMute}
            accessibilityLabel={t(soundscape.isMuted ? 'screens.audio.unmute' : 'screens.audio.mute')}
          />
          {showLive ? (
            <PressableRow
              testID="top-bar-live"
              onPress={() => navigateToWebPath('/comm/live-rooms')}
              accessibilityLabel={t('screens.mobile.openLiveRooms')}
              style={[styles.live, { borderColor: isMaxina ? 'rgba(255,255,255,0.45)' : colors.border }]}
            >
              <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.liveText, { color: fg }]}>{t('mobileNav.live')}</Text>
            </PressableRow>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { zIndex: 40 },
  row: { height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  start: { justifyContent: 'flex-start' },
  end: { justifyContent: 'flex-end' },
  title: { flexShrink: 1, fontSize: 20, textAlign: 'center' },
  live: { height: 24, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
