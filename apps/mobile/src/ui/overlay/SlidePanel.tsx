/**
 * VTID-05176 — the sliding surface under Sheet, Drawer, ResponsiveDialog,
 * ResponsivePopover, the confirm sheet and Select: Reanimated slide in/out and
 * a Gesture Handler drag to dismiss on the slide axis (past 30 % of its size or
 * a fast fling, else it springs back). Lives inside an OverlayModal.
 */
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useOverlay } from './OverlayModal';
import { shouldDismiss } from './gesture';

export type SlidePanelProps = {
  /** Slide axis and the physical direction the panel leaves in (+1 = down/right). */
  axis: 'x' | 'y';
  sign: 1 | -1;
  /** Where the panel sits (computed by the caller). */
  positionStyle: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  dragToDismiss?: boolean;
  /** `handle`: only the handle node starts a drag (the body may scroll). */
  dragArea?: 'panel' | 'handle';
  handle?: ReactNode;
  testID?: string;
  children?: ReactNode;
};

export function SlidePanel({
  axis,
  sign,
  positionStyle,
  style,
  dragToDismiss = true,
  dragArea = 'panel',
  handle,
  testID = 'slide-panel',
  children,
}: SlidePanelProps) {
  const overlay = useOverlay();
  if (!overlay) throw new Error('SlidePanel must render inside an OverlayModal');
  const { progress, close, reducedMotion } = overlay;
  const window = useWindowDimensions();
  const fallback = axis === 'y' ? window.height : window.width;
  const size = useSharedValue(0);
  const drag = useSharedValue(0);

  const animated = useAnimatedStyle(() => {
    const extent = size.value > 0 ? size.value : fallback;
    const offset = sign * ((1 - progress.value) * extent + drag.value);
    return { transform: axis === 'y' ? [{ translateY: offset }] : [{ translateX: offset }] };
  });

  const pan = useMemo(() => {
    const along = (e: { translationX: number; translationY: number }) => sign * (axis === 'y' ? e.translationY : e.translationX);
    const speed = (e: { velocityX: number; velocityY: number }) => sign * (axis === 'y' ? e.velocityY : e.velocityX);
    let g = Gesture.Pan().runOnJS(true).enabled(dragToDismiss).withTestId(`${testID}-pan`);
    g = axis === 'y' ? g.activeOffsetY([-10, 10]).failOffsetX([-20, 20]) : g.activeOffsetX([-10, 10]).failOffsetY([-20, 20]);
    return g
      .onUpdate((e) => {
        drag.value = Math.max(0, along(e));
      })
      .onEnd((e) => {
        if (shouldDismiss(along(e), speed(e), size.value)) {
          close();
        } else {
          drag.value = reducedMotion ? 0 : withSpring(0);
        }
      });
  }, [axis, sign, dragToDismiss, testID, drag, size, close, reducedMotion]);

  const onLayout = (e: LayoutChangeEvent) => {
    size.value = axis === 'y' ? e.nativeEvent.layout.height : e.nativeEvent.layout.width;
  };

  const panel = (
    <Animated.View
      testID={testID}
      onLayout={onLayout}
      accessibilityViewIsModal
      onAccessibilityEscape={close}
      style={[styles.panel, positionStyle, style, animated]}
    >
      {dragArea === 'handle' && handle ? (
        <GestureDetector gesture={pan}>
          <View testID={`${testID}-handle`}>{handle}</View>
        </GestureDetector>
      ) : (
        handle
      )}
      {children}
    </Animated.View>
  );

  return dragArea === 'panel' ? <GestureDetector gesture={pan}>{panel}</GestureDetector> : panel;
}

const styles = StyleSheet.create({
  panel: { position: 'absolute' },
});
