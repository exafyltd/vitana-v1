/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the page
 * chrome `MyBiology.tsx` renders on a phone (its mobile-web branch, :459-763):
 *
 *  - `HealthSubNav`: `<SubNavigation items={healthNavigation} />`
 *    (src/components/SubNavigation.tsx, items src/config/navigation.ts:50-56).
 *    The web items carry no `i18nKey`, so the web shows their English
 *    `name`; the native items read the `subNav.*` catalog keys whose English
 *    values are those names. The active item (NavLink `end`) is the current path.
 *  - `MobileStandardHeader`: the phone branch of `StandardHeader`
 *    (StandardHeader.tsx:37-45) is the title only — no emoji, no description.
 *  - `BiologyUtilityBar`: the `UtilityActionButton` rail (utility-action-button.tsx:99-125):
 *    the page's Search / Calendar / "Add Data", then the global Life Compass
 *    and Gift Voucher buttons. Search and Calendar are health-hub's twins
 *    (HealthUtilityBar.tsx); Gift Voucher is hidden when the IAP-restricted
 *    check is true (drawer.ts `iapRestricted`, never loosened).
 *  - `SplitBar`: `SplitBar` / `SplitBarList` / `SplitBarTrigger` (ui/split-bar.tsx).
 *  - `BiologyPanel`: `Panel` + `PanelHeader` + `PanelTitle` + `PanelContent`.
 * RTL-safe (logical start/end only); every string arrives translated.
 */
import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { HealthButtonIcon, HealthIcon, withAlpha } from '../../../ports/health';
import { BiologyIcon } from '../../../ports/health-biology';
import { navigateToWebPath } from '../../../navigation/navigate';
import { ExpandableSearchButton, UniversalCalendarButton, isIAPRestricted } from '../HealthUtilityBar';
import { openGiftVoucher, openLifeCompass } from '../events';
import { useHealthText } from '../text';

/** src/config/navigation.ts:50-56 healthNavigation. */
export const HEALTH_NAV: ReadonlyArray<{ id: string; path: string; key: string }> = [
  { id: 'overview', path: '/health', key: 'subNav.overview' },
  { id: 'services-hub', path: '/health/services-hub', key: 'subNav.servicesHub' },
  { id: 'my-biology', path: '/health/my-biology', key: 'subNav.myBiology' },
  { id: 'plans', path: '/health/plans', key: 'subNav.plans' },
  { id: 'education-science', path: '/health/education', key: 'subNav.educationScience' },
];

export function HealthSubNav({ activePath }: { activePath: string }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  return (
    <View style={[styles.subNavWrap, { borderColor: colors.border, backgroundColor: withAlpha(colors.background, 0.95) }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNav} testID="biology-subnav">
        {HEALTH_NAV.map((item) => {
          const on = item.path === activePath;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => (on ? undefined : navigateToWebPath(item.path))}
              style={[styles.subNavItem, on ? { backgroundColor: colors.muted } : null]}
              testID={`biology-subnav-${item.id}`}
            >
              <Text size="sm" weight="500" color={on ? colors.foreground : colors.mutedForeground}>
                {t(item.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** StandardHeader.tsx:37-45 — the phone header is the title alone. */
export function MobileStandardHeader({ title }: { title: string }): ReactElement {
  return (
    <View style={styles.header} testID="biology-header">
      <Text size="lg" weight="700" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

function RailPill({ testID, onPress, icon, label }: { testID: string; onPress: () => void; icon: string; label: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Button testID={testID} variant="ghost" size="sm" onPress={onPress} style={[styles.pill, { backgroundColor: withAlpha(colors.muted, 0.6) }]}>
      <HealthIcon name={icon} size={16} color={colors.mutedForeground} />
      <Text size="sm">{label}</Text>
    </Button>
  );
}

/** MyBiology.tsx:476-487 inside UtilityActionButton (utility-action-button.tsx:99-125). */
export function BiologyUtilityBar({ onAddData }: { onAddData: () => void }): ReactElement {
  const { t } = useHealthText();
  const hideVoucher = isIAPRestricted();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar} testID="biology-utility-bar">
      <ExpandableSearchButton placeholder={t('screens.health.searchBiomarkersTestsSupplements')} />
      <UniversalCalendarButton />
      <Button testID="biology-add-data" variant="default" size="sm" onPress={onAddData}>
        <HealthButtonIcon name="Plus" />
        {t('screens.health.addData')}
      </Button>
      <RailPill testID="biology-life-compass-button" onPress={openLifeCompass} icon="Target" label={t('lifeCompass.title')} />
      {!hideVoucher ? <RailPill testID="biology-gift-voucher-button" onPress={openGiftVoucher} icon="Gift" label={t('actionBar.giftVoucher')} /> : null}
    </ScrollView>
  );
}

export function SplitBar<T extends string>({
  items,
  value,
  onChange,
  testID,
}: {
  items: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  testID: string;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.split, { backgroundColor: colors.muted }]} accessibilityRole="tablist" testID={testID}>
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
            <Text size="sm" weight={on ? '600' : '500'} muted={!on} numberOfLines={1} style={styles.center}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Panel (bg-card/80) with PanelHeader (icon + title, subtitle) and PanelContent. */
export function BiologyPanel({ icon, title, subtitle, children, testID }: { icon: string; title: string; subtitle: string; children: ReactNode; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.panel, { backgroundColor: withAlpha(colors.card, 0.8), borderColor: withAlpha(colors.border, 0.2) }]} testID={testID}>
      <View style={styles.panelHeader}>
        <View style={styles.titleRow}>
          <BiologyIcon name={icon} size={20} />
          <Text size="lg" weight="600" accessibilityRole="header" style={styles.fill}>
            {title}
          </Text>
        </View>
        <Text size="sm" muted>
          {subtitle}
        </Text>
      </View>
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

/** The centred icon + message + optional action of the panes' empty / error states (MyBiology.tsx:534-560, :600-626). */
export function PaneState({ icon, title, body, action, testID }: { icon: string; title: string; body?: string; action?: ReactNode; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.state} testID={testID}>
      <View style={styles.dim}>
        <BiologyIcon name={icon} size={48} color={colors.mutedForeground} />
      </View>
      <Text weight="500" muted style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text size="sm" muted style={styles.center}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  subNavWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  subNav: { gap: 4, paddingHorizontal: 24, paddingVertical: 12 },
  subNavItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  header: { paddingTop: 4 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 20 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  split: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  trigger: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
  panel: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  panelHeader: { padding: 24, paddingBottom: 12, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelContent: { paddingHorizontal: 24, paddingBottom: 24 },
  state: { alignItems: 'center', paddingVertical: 48, gap: 4 },
  dim: { opacity: 0.5, marginBottom: 12 },
  stateAction: { marginTop: 16 },
});
