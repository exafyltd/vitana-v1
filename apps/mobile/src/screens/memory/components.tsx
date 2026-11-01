/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — shared building blocks of
 * the four memory screens. The web pages render the responsive desktop
 * `AppLayout` + `SubNavigation` + `StandardHeader` on phones (no mobile-web
 * branch, plan decision 6), so the native screens body-port them: the N3
 * shell supplies the chrome, `MemoryScaffold` the header (title, description,
 * emoji) and the memory sub-navigation (web `memoryNavigation`), and
 * `MemoryCard` the web `VCard` (eyebrow / title / meta / body / actions).
 * Ports only; RTL-safe (logical start/end); every string arrives translated.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { MemoryIcon } from '../../ports/memory';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';

export type MemorySection = 'overview' | 'timeline' | 'diary' | 'recall' | 'permissions';

/**
 * The web `memoryNavigation` (src/config/navigation.ts:73-79). The Daily Diary
 * item links to `/memory/diary`, which the phone redirects to `/daily-diary`
 * (src/App.tsx:720-727), so the native item goes there directly.
 */
export const MEMORY_NAV: ReadonlyArray<{ id: MemorySection; path: string }> = [
  { id: 'overview', path: '/memory' },
  { id: 'timeline', path: '/memory/timeline' },
  { id: 'diary', path: '/daily-diary' },
  { id: 'recall', path: '/memory/recall' },
  { id: 'permissions', path: '/memory/permissions' },
];

export function MemorySubNav({ active }: { active: MemorySection }) {
  const { t } = useI18n();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNav} testID="memory-subnav">
      {MEMORY_NAV.map((item) => {
        const on = item.id === active;
        return (
          <Button
            key={item.id}
            size="sm"
            variant={on ? 'default' : 'ghost'}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => (on ? undefined : navigateToWebPath(item.path))}
            testID={`memory-subnav-${item.id}`}
          >
            {t(`screens.memory.memorySubnav_${item.id}`)}
          </Button>
        );
      })}
    </ScrollView>
  );
}

/** Scrollable page: sub-navigation, the StandardHeader twin (emoji + title + description), an action row, the body. */
export function MemoryScaffold({
  active,
  title,
  description,
  emoji,
  actions,
  children,
  testID,
}: {
  active: MemorySection;
  title: string;
  description: string;
  emoji: string;
  actions?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <MemorySubNav active={active} />
      <View style={styles.header}>
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
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      {children}
    </ScrollView>
  );
}

/** The web `VCard size="standard"`: an optional eyebrow (icon + label), title, meta line, body and actions. */
export function MemoryCard({
  eyebrow,
  eyebrowIcon,
  title,
  meta,
  children,
  actions,
  testID,
}: {
  eyebrow?: string;
  eyebrowIcon?: string;
  title?: ReactNode;
  meta?: string;
  children?: ReactNode;
  actions?: ReactNode;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {eyebrow ? (
        <View style={styles.eyebrow}>
          {eyebrowIcon ? <MemoryIcon name={eyebrowIcon} size={16} color={colors.mutedForeground} /> : null}
          <Text variant="label" muted>
            {eyebrow}
          </Text>
        </View>
      ) : null}
      {typeof title === 'string' ? <Text weight="600">{title}</Text> : title}
      {meta ? (
        <Text variant="caption" muted>
          {meta}
        </Text>
      ) : null}
      {children}
      {actions ? <View style={styles.cardActions}>{actions}</View> : null}
    </View>
  );
}

/** The web `VCardSkeleton`. */
export function CardSkeleton({ height = 120, testID = 'memory-card-skeleton' }: { height?: number; testID?: string }) {
  return <Skeleton testID={testID} style={{ height, borderRadius: 16 }} />;
}

/** A dashed notice box with an optional retry (the web's error / empty boxes). */
export function NoticeBox({ message, retryLabel, onRetry, children, testID }: { message: string; retryLabel?: string; onRetry?: () => void; children?: ReactNode; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.notice, { borderColor: colors.border }]}>
      <Text muted>{message}</Text>
      {children}
      {retryLabel && onRetry ? (
        <Button variant="outline" size="sm" onPress={onRetry} testID={testID ? `${testID}-retry` : undefined}>
          {retryLabel}
        </Button>
      ) : null}
    </View>
  );
}

/** A wrapping row of single-select chips (the web Chip / Badge toggles). */
export function ChipRow({
  label,
  chips,
  isActive,
  onPress,
  testID,
}: {
  label: string;
  chips: ReadonlyArray<{ key: string; label: string }>;
  isActive: (key: string) => boolean;
  onPress: (key: string) => void;
  testID?: string;
}) {
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}>
      {chips.map((c) => {
        const on = isActive(c.key);
        return (
          <Button key={c.key} size="xs" variant={on ? 'default' : 'outline'} accessibilityState={{ selected: on }} onPress={() => onPress(c.key)} testID={`${testID ?? 'chip'}-${c.key}`}>
            {c.label}
          </Button>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  subNav: { gap: 8, paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emoji: { fontSize: 28, lineHeight: 34 },
  fill: { flex: 1 },
  description: { marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  notice: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 16, gap: 8, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
