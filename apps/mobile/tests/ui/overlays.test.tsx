/**
 * VTID-05176 — overlays: open/close contract (trigger, close button, Android
 * back, backdrop tap), ORB suppression (only Dialog/Sheet/Drawer/
 * ResponsiveDialog, ref-counted, survives nesting), close buttons at the inline
 * end in LTR and RTL (never `left`/`right`), LTR/RTL/dark snapshots.
 */
import type { ReactElement } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogContentNoAnimation,
  DialogContentNoOverlay,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerTitle,
  getOrbSuppressionCount,
  isOrbSuppressed,
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogTitle,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsivePopover,
  ResponsivePopoverContent,
  Sheet,
  SHEET_SIDES,
  SheetContent,
  SheetTitle,
  subscribeOrbSuppression,
  Text,
  useOrbSuppressed,
} from '../../src/ui';
import { legacyColors } from '../../src/ui/theme';
import { physicalSide } from '../../src/ui/sheet';
import { flat, hostChildren, MODES, physicalKeys, renderMode, renderUI, resetKit, type Mode } from './helpers';

beforeEach(resetKit);

function OrbProbe() {
  const suppressed = useOrbSuppressed();
  return <Text testID="orb">{suppressed ? 'hidden' : 'shown'}</Text>;
}

