/**
 * VTID-05510 — the frame the three legacy sub-catalogue pages share on a phone
 * (Supplements.tsx / WellnessServices.tsx / DealsOffers.tsx, the non-Spotlight
 * branch): SubNavigation on top, the mobile header (title only), the utility
 * rail — Search (page placeholder, inert) · Calendar · "+ Action" · Life
 * Compass · Gift Voucher (not on iOS) · Refresh — and the page's SplitBar
 * tabs (TabsBar). The quick-actions dialog and the product drawer belong to
 * the page. Refresh = the web `window.location.reload()`: every query of the
 * screen is refetched and the content remounts.
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text, useUITheme } from '../../ports/ui';
import { MobileHeader, QuickActionsDialog, SubNavigation } from './chrome';
import { ActionButton, CalendarButton, RefreshButton, SearchButton, UtilityBar } from './UtilityBar';

export type TabItem = { value: string; label: string };

/** The web SplitBar (src/components/ui/split-bar.tsx): one row of equal segments, the active one raised. */
export function TabsBar({ items, value, onChange }: { items: TabItem[]; value: string; onChange: (v: string) => void }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.split, { backgroundColor: colors.muted }]} accessibilityRole="tablist" testID="discover-split-bar">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            testID={`discover-tab-${it.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(it.value)}
            style={[styles.segment, active ? { backgroundColor: colors.background } : null]}
          >
            <Text size="sm" weight="500" numberOfLines={1} color={active ? colors.foreground : colors.mutedForeground} style={styles.center}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SubCatalogueFrame({
  path,
  title,
  searchPlaceholder,
  actionKind,
  tabs,
  activeTab,
  onTabChange,
  children,
  overlays,
  testID,
}: {
  path: string;
  title: string;
  searchPlaceholder: string;
  actionKind: 'shop' | 'book';
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (v: string) => void;
  children: ReactNode;
  overlays?: ReactNode;
  testID: string;
}): ReactElement {
  const { colors } = useUITheme();
  const qc = useQueryClient();
  const [actionOpen, setActionOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const refresh = () => {
    void qc.invalidateQueries();
    setEpoch((e) => e + 1);
  };
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID={testID}>
      <SubNavigation activePath={path} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" accessibilityLabel={title}>
        <MobileHeader title={title} />
        <UtilityBar returnTo={path} trailing={<RefreshButton onPress={refresh} />}>
          <SearchButton placeholder={searchPlaceholder} />
          <CalendarButton />
          <ActionButton onPress={() => setActionOpen(true)} />
        </UtilityBar>
        <TabsBar items={tabs} value={activeTab} onChange={onTabChange} />
        <View key={epoch} style={styles.content}>
          {children}
        </View>
      </ScrollView>
      <QuickActionsDialog kind={actionKind} open={actionOpen} onOpenChange={setActionOpen} />
      {overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 24, paddingBottom: 128, gap: 24 },
  content: { gap: 24 },
  split: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4 },
  center: { textAlign: 'center' },
});
