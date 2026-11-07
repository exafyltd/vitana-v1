/**
 * VTID-05461 — twin of `src/components/journey/GuidedModeSwitch.tsx`
 * (VTID-03279): the Guided Journey / Full App segmented control above the
 * hero (web `ProfileIdSegmentedControl size="sm"`, max-w-xs, centred).
 * Hidden while the mode is unknown; switching only flips the durable mode.
 * Mobile-only on the web, and native is always mobile.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha } from '../../ports/journey';
import { useI18n } from '../../i18n/I18nProvider';
import { useGuidedMode, type JourneyMode } from './providers/GuidedModeProvider';

export function GuidedModeSwitch(): ReactElement | null {
  const { mode, setMode, loading } = useGuidedMode();
  const { t } = useI18n();
  const { colors } = useUITheme();
  if (loading) return null;
  const segments: ReadonlyArray<{ id: JourneyMode; label: string }> = [
    { id: 'guided', label: t('screens.guidedMode.guidedLabel') },
    { id: 'full', label: t('screens.guidedMode.fullLabel') },
  ];
  return (
    <View style={styles.outer} testID="guided-mode-switch">
      <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.border, 0.5) }]}>
        {segments.map((s) => {
          const on = s.id === mode;
          return (
            <Pressable
              key={s.id}
              testID={`guided-mode-${s.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (s.id !== mode) void setMode(s.id);
              }}
              style={[styles.segment, on ? { backgroundColor: colors.accent } : null]}
            >
              <Text size="xs" weight="600" color={on ? colors.foreground : alpha(colors.foreground, 0.75)}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', paddingHorizontal: 4 },
  track: { flexDirection: 'row', width: '100%', maxWidth: 320, padding: 4, borderRadius: 999, borderWidth: 1 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
});