describe('Dialog', () => {
  it('opens from DialogTrigger asChild and closes from the close button', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button testID="open">Open</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button testID="inner-close">Close it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText('Title')).toBeNull();
    fireEvent.press(screen.getByTestId('open'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Title').props.accessibilityRole).toBe('header');
    expect(screen.getByTestId('dialog-content').props.accessibilityViewIsModal).toBe(true);
    const close = screen.getByTestId('dialog-close');
    expect(close.props.accessibilityLabel).toBe('Close');
    fireEvent.press(close);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText('Title')).toBeNull();
  });

  it('DialogClose closes it too', () => {
    renderUI(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogClose asChild>
            <Button testID="inner-close">Close it</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    fireEvent.press(screen.getByTestId('inner-close'));
    expect(screen.queryByTestId('dialog-content')).toBeNull();
  });

  it('Android back and a backdrop tap call onOpenChange(false) (controlled)', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    fireEvent(screen.getByTestId('dialog-modal'), 'requestClose');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    fireEvent.press(screen.getByTestId('dialog-backdrop', { includeHiddenElements: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // controlled: still open until the parent says otherwise
    expect(screen.getByTestId('dialog-content')).toBeTruthy();
  });

  it('overlay black/80; NoOverlay has none; overlayStyle is applied', () => {
    const { unmount } = renderUI(
      <Dialog defaultOpen>
        <DialogContent overlayStyle={{ zIndex: 7 }}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const backdrop = screen.getByTestId('dialog-overlay', { includeHiddenElements: true });
    expect(flat(backdrop.props.style)).toMatchObject({ backgroundColor: legacyColors.overlayDialog, zIndex: 7 });
    unmount();
    renderUI(
      <Dialog defaultOpen>
        <DialogContentNoOverlay testID="noov">
          <DialogTitle>T</DialogTitle>
        </DialogContentNoOverlay>
      </Dialog>,
    );
    expect(flat(screen.getByTestId('noov-overlay', { includeHiddenElements: true }).props.style).backgroundColor).toBe(legacyColors.transparent);
  });

  it('DialogContentNoAnimation renders at full opacity immediately even with motion on', () => {
    renderUI(
      <Dialog defaultOpen>
        <DialogContentNoAnimation testID="na">
          <DialogTitle>T</DialogTitle>
        </DialogContentNoAnimation>
      </Dialog>,
      { reducedMotion: false },
    );
    expect(flat(screen.getByTestId('na-content').props.style).opacity).toBe(1);
  });
});

describe('AlertDialog / ResponsiveConfirmDialog', () => {
  it('AlertDialog: no close button, backdrop does not dismiss, Action/Cancel close', () => {
    const onOpenChange = jest.fn();
    const onAction = jest.fn();
    renderUI(
      <AlertDialog defaultOpen onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          <Button>Open</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogDescription>Desc</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction testID="yes" onPress={onAction}>
              Yes
            </AlertDialogAction>
            <AlertDialogCancel testID="no">No</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.queryByTestId('alert-dialog-close')).toBeNull();
    fireEvent.press(screen.getByTestId('alert-dialog-backdrop', { includeHiddenElements: true }));
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('yes'));
    expect(onAction).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('ResponsiveConfirmDialog: Action/Cancel are 48 pt tall; Android back cancels', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <ResponsiveConfirmDialog open onOpenChange={onOpenChange}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogTitle>Sure?</ResponsiveConfirmDialogTitle>
          <ResponsiveConfirmDialogAction testID="yes">Yes</ResponsiveConfirmDialogAction>
          <ResponsiveConfirmDialogCancel testID="no">No</ResponsiveConfirmDialogCancel>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>,
    );
    expect(flat(screen.getByTestId('yes').props.style).height).toBe(48);
    expect(flat(screen.getByTestId('no').props.style).height).toBe(48);
    fireEvent(screen.getByTestId('confirm-dialog-modal'), 'requestClose');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ORB suppression (web useOrbSuppression, F20)', () => {
  const suppressing: [string, ReactElement][] = [
    ['Dialog', <Dialog key="d" defaultOpen><DialogContent><DialogTitle>T</DialogTitle></DialogContent></Dialog>],
    ['Sheet', <Sheet key="s" defaultOpen><SheetContent><SheetTitle>T</SheetTitle></SheetContent></Sheet>],
    ['Drawer', <Drawer key="dr" defaultOpen><DrawerContent><DrawerTitle>T</DrawerTitle></DrawerContent></Drawer>],
    ['ResponsiveDialog', <ResponsiveDialog key="r" defaultOpen><ResponsiveDialogContent><ResponsiveDialogTitle>T</ResponsiveDialogTitle></ResponsiveDialogContent></ResponsiveDialog>],
  ];
  const notSuppressing: [string, ReactElement][] = [
    ['AlertDialog', <AlertDialog key="a" defaultOpen><AlertDialogContent><AlertDialogTitle>T</AlertDialogTitle></AlertDialogContent></AlertDialog>],
    ['ResponsiveConfirmDialog', <ResponsiveConfirmDialog key="c" defaultOpen><ResponsiveConfirmDialogContent><ResponsiveConfirmDialogTitle>T</ResponsiveConfirmDialogTitle></ResponsiveConfirmDialogContent></ResponsiveConfirmDialog>],
    ['ResponsivePopover', <ResponsivePopover key="p" defaultOpen><ResponsivePopoverContent title="T"><Text>x</Text></ResponsivePopoverContent></ResponsivePopover>],
  ];

  it.each(suppressing)('%s suppresses the ORB while open', (_name, el) => {
    const { unmount } = renderUI(
      <>
        <OrbProbe />
        {el}
      </>,
    );
    expect(getOrbSuppressionCount()).toBe(1);
    expect(screen.getByTestId('orb').props.children).toBe('hidden');
    unmount();
    expect(getOrbSuppressionCount()).toBe(0);
  });

  it.each(notSuppressing)('%s does not suppress the ORB', (_name, el) => {
    renderUI(
      <>
        <OrbProbe />
        {el}
      </>,
    );
    expect(getOrbSuppressionCount()).toBe(0);
    expect(screen.getByTestId('orb').props.children).toBe('shown');
  });

  it('is ref-counted across nesting and notifies subscribers on flips only', () => {
    const flips: boolean[] = [];
    const unsubscribe = subscribeOrbSuppression((s) => flips.push(s));
    renderUI(
      <Sheet defaultOpen>
        <SheetContent>
          <Dialog defaultOpen>
            <DialogTrigger asChild>
              <Button>Open</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Inner</DialogTitle>
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>,
    );
    expect(getOrbSuppressionCount()).toBe(2);
    fireEvent.press(screen.getByTestId('dialog-close'));
    expect(getOrbSuppressionCount()).toBe(1);
    expect(isOrbSuppressed()).toBe(true);
    fireEvent.press(screen.getByTestId('sheet-close'));
    expect(getOrbSuppressionCount()).toBe(0);
    expect(flips).toEqual([true, false]);
    unsubscribe();
  });
});

describe('Sheet sides', () => {
  it('start/end follow the direction; physical sides stay physical', () => {
    expect(physicalSide('start', 'ltr')).toBe('left');
    expect(physicalSide('start', 'rtl')).toBe('right');
    expect(physicalSide('end', 'ltr')).toBe('right');
    expect(physicalSide('end', 'rtl')).toBe('left');
    expect(physicalSide('left', 'rtl')).toBe('left');
    expect(physicalSide('right', 'rtl')).toBe('right');
  });

  it.each(SHEET_SIDES)('side=%s opens with the black/20 overlay', (side) => {
    renderUI(
      <Sheet defaultOpen>
        <SheetContent side={side}>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(flat(screen.getByTestId('sheet-overlay', { includeHiddenElements: true }).props.style).backgroundColor).toBe(legacyColors.overlaySheet);
  });
});

/** Every overlay with a close button, rendered open. */
const CLOSE_CASES: [string, string, ReactElement][] = [
  ['Dialog', 'dialog', <Dialog defaultOpen><DialogContent><DialogTitle>T</DialogTitle></DialogContent></Dialog>],
  ['DialogContentNoAnimation', 'dna', <Dialog defaultOpen><DialogContentNoAnimation testID="dna"><DialogTitle>T</DialogTitle></DialogContentNoAnimation></Dialog>],
  ['DialogContentNoOverlay', 'dno', <Dialog defaultOpen><DialogContentNoOverlay testID="dno"><DialogTitle>T</DialogTitle></DialogContentNoOverlay></Dialog>],
  ...SHEET_SIDES.map((side): [string, string, ReactElement] => [
    `Sheet ${side}`,
    `sheet-${side}`,
    <Sheet defaultOpen><SheetContent side={side} testID={`sheet-${side}`}><SheetTitle>T</SheetTitle></SheetContent></Sheet>,
  ]),
  ['Drawer', 'drawer', <Drawer defaultOpen><DrawerContent showCloseButton><DrawerTitle>T</DrawerTitle></DrawerContent></Drawer>],
  ['ResponsiveDialog sheet', 'responsive-dialog', <ResponsiveDialog defaultOpen><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>T</ResponsiveDialogTitle></ResponsiveDialogHeader><ResponsiveDialogBody><Text>b</Text></ResponsiveDialogBody><ResponsiveDialogFooter><Button>f</Button></ResponsiveDialogFooter></ResponsiveDialogContent></ResponsiveDialog>],
  ['ResponsiveDialog fullscreen', 'rdf', <ResponsiveDialog defaultOpen><ResponsiveDialogContent fullscreenOnMobile testID="rdf"><ResponsiveDialogTitle>T</ResponsiveDialogTitle></ResponsiveDialogContent></ResponsiveDialog>],
  ['ResponsivePopover', 'responsive-popover', <ResponsivePopover defaultOpen><ResponsivePopoverContent title="T"><Text>b</Text></ResponsivePopoverContent></ResponsivePopover>],
];

describe.each(CLOSE_CASES)('%s close button', (_name, id, el) => {
  it.each(['ltr', 'rtl'] as Mode[])('%s: labelled, at the inline end, never left/right', (mode) => {
    const view = renderMode(el, mode);
    const close = screen.getByTestId(`${id}-close`);
    expect(close.props.accessibilityLabel).toBe(mode === 'rtl' ? 'إغلاق' : 'Close');
    const style = flat(close.props.style);
    expect(physicalKeys(close.props.style)).toEqual([]);
    if (style.position === 'absolute') {
      expect(style.end).toEqual(expect.any(Number));
    } else {
      // Inline in a row header: the last child of a row, i.e. the inline end in both directions.
      const row = screen.getByTestId(`${id}-header`);
      const kids = hostChildren(row as never);
      expect(kids[kids.length - 1]).toBe(close);
      expect(flat(row.props.style).flexDirection).toBe('row');
    }
    expect(view.toJSON()).toMatchSnapshot();
  });

  it('closes the overlay', () => {
    renderUI(el);
    fireEvent.press(screen.getByTestId(`${id}-close`));
    expect(screen.queryByTestId(`${id}-close`)).toBeNull();
  });
});

describe.each(MODES)('overlay %s snapshots', (mode) => {
  it('alert dialog and confirm dialog', () => {
    const view = renderMode(
      <>
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogAction>Yes</AlertDialogAction>
              <AlertDialogCancel>No</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ResponsiveConfirmDialog defaultOpen>
          <ResponsiveConfirmDialogContent>
            <ResponsiveConfirmDialogTitle>Sure?</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogAction>Yes</ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogContent>
        </ResponsiveConfirmDialog>
      </>,
      mode,
    );
    expect(view.toJSON()).toMatchSnapshot();
  });
});

describe('ResponsiveDialog layout', () => {
  it('hideCloseButton hides it; fullscreen pads the top inset and cannot be dragged', () => {
    renderUI(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent hideCloseButton fullscreenOnMobile>
          <ResponsiveDialogTitle>T</ResponsiveDialogTitle>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );
    expect(screen.queryByTestId('responsive-dialog-close')).toBeNull();
    expect(screen.queryByTestId('responsive-dialog-content-handle')).toBeNull();
  });

  it('the sheet branch has the handle and black/60 overlay', () => {
    renderUI(
      <ResponsiveDialog defaultOpen>
        <ResponsiveDialogContent>
          <ResponsiveDialogTitle>T</ResponsiveDialogTitle>
        </ResponsiveDialogContent>
      </ResponsiveDialog>,
    );
    expect(screen.getByTestId('responsive-dialog-content-handle')).toBeTruthy();
    expect(flat(screen.getByTestId('responsive-dialog-overlay', { includeHiddenElements: true }).props.style).backgroundColor).toBe(legacyColors.overlayResponsive);
  });
});

describe('reduced motion', () => {
  it('with motion on, an opening dialog starts transparent and a closing one stays mounted for the animation', () => {
    jest.useFakeTimers();
    try {
      renderUI(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
          </DialogContent>
        </Dialog>,
        { reducedMotion: false },
      );
      expect(flat(screen.getByTestId('dialog-content').props.style).opacity).toBe(0);
      fireEvent.press(screen.getByTestId('dialog-close'));
      expect(screen.getByTestId('dialog-content')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(screen.queryByTestId('dialog-content')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('under reduced motion it opens at full opacity and unmounts at once', () => {
    renderUI(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>,
      { reducedMotion: true },
    );
    expect(flat(screen.getByTestId('dialog-content').props.style).opacity).toBe(1);
    fireEvent.press(screen.getByTestId('dialog-close'));
    expect(screen.queryByTestId('dialog-content')).toBeNull();
  });
});
