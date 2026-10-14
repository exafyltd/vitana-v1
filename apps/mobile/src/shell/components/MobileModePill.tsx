/**
 * VTID-05186 (N3, plan change 18) — src/components/ui/MobileModePill.tsx: the
 * pill naming the active mode and the sheet listing every mode, dot-notation
 * children grouped under their parent, the active group expanded. Screen
 * lanes pass their own `ModeOption[]`; N3 ships the component only.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, CountBadge, Icon, PressableRow, Text, useUITheme } from '../../ports/ui';
import { findActiveLabel, initiallyExpandedGroups, type ModeOption } from '../logic/mode-pill';

export type { ModeOption };

export function MobileModePill({ modes, activeMode, onModeChange, title }: { modes: ModeOption[]; activeMode: string; onModeChange: (value: string) => void; title?: string }) {
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => initiallyExpandedGroups(modes, activeMode));
  const active = findActiveLabel(modes, activeMode);
  const select = (value: string) => {
    onModeChange(value);
    setOpen(false);
  };
  const toggle = (value: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  return (
    <>
      <PressableRow testID="mode-pill" onPress={() => setOpen(true)} accessibilityLabel={active?.label} style={[styles.pill, { backgroundColor: colors.muted }]}>
        <Text style={{ fontWeight: '600' }} numberOfLines={1}>
          {active?.label ?? ''}
        </Text>
        <Icon name="ChevronDown" size={16} color={colors.foreground} />
      </PressableRow>
      <BottomSheet testID="mode-sheet" open={open} onClose={() => setOpen(false)} title={title}>
        {modes.map((mode) => {
          const isGroup = !!mode.children?.length;
          const isOpen = expanded.has(mode.value);
          return (
            <View key={mode.value}>
              <PressableRow
                testID={`mode-${mode.value}`}
                accessibilityRole={isGroup ? 'button' : 'radio'}
                accessibilityState={isGroup ? undefined : { checked: mode.value === activeMode }}
                onPress={() => (isGroup ? toggle(mode.value) : select(mode.value))}
                style={styles.row}
              >
                <Text style={[{ flex: 1 }, mode.value === activeMode ? { fontWeight: '600' } : null]}>{mode.label}</Text>
                <CountBadge count={mode.badge ?? 0} />
                {isGroup ? <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={16} color={colors.mutedForeground} /> : null}
                {!isGroup && mode.value === activeMode ? <Icon name="Check" size={16} color={colors.primary} /> : null}
              </PressableRow>
              {isGroup && isOpen
                ? mode.children?.map((c) => (
                    <PressableRow
                      key={c.value}
                      testID={`mode-${c.value}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: c.value === activeMode }}
                      onPress={() => select(c.value)}
                      style={[styles.row, styles.child]}
                    >
                      <Text style={[{ flex: 1 }, c.value === activeMode ? { fontWeight: '600' } : null]}>{c.label}</Text>
                      {c.value === activeMode ? <Icon name="Check" size={16} color={colors.primary} /> : null}
                    </PressableRow>
                  ))
                : null}
            </View>
          );
        })}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, gap: 6 },
  row: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  child: { paddingStart: 28 },
});
