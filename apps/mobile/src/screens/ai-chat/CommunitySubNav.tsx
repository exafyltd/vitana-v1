/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the web
 * `SubNavigation items={communityNavigation}` row Talk to Vitana renders on
 * phones (`src/components/SubNavigation.tsx`, `src/config/navigation.ts:17-24`):
 * the six Community sections as a horizontally scrolling row of pills, the
 * current one highlighted (`NavLink end`). The web labels are the config's
 * English names (no `i18nKey`); here each comes from the catalog key that
 * already names that section in the drawer / mobile nav, so every locale reads
 * its own language. A tap goes through the shell's `navigateToWebPath`.
 */
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';

/** Web `communityNavigation`, in order, with the catalog key for each label. */
export const COMMUNITY_SECTIONS: ReadonlyArray<{ id: string; path: string; labelKey: string }> = [
  { id: 'overview', path: '/comm', labelKey: 'mobileNav.overview' },
  { id: 'events-meetups', path: '/comm/events-meetups', labelKey: 'drawerNav.events' },
  { id: 'find-partner', path: '/comm/find-partner', labelKey: 'drawerNav.findPartner' },
  { id: 'live-rooms', path: '/comm/live-rooms', labelKey: 'drawerNav.live' },
  { id: 'media-hub', path: '/comm/media-hub', labelKey: 'drawerNav.media' },
  { id: 'talk-to-vitana', path: '/comm/talk-to-vitana', labelKey: 'screens.community.talkVitana' },
];

export function CommunitySubNav({ activePath }: { activePath: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="community-subnav" contentContainerStyle={styles.row} style={[styles.bar, { borderBottomColor: colors.border }]}>
      {COMMUNITY_SECTIONS.map((item) => {
        const active = item.path === activePath;
        return (
          <Pressable
            key={item.id}
            testID={`community-subnav-${item.id}`}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) navigateToWebPath(item.path);
            }}
            style={[styles.pill, active ? { backgroundColor: colors.muted } : null]}
          >
            <Text size="sm" weight="500" color={active ? colors.foreground : colors.mutedForeground} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0 },
  row: { gap: 4, paddingVertical: 12 },
  pill: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
});
