/**
 * VTID-05176 — Sheet (web sheet.tsx, 43 importers): a slide-in panel.
 * `side` keeps the web's PHYSICAL semantics (top | bottom | left | right,
 * default right) and adds the logical `start` / `end`. Drag to dismiss on the
 * slide axis. Suppresses the ORB (F20); overlay black/20; close button at the
 * inline end.
 *
 * This file holds the kit's only documented physical-side mapping: a physical
 * `left`/`right` side must stay on that physical edge in Arabic too (lines
 * marked `physical-ok`; tests/ui/guards.test.ts allows nothing else).
 */
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme, type Direction } from './provider/context';
import { useInsets } from './foundation/insets';
import { legacyColors } from './theme';
import { CloseButton } from './overlay/CloseButton';
import { OverlayModal } from './overlay/OverlayModal';
import { SlidePanel } from './overlay/SlidePanel';
import { createOverlayRoot, NoopOverlay, Portal } from './overlay/root';
import { OverlayDescription, OverlayFooter, OverlayHeader, OverlayTitle } from './overlay/parts';

export type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end';
export const SHEET_SIDES: readonly SheetSide[] = ['top', 'bottom', 'left', 'right', 'start', 'end'];

const root = createOverlayRoot('Sheet');

export const Sheet = root.Root;
export const SheetTrigger = root.Trigger;
export const SheetClose = root.Close;
export const SheetPortal = Portal;
export const SheetOverlay = NoopOverlay;
export const SheetHeader = (props: ViewProps) => <OverlayHeader gap={8} {...props} />;
export const SheetFooter = OverlayFooter;
export const SheetTitle = OverlayTitle;
export const SheetDescription = OverlayDescription;

type Physical = 'top' | 'bottom' | 'left' | 'right';

/** `start`/`end` resolve against the reading direction; physical sides stay physical. */
export function physicalSide(side: SheetSide, direction: Direction): Physical {
  if (side === 'start') return direction === 'rtl' ? 'right' : 'left';
  if (side === 'end') return direction === 'rtl' ? 'left' : 'right';
  return side;
}

function placement(side: Physical): { axis: 'x' | 'y'; sign: 1 | -1; position: ViewStyle } {
  switch (side) {
    case 'top':
      return { axis: 'y', sign: -1, position: { top: 0, start: 0, end: 0 } };
    case 'bottom':
      return { axis: 'y', sign: 1, position: { bottom: 0, start: 0, end: 0 } };
    case 'left':
      return { axis: 'x', sign: -1, position: { top: 0, bottom: 0, left: 0 } }; // physical-ok: web side="left"
    case 'right':
      return { axis: 'x', sign: 1, position: { top: 0, bottom: 0, right: 0 } }; // physical-ok: web side="right"
  }
}

export type SheetContentProps = ViewProps & {
  side?: SheetSide;
  overlayStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function SheetContent({ side = 'right', overlayStyle, style, children, testID = 'sheet' }: SheetContentProps) {
  const { open, setOpen } = root.useRoot();
  const theme = useTheme();
  const insets = useInsets();
  const window = useWindowDimensions();
  const phys = physicalSide(side, theme.direction);
  const { axis, sign, position } = placement(phys);
  const vertical = axis === 'y';
  return (
    <OverlayModal
      open={open}
      onOpenChange={setOpen}
      suppressOrb
      backdropColor={legacyColors.overlaySheet}
      overlayStyle={overlayStyle}
      durationMs={theme.motion.sheetMs}
      testID={testID}
    >
      <SlidePanel
        axis={axis}
        sign={sign}
        testID={`${testID}-content`}
        positionStyle={position}
        style={[
          styles.panel,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border, ...theme.elevation.lg },
          vertical
            ? phys === 'top'
              ? { borderBottomWidth: 1, paddingTop: 24 + insets.top }
              : { borderTopWidth: 1, paddingBottom: 24 + insets.bottom }
            : {
                width: Math.round(window.width * 0.75),
                // The border sits on the panel's inner edge, whichever logical edge that is.
                ...((phys === 'left') !== (theme.direction === 'rtl') ? { borderEndWidth: 1 } : { borderStartWidth: 1 }),
                paddingTop: 24 + insets.top,
                paddingBottom: 24 + insets.bottom,
              },
          style,
        ]}
      >
        <View style={styles.body}>{children}</View>
        <CloseButton
          onPress={() => setOpen(false)}
          testID={`${testID}-close`}
          top={(phys === 'bottom' ? 0 : insets.top) + 8}
          inset={8}
          iconSize={16}
        />
      </SlidePanel>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 24 },
  body: { gap: 16, flexShrink: 1 },
});
