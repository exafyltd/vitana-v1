/**
 * VTID-05176 — Slider (web slider.tsx, Radix API): `value[]`, `defaultValue`,
 * `min`, `max`, `step`, `onValueChange`, `onValueCommit`, `disabled`. One thumb
 * PER VALUE (Radix semantics; the web draws only one thumb, so a `[min, max]`
 * range has one draggable value there — slider.tsx:21, reported as a web
 * defect, Open question 3). Gesture Handler pan per thumb; the fill runs from
 * the inline start. Each thumb is `adjustable` with increment/decrement.
 */
import { useMemo, useRef } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from './provider/context';
import { useControllableState } from './overlay/useControllableState';

function decimals(step: number): number {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** Clamp to [min, max] and round to the nearest step counted from `min`. */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (step <= 0) return clamped;
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(Math.min(Math.max(snapped, min), max).toFixed(decimals(step)));
}

/** The value after dragging `deltaPx` (physical x) from `start` on a track `width` px wide. */
export function valueFromDrag(start: number, deltaPx: number, width: number, min: number, max: number, step: number, rtl: boolean): number {
  if (width <= 0) return snapToStep(start, min, max, step);
  const sign = rtl ? -1 : 1;
  return snapToStep(start + sign * (deltaPx / width) * (max - min), min, max, step);
}

/** Thumb `index` may not pass its neighbours (Radix `minStepsBetweenThumbs = 0`). */
export function setThumb(values: readonly number[], index: number, next: number): number[] {
  const lo = index > 0 ? values[index - 1] : -Infinity;
  const hi = index < values.length - 1 ? values[index + 1] : Infinity;
  const out = [...values];
  out[index] = Math.min(Math.max(next, lo), hi);
  return out;
}

export type SliderProps = {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  'aria-label'?: string;
  testID?: string;
};

export function Slider({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  disabled = false,
  style,
  accessibilityLabel,
  'aria-label': ariaLabel,
  testID = 'slider',
}: SliderProps) {
  const theme = useTheme();
  const rtl = theme.direction === 'rtl';
  const [values, setValues] = useControllableState<number[]>(value, defaultValue ?? [min], onValueChange);
  const width = useRef(0);
  const latest = useRef(values);
  latest.current = values;
  const dragStart = useRef(0);
  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;

  // Handlers read the latest props through a ref, so the gestures stay stable.
  const live = useRef({ min, max, step, rtl, onValueCommit, setValues });
  live.current = { min, max, step, rtl, onValueCommit, setValues };

  const update = (index: number, next: number) => {
    const { min, max, step } = live.current;
    const out = setThumb(latest.current, index, snapToStep(next, min, max, step));
    if (out.some((v, i) => v !== latest.current[i])) {
      latest.current = out;
      live.current.setValues(out);
    }
    return out;
  };

  const gestures = useMemo(
    () =>
      values.map((_, index) =>
        Gesture.Pan()
          .runOnJS(true)
          .enabled(!disabled)
          .withTestId(`${testID}-thumb-${index}-pan`)
          .onBegin(() => {
            dragStart.current = latest.current[index];
          })
          .onUpdate((e) => {
            const { min, max, step, rtl } = live.current;
            update(index, valueFromDrag(dragStart.current, e.translationX, width.current, min, max, step, rtl));
          })
          .onEnd(() => {
            live.current.onValueCommit?.(latest.current);
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.length, disabled, testID],
  );

  const onAction = (index: number) => (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? step : e.nativeEvent.actionName === 'decrement' ? -step : 0;
    if (!delta) return;
    const out = update(index, latest.current[index] + delta);
    onValueCommit?.(out);
  };

  const lowPct = values.length > 1 ? pct(Math.min(...values)) : 0;
  const highPct = pct(Math.max(...values));

  return (
    <View testID={testID} style={[styles.root, { opacity: disabled ? 0.5 : 1 }, style]}>
      <View
        testID={`${testID}-track`}
        onLayout={(e: LayoutChangeEvent) => {
          width.current = e.nativeEvent.layout.width;
        }}
        style={[styles.track, { backgroundColor: theme.colors.secondary, borderRadius: theme.radius.full }]}
      >
        <View
          testID={`${testID}-range`}
          style={[styles.range, { start: `${lowPct}%`, width: `${highPct - lowPct}%`, backgroundColor: theme.colors.primary }]}
        />
      </View>
      {values.map((v, index) => (
        <GestureDetector key={index} gesture={gestures[index]}>
          <View
            testID={`${testID}-thumb-${index}`}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={ariaLabel ?? accessibilityLabel}
            accessibilityState={{ disabled }}
            accessibilityValue={{ min, max, now: v }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction(index)}
            hitSlop={12}
            style={[
              styles.thumb,
              { start: `${pct(v)}%`, borderColor: theme.colors.primary, backgroundColor: theme.colors.background, borderRadius: theme.radius.full },
            ]}
          />
        </GestureDetector>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 20, justifyContent: 'center', width: '100%' },
  track: { height: 8, width: '100%', overflow: 'hidden' },
  range: { position: 'absolute', top: 0, bottom: 0 },
  thumb: { position: 'absolute', width: 20, height: 20, borderWidth: 2, marginStart: -10 },
});
