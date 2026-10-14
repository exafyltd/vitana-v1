/**
 * VTID-05176 — the overlay stack's building block (plan change 9).
 *
 * Every overlay renders in a transparent React Native `Modal` (the native
 * portal) with a GestureHandlerRootView inside (Android). Android back and a
 * backdrop tap call `onOpenChange(false)`; focus moves to the overlay's title
 * on open; the toast host renders inside the top-most open overlay.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../provider/context';
import { legacyColors } from '../theme';
import { ToastSlot } from '../toast/ToastHost';
import { usePresence } from './presence';
import { useOverlayEntry } from './stack';

type OverlayContextValue = {
  id: string;
  depth: number;
  close: () => void;
  progress: SharedValue<number>;
  titleRef: RefObject<unknown>;
  reducedMotion: boolean;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay(): OverlayContextValue | null {
  return useContext(OverlayContext);
}

export type OverlayModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Dialog, Sheet, Drawer, ResponsiveDialog only (web useOrbSuppression, F20). */
  suppressOrb: boolean;
  /** Backdrop colour; `null` = no visible backdrop (the tap target stays). */
  backdropColor: string | null;
  overlayStyle?: StyleProp<ViewStyle>;
  /** Radix AlertDialog does not close on an outside tap. */
  dismissOnBackdrop?: boolean;
  /** `false` = no open/close animation (DialogContentNoAnimation). */
  animate?: boolean;
  durationMs: number;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
};

export function OverlayModal({
  open,
  onOpenChange,
  suppressOrb,
  backdropColor,
  overlayStyle,
  dismissOnBackdrop = true,
  animate = true,
  durationMs,
  containerStyle,
  testID = 'overlay',
  children,
}: OverlayModalProps) {
  const theme = useTheme();
  const reduced = theme.reducedMotion || !animate;
  const { mounted, progress } = usePresence(open, durationMs, reduced);
  const parent = useContext(OverlayContext);
  const depth = (parent?.depth ?? 0) + 1;
  const id = useOverlayEntry(open, suppressOrb, depth);
  const titleRef = useRef<unknown>(null);
  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      try {
        const node = titleRef.current ? findNodeHandle(titleRef.current as never) : null;
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      } catch {
        // No native node (tests, unmounted) — nothing to focus.
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  const ctx = useMemo(() => ({ id, depth, close, progress, titleRef, reducedMotion: reduced }), [id, depth, close, progress, reduced]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      supportedOrientations={['portrait']}
      testID={`${testID}-modal`}
    >
      <GestureHandlerRootView style={styles.fill} testID="vitana-ui-overlay-gesture-root">
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor ?? legacyColors.transparent }, overlayStyle, backdropStyle]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          testID={`${testID}-overlay`}
        >
          <Pressable
            testID={`${testID}-backdrop`}
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdrop ? close : undefined}
            accessible={false}
          />
        </Animated.View>
        <OverlayContext.Provider value={ctx}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.fill, containerStyle]}
            pointerEvents="box-none"
          >
            {children}
          </KeyboardAvoidingView>
        </OverlayContext.Provider>
        <ToastSlot overlayId={id} />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
