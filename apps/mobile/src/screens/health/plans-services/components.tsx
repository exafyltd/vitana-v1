/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — shared
 * building blocks of the pillars / conditions / education / plans /
 * services-hub screens. The web pages render the same responsive layout on a
 * phone (their Spotlight branch is desktop + flag only, plan decision 6):
 * `SubNavigation items={healthNavigation}`, a `StandardHeader` (emoji, title,
 * description), an optional `UtilityActionButton` row, a `SplitBar` and
 * `Panel` cards. The N3 shell supplies the app chrome; `HealthScaffold` is the
 * sub-navigation + header, `SplitBar` the tab strip (`?tab=` picks the first
 * value, like the web `useUrlTab`), `HealthPanel` the Panel card and
 * `QuickActionsDialog` the web `*MasterActionPopup`. RTL-safe (logical
 * start/end only); every string arrives translated.
 */
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, HealthIcon } from '../../../ports/health-plans';
import { useI18n } from '../../../i18n/I18nProvider';
import { navigateToWebPath } from '../../../navigation/navigate';

/**
 * The web `healthNavigation` (src/config/navigation.ts:50-56). The web items
 * carry no `i18nKey`, so SubNavigation shows their English `name`; the native
 * items read the `subNav.*` catalog keys whose English values are those names.
 */
export const HEALTH_NAV: ReadonlyArray<{ id: string; path: string; key: string }> = [
  { id: 'overview', path: '/health', key: 'subNav.overview' },
  { id: 'services-hub', path: '/health/services-hub', key: 'subNav.servicesHub' },
  { id: 'my-biology', path: '/health/my-biology', key: 'subNav.myBiology' },
  { id: 'plans', path: '/health/plans', key: 'subNav.plans' },
  { id: 'education-science', path: '/health/education', key: 'subNav.educationScience' },
];

/** The web SubNavigation (NavLink `end`): the item whose path is the current path is active. */
export function HealthSubNav({ activePath }: { activePath: string }) {
  const { t } = useI18n();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNav} testID="health-subnav">
      {HEALTH_NAV.map((item) => {
        const on = item.path === activePath;
        return (
          <Button
            key={item.id}
            size="sm"
            variant={on ? 'secondary' : 'ghost'}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => navigateToWebPath(item.path)}
            testID={`health-subnav-${item.id}`}
          >
            {t(item.key)}
          </Button>
        );
      })}
    </ScrollView>
  );
}

/** The web `StandardHeader`: emoji + title + description. */
export function StandardHeader({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]} testID="health-header">
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {emoji}
      </Text>
      <View style={styles.fill}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Text muted style={styles.description}>
          {description}
        </Text>
      </View>
    </View>
  );
}

/** Scrollable page: the health sub-navigation, then the body (header, utility row, content). */
export function HealthScaffold({ activePath, children, testID }: { activePath: string; children: ReactNode; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <HealthSubNav activePath={activePath} />
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

/** The web `UtilityActionButton` row (end-aligned actions). */
export function UtilityRow({ children }: { children: ReactNode }) {
  return <View style={styles.utility}>{children}</View>;
}

/** The web `Panel` card (`bg-card/80 border-border/20 rounded-2xl`), pressable when `onPress` is given. */
export function HealthPanel({ children, onPress, testID, accessibilityLabel }: { children: ReactNode; onPress?: () => void; testID?: string; accessibilityLabel?: string }) {
  const { colors } = useUITheme();
  const style = [styles.panel, { backgroundColor: colors.card, borderColor: colors.border }];
  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [style, pressed ? styles.pressed : null]} testID={testID}>
      {children}
    </Pressable>
  );
}

/** The icon tile at the top of a web Panel (`w-12 h-12 rounded-lg bg-gradient-to-br …`). */
export function IconTile({ name, tint }: { name: string; tint: string }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.iconTile, { backgroundColor: tint }]}>
      <HealthIcon name={name} size={24} color={colors.foreground} />
    </View>
  );
}

/** Reads `?tab=` once like the web `useUrlTab(param, fallback)`: an unknown value falls back. */
export function useUrlTab<T extends string>(values: readonly T[], fallback: T): [T, (v: T) => void] {
  const params = useLocalSearchParams<{ tab?: string }>();
  const initial = (values as readonly string[]).includes(params.tab ?? '') ? (params.tab as T) : fallback;
  return useState<T>(initial);
}

/** The web `SplitBar` / `SplitBarList` / `SplitBarTrigger` strip. */
export function SplitBar<T extends string>({ items, value, onChange, testID }: { items: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (v: T) => void; testID: string }) {
  const { colors } = useUITheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.split, { backgroundColor: colors.muted }]} accessibilityRole="tablist" testID={testID}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.value)}
            style={[styles.trigger, on ? { backgroundColor: colors.background } : null]}
            testID={`${testID}-${item.value}`}
          >
            <Text size="sm" weight={on ? '600' : '500'} muted={!on}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type QuickAction = { id: string; icon: string; title: string; description: string; path: string };

/** The web `EducationMasterActionPopup` / `ServicesMasterActionPopup`: a dialog of action cards and a Close button. */
export function QuickActionsDialog({ open, onClose, title, actions, testID }: { open: boolean; onClose: () => void; title: string; actions: readonly QuickAction[]; testID: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const go = (path: string) => {
    onClose();
    navigateToWebPath(path);
  };
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID={testID}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollView style={styles.dialogList} contentContainerStyle={styles.dialogListBody}>
          {actions.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => go(a.path)}
              accessibilityRole="button"
              accessibilityLabel={a.title}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              testID={`${testID}-${a.id}`}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.muted }]}>
                <HealthIcon name={a.icon} size={24} color={colors.primary} />
              </View>
              <Text weight="600">{a.title}</Text>
              <Text size="sm" muted>
                {a.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={[styles.dialogFooter, { borderColor: colors.border }]}>
          <Button variant="ghost" size="sm" onPress={onClose} testID={`${testID}-close-button`}>
            {t('screens.common.close')}
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

/** A thin progress track with an inline-start fill (the web's hand-drawn `h-2 rounded-full` bars). */
export function Bar({ percent, fill, track, height = 8, testID }: { percent: number; fill: string; track: string; height?: number; testID?: string }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: track }]} testID={testID} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}

export const healthStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 16 },
  fill: { flex: 1 },
});

const styles = StyleSheet.create({
  page: { paddingBottom: 32 },
  subNav: { gap: 4, paddingHorizontal: 16, paddingVertical: 12 },
  body: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 16, padding: 20 },
  emoji: { fontSize: 28, lineHeight: 34 },
  fill: { flex: 1 },
  description: { marginTop: 4 },
  utility: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  panel: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 },
  pressed: { opacity: 0.8 },
  iconTile: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  split: { borderRadius: 8, padding: 4, gap: 4 },
  trigger: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  dialogList: { maxHeight: 480 },
  dialogListBody: { gap: 12 },
  actionCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dialogFooter: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, paddingTop: 12 },
  bar: { width: '100%', overflow: 'hidden' },
});
