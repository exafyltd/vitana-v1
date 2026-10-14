/**
 * VTID-05176 — drag to dismiss (plan row 18): past 30 % of the panel's size or
 * a fast fling dismisses; under it the sheet springs back. Gesture simulated
 * with Gesture Handler's jest utilities.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { Drawer, DrawerContent, DrawerTitle, Sheet, SheetContent, SheetTitle } from '../../src/ui';
import { DISMISS_FRACTION, FLING_VELOCITY, shouldDismiss } from '../../src/ui/overlay/gesture';
import { renderUI, resetKit } from './helpers';

beforeEach(resetKit);

describe('shouldDismiss', () => {
  it('dismisses past 30 % of the size', () => {
    expect(DISMISS_FRACTION).toBe(0.3);
    expect(shouldDismiss(151, 0, 500)).toBe(true);
    expect(shouldDismiss(149, 0, 500)).toBe(false);
  });
  it('dismisses on a fast fling toward the edge, whatever the distance', () => {
    expect(shouldDismiss(10, FLING_VELOCITY, 500)).toBe(true);
    expect(shouldDismiss(10, FLING_VELOCITY - 1, 500)).toBe(false);
    expect(shouldDismiss(10, -5000, 500)).toBe(false);
  });
  it('a drag away from the edge never dismisses', () => {
    expect(shouldDismiss(-300, 0, 500)).toBe(false);
  });
});

function drag(id: string, axis: 'x' | 'y', distance: number, velocity = 0) {
  const t = axis === 'y' ? 'translationY' : 'translationX';
  const v = axis === 'y' ? 'velocityY' : 'velocityX';
  fireGestureHandler(getByGestureTestId(id), [
    { state: State.BEGAN, [t]: 0, [v]: 0 },
    { state: State.ACTIVE, [t]: distance / 2, [v]: velocity },
    { state: State.ACTIVE, [t]: distance, [v]: velocity },
    { state: State.END, [t]: distance, [v]: velocity },
  ]);
}

function layout(testID: string, width: number, height: number) {
  fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

describe('bottom sheet (Drawer) drag on the handle', () => {
  function setup() {
    const onOpenChange = jest.fn();
    renderUI(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>T</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    layout('drawer-content', 390, 400);
    return onOpenChange;
  }

  it('dismisses past the threshold', () => {
    const onOpenChange = setup();
    act(() => drag('drawer-content-pan', 'y', 200));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('springs back under the threshold', () => {
    const onOpenChange = setup();
    act(() => drag('drawer-content-pan', 'y', 60));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('dismisses on a fling', () => {
    const onOpenChange = setup();
    act(() => drag('drawer-content-pan', 'y', 20, 1500));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('dragging up does not dismiss', () => {
    const onOpenChange = setup();
    act(() => drag('drawer-content-pan', 'y', -200, -1500));
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('side sheet drag on its axis', () => {
  it.each([
    ['right', 1],
    ['left', -1],
  ] as const)('side=%s dismisses when dragged toward its edge', (side, sign) => {
    const onOpenChange = jest.fn();
    renderUI(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent side={side}>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    layout('sheet-content', 300, 800);
    act(() => drag('sheet-content-pan', 'x', -sign * 200));
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => drag('sheet-content-pan', 'x', sign * 200));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('side=top dismisses upward', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent side="top">
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    layout('sheet-content', 390, 300);
    act(() => drag('sheet-content-pan', 'y', -150));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
