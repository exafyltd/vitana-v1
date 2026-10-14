/**
 * VTID-05176 — ResponsiveDialog (web responsive-dialog.tsx, 39 importers),
 * phone branch only (F19): a bottom sheet (`rounded-t-2xl`, handle w-10 h-1,
 * `max-h = screen − 24`, bottom inset) or fullscreen with the top inset
 * (`fullscreenOnMobile`); sticky header, scrollable body, sticky footer; close
 * button 40×40 at the top inline end unless `hideCloseButton`. Overlay
 * black/60. Suppresses the ORB (F20).
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { BottomSheet } from './overlay/BottomSheet';
import { CloseButton } from './overlay/CloseButton';
import { OverlayModal } from './overlay/OverlayModal';
import { createOverlayRoot } from './overlay/root';
import { OverlayDescription, OverlayHeader, OverlayTitle } from './overlay/parts';

const root = createOverlayRoot('ResponsiveDialog');

export const ResponsiveDialog = root.Root;
export const ResponsiveDialogTrigger = root.Trigger;
export const ResponsiveDialogClose = root.Close;
export const ResponsiveDialogTitle = OverlayTitle;
export const ResponsiveDialogDescription = OverlayDescription;

export type ResponsiveDialogContentProps = ViewProps & {
  fullscreenOnMobile?: boolean;
  hideCloseButton?: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function ResponsiveDialogContent({
  fullscreenOnMobile = false,
  hideCloseButton = false,
  overlayStyle,
  style,
  children,
  testID = 'responsive-dialog',
}: ResponsiveDialogContentProps) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb
      backdropColor={legacyColors.overlayResponsive}
      overlayStyle={overlayStyle}
      durationMs={theme.motion.sheetMs}
      testID={testID}
    >
      <BottomSheet fullscreen={fullscreenOnMobile} testID={`${testID}-content`} style={style}>
        <View style={fullscreenOnMobile ? styles.fill : styles.column}>{children}</View>
        {!hideCloseButton ? (
          <CloseButton onPress={() => setOpen(false)} testID={`${testID}-close`} top={fullscreenOnMobile ? 4 : 4} inset={8} />
        ) : null}
      </BottomSheet>
    </OverlayModal>
  );
}

export function ResponsiveDialogHeader({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <OverlayHeader style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }, style]} {...props} />;
}

export function ResponsiveDialogBody({ style, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      style={[styles.body, style]}
      contentContainerStyle={[styles.bodyContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}

export function ResponsiveDialogFooter({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }, style]} {...props} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flexShrink: 1 },
  // px-4 pr-12 pt-2 pb-3 border-b — `pe` keeps the title clear of the close button in both directions.
  header: { paddingHorizontal: 16, paddingEnd: 48, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 16, paddingVertical: 16 },
  footer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
