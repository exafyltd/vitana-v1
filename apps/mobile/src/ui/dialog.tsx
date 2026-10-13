/**
 * VTID-05176 — Dialog (web dialog.tsx, 145 importers). Centred, full width,
 * square corners on a phone (`sm:rounded-lg` never applies), overlay black/80,
 * fade + scale. Suppresses the ORB (F20). The close button is visible at the
 * inline end — the web hides it with `[&>button]:sr-only` (dialog.tsx:63) and
 * pins it to the physical right; both are documented native differences.
 * `DialogContentNoAnimation` / `DialogContentNoOverlay` (Appilix WebView
 * workarounds on the web) are kept so ports compile.
 */
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { CloseButton } from './overlay/CloseButton';
import { OverlayModal, useOverlay } from './overlay/OverlayModal';
import { createOverlayRoot, NoopOverlay, Portal } from './overlay/root';
import { OverlayDescription, OverlayFooter, OverlayHeader, OverlayTitle } from './overlay/parts';

const root = createOverlayRoot('Dialog');

export const Dialog = root.Root;
export const DialogTrigger = root.Trigger;
export const DialogClose = root.Close;
export const DialogPortal = Portal;
export const DialogOverlay = NoopOverlay;
export const DialogHeader = OverlayHeader;
export const DialogFooter = OverlayFooter;
export const DialogTitle = OverlayTitle;
export const DialogDescription = OverlayDescription;

export type DialogContentProps = ViewProps & {
  /** Web `overlayClassName`. */
  overlayStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** The centred surface with fade + scale (also used by AlertDialog). */
export function CenteredPanel({ style, children, onClose, ...rest }: ViewProps & { onClose: () => void }) {
  const theme = useTheme();
  const overlay = useOverlay();
  const animated = useAnimatedStyle(() => {
    const p = overlay ? overlay.progress.value : 1;
    return { opacity: p, transform: [{ scale: 0.95 + 0.05 * p }] };
  });
  return (
    <Animated.View
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
      {...rest}
      style={[
        styles.panel,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border, ...theme.elevation.lg },
        style,
        animated,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function makeContent(animate: boolean, backdrop: boolean, display: string) {
  function Content({ overlayStyle, children, testID = 'dialog', ...rest }: DialogContentProps) {
    const { open, setOpen } = root.useRoot();
    const theme = useTheme();
    const close = () => setOpen(false);
    return (
      <OverlayModal
        open={open}
        onOpenChange={setOpen}
        suppressOrb
        backdropColor={backdrop ? legacyColors.overlayDialog : null}
        overlayStyle={overlayStyle}
        animate={animate}
        durationMs={theme.motion.dialogMs}
        containerStyle={styles.center}
        testID={testID}
      >
        <CenteredPanel testID={`${testID}-content`} onClose={close} {...rest}>
          {children}
          <CloseButton onPress={close} testID={`${testID}-close`} top={8} inset={8} iconSize={16} />
        </CenteredPanel>
      </OverlayModal>
    );
  }
  Content.displayName = display;
  return Content;
}

export const DialogContent = makeContent(true, true, 'DialogContent');
export const DialogContentNoAnimation = makeContent(false, true, 'DialogContentNoAnimation');
export const DialogContentNoOverlay = makeContent(true, false, 'DialogContentNoOverlay');

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  panel: { width: '100%', borderWidth: 1, padding: 24, gap: 16 },
});
