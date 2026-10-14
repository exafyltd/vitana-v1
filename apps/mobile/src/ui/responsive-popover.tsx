/**
 * VTID-05176 — ResponsivePopover (web responsive-popover.tsx), phone branch only
 * (F19): a bottom sheet with a handle, an optional `title` and a 44×44 close
 * button at the inline end of the header row; scrollable body. Overlay
 * black/60. Does NOT suppress the ORB (F20). `align`/`sideOffset` are accepted
 * and ignored (desktop popover props).
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { Text } from './foundation/Text';
import { BottomSheet } from './overlay/BottomSheet';
import { CloseButton } from './overlay/CloseButton';
import { OverlayModal, useOverlay } from './overlay/OverlayModal';
import { createOverlayRoot } from './overlay/root';

const root = createOverlayRoot('ResponsivePopover');

export const ResponsivePopover = root.Root;
export const ResponsivePopoverTrigger = root.Trigger;
export const ResponsivePopoverClose = root.Close;

export type ResponsivePopoverContentProps = ViewProps & {
  title?: string;
  hideCloseButton?: boolean;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  overlayStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function SheetTitleText({ children }: { children: string }) {
  const overlay = useOverlay();
  return (
    <Text ref={overlay?.titleRef as never} accessibilityRole="header" size="base" weight="600" style={styles.title}>
      {children}
    </Text>
  );
}

export function ResponsivePopoverContent({ title, hideCloseButton = false, overlayStyle, style, children, testID = 'responsive-popover' }: ResponsivePopoverContentProps) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb={false}
      backdropColor={legacyColors.overlayResponsive}
      overlayStyle={overlayStyle}
      durationMs={theme.motion.sheetMs}
      testID={testID}
    >
      <BottomSheet testID={`${testID}-content`} style={style}>
        {title || !hideCloseButton ? (
          <View testID={`${testID}-header`} style={[styles.header, { borderColor: theme.colors.border }]}>
            {title ? <SheetTitleText>{title}</SheetTitleText> : <View style={styles.title} />}
            {!hideCloseButton ? (
              <CloseButton placement="inline" size={44} onPress={() => setOpen(false)} testID={`${testID}-close`} style={styles.close} />
            ) : null}
          </View>
        ) : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </BottomSheet>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  // flex justify-between: the close button is the last child, i.e. the inline end in both directions.
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1 },
  close: { marginEnd: -8 },
  scroll: { flexShrink: 1 },
  scrollContent: { padding: 16 },
});
