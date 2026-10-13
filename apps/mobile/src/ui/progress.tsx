/**
 * VTID-05176 — Progress (web progress.tsx): role `progressbar` with
 * `accessibilityValue`, `h-4 rounded-full bg-secondary`, the web's rose →
 * orange → teal gradient at 80 % (legacy-literals). The fill grows from the
 * INLINE START (the web fills from the physical left in RTL — progress.tsx:20,
 * reported as a web defect; Open question 5). As on the web, the visible part
 * is the leading end of a full-width gradient.
 */
import { useId } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';

export type ProgressProps = ViewProps & { value?: number | null; max?: number };

export function Progress({ value = 0, max = 100, style, ...rest }: ProgressProps) {
  const theme = useTheme();
  const gradientId = `vprog${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const rtl = theme.direction === 'rtl';
  const indeterminate = value === null;
  const pct = indeterminate ? 0 : Math.min(Math.max(((value ?? 0) / (max || 100)) * 100, 0), 100);
  const [c0, c1, c2] = legacyColors.progressGradient;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={indeterminate ? undefined : { min: 0, max, now: value ?? 0 }}
      accessibilityState={indeterminate ? { busy: true } : undefined}
      {...rest}
      style={[styles.track, { backgroundColor: theme.colors.secondary, borderRadius: theme.radius.full }, style]}
    >
      {pct > 0 ? (
        <View testID="progress-fill" style={[styles.fill, { width: `${pct}%`, opacity: legacyColors.progressOpacity }]}>
          <View style={[styles.gradient, { width: `${(100 / pct) * 100}%` }]}>
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id={gradientId} x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="0">
                  <Stop offset="0" stopColor={c0} />
                  <Stop offset="0.5" stopColor={c1} />
                  <Stop offset="1" stopColor={c2} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
            </Svg>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 16, width: '100%', overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
  // Anchored at the fill's inline end, so the visible slice is the gradient's leading part.
  gradient: { position: 'absolute', top: 0, bottom: 0, end: 0 },
});
