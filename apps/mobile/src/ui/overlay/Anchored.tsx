/**
 * VTID-05176 — an anchored surface (Popover content, the Tooltip hint) inside
 * an OverlayModal: measures itself and places itself with computePlacement.
 */
import { useState, type ReactNode } from 'react';
import { useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '../provider/context';
import { useInsets } from '../foundation/insets';
import { useOverlay } from './OverlayModal';
import { computePlacement, type Align, type Rect, type Side } from './placement';

export type AnchoredProps = {
  anchor: Rect | null;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityViewIsModal?: boolean;
  children?: ReactNode;
};

export function Anchored({ anchor, side = 'bottom', align = 'center', sideOffset = 4, style, testID, accessibilityViewIsModal, children }: AnchoredProps) {
  const theme = useTheme();
  const overlay = useOverlay();
  const insets = useInsets();
  const window = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Until the trigger is measured the surface is laid out invisibly at the window centre.
  const rect = anchor ?? { x: window.width / 2, y: window.height / 2, width: 0, height: 0 };
  const placed = computePlacement({
    anchor: rect,
    content: size,
    window: { width: window.width, height: window.height },
    insets,
    side,
    align,
    sideOffset,
    rtl: theme.direction === 'rtl',
  });
  const measured = anchor !== null;
  const animated = useAnimatedStyle(() => ({ opacity: measured ? (overlay ? overlay.progress.value : 1) : 0 }));
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };
  return (
    <Animated.View
      testID={testID}
      onLayout={onLayout}
      accessibilityViewIsModal={accessibilityViewIsModal}
      onAccessibilityEscape={overlay?.close}
      style={[{ position: 'absolute', top: placed.top, start: placed.start }, style, animated]}
    >
      {children}
    </Animated.View>
  );
}

/** Measures a trigger in window coordinates. */
export function measureAnchor(node: unknown, done: (rect: Rect | null) => void): void {
  const n = node as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;
  if (!n?.measureInWindow) {
    done(null);
    return;
  }
  n.measureInWindow((x, y, width, height) => done({ x, y, width, height }));
}
