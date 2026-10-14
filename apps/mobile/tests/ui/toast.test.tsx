/**
 * VTID-05176 — toasts: notify* key translation (+ `de` fallback), shadcn
 * toast() limit 1 / 5 s, the sonner-compatible API, the host inside the
 * top-most overlay, swipe up to dismiss, close button at the inline end.
 */
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { catalogs } from '../../src/i18n';
import { translate } from '../../src/i18n';
import { Dialog, DialogContent, DialogTitle, notify, notifyError, notifyInfo, notifySuccess, notifyWarning, Sheet, SheetContent, SheetTitle, toast, useToast, Text } from '../../src/ui';
import { toast as sonner } from '../../src/ui/sonner';
import { getToasts, SHADCN_TOAST_DURATION, SONNER_DURATION, SONNER_VISIBLE } from '../../src/ui/toast/store';
import { toastSwipeDismisses } from '../../src/ui/toast/ToastHost';
import { flat, MODES, physicalKeys, renderMode, renderUI, resetKit } from './helpers';

beforeEach(() => {
  jest.useFakeTimers();
  resetKit();
});
afterEach(() => {
  resetKit();
  jest.useRealTimers();
});

const hostToasts = () => screen.queryAllByTestId(/^toast-t\d+$/);

describe('notify*', () => {
  it('translates keys at display time in the member locale', () => {
    renderUI(<Text>app</Text>, { locale: 'de' });
    act(() => notify('common.done', 'screens.ui.learnMore'));
    expect(screen.getByText(translate('de', 'common.done'))).toBeTruthy();
    expect(screen.getByText(translate('de', 'screens.ui.learnMore'))).toBeTruthy();
  });

  it('falls back to de for a key missing in the locale, then to the key', () => {
    (catalogs.de as Record<string, unknown>).vtid05176 = { onlyDe: 'Nur {x}' };
    try {
      renderUI(<Text>app</Text>, { locale: 'en' });
      act(() => notify('vtid05176.onlyDe', undefined, { x: 'DE' }));
      expect(screen.getByText('Nur DE')).toBeTruthy();
      act(() => notify('does.not.exist'));
      expect(screen.getByText('does.not.exist')).toBeTruthy();
    } finally {
      delete (catalogs.de as Record<string, unknown>).vtid05176;
    }
  });

  it('kinds map to the status colours (richColors)', () => {
    renderUI(<Text>app</Text>);
    act(() => {
      notifySuccess('common.done');
      notifyError('screens.ui.failedLoadData');
      notifyWarning('screens.ui.offline');
    });
    expect(getToasts().map((t) => t.kind)).toEqual(['success', 'error', 'warning']);
    act(() => notifyInfo('screens.ui.reconnecting'));
    expect(getToasts().map((t) => t.kind)).toEqual(['error', 'warning', 'default']);
  });

  it(`sonner-style toasts: at most ${SONNER_VISIBLE} visible, ${SONNER_DURATION} ms`, () => {
    renderUI(<Text>app</Text>);
    act(() => {
      for (let i = 0; i < 5; i++) notify('common.done');
    });
    expect(hostToasts()).toHaveLength(SONNER_VISIBLE);
    act(() => {
      jest.advanceTimersByTime(SONNER_DURATION + 1);
    });
    expect(hostToasts()).toHaveLength(0);
  });
});

describe('shadcn toast()', () => {
  it('limit 1, 5 s, dismiss/update', () => {
    renderUI(<Text>app</Text>);
    act(() => {
      toast({ title: 'First' });
      toast({ title: 'Second', description: 'More', variant: 'destructive' });
    });
    expect(screen.queryByText('First')).toBeNull();
    expect(screen.getByText('Second')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(SHADCN_TOAST_DURATION + 1);
    });
    expect(screen.queryByText('Second')).toBeNull();
    let handle: ReturnType<typeof toast> | undefined;
    act(() => {
      handle = toast({ title: 'Third' });
    });
    act(() => handle?.update({ title: 'Third!' }));
    expect(screen.getByText('Third!')).toBeTruthy();
    act(() => handle?.dismiss());
    expect(screen.queryByText('Third!')).toBeNull();
  });

  it('useToast lists only shadcn toasts and dismisses them', () => {
    let api: ReturnType<typeof useToast> | undefined;
    function Probe() {
      api = useToast();
      return <Text testID="count">{String(api.toasts.length)}</Text>;
    }
    renderUI(<Probe />);
    act(() => {
      notify('common.done');
      api?.toast({ title: 'S' });
    });
    expect(screen.getByTestId('count').props.children).toBe('1');
    act(() => api?.dismiss());
    expect(screen.getByTestId('count').props.children).toBe('0');
    expect(getToasts()).toHaveLength(1);
  });
});

describe('sonner-compatible toast', () => {
  it('(msg, { description }), .success/.error/.warning/.info/.message, .dismiss', () => {
    renderUI(<Text>app</Text>);
    act(() => {
      sonner('Plain', { description: 'Desc' });
    });
    expect(screen.getByText('Plain')).toBeTruthy();
    expect(screen.getByText('Desc')).toBeTruthy();
    let id = '';
    act(() => {
      id = sonner.success('Yay', { id: 'fixed' });
      sonner.error('Bad');
      sonner.warning('Hmm');
    });
    expect(id).toBe('fixed');
    expect(getToasts().map((t) => t.kind)).toEqual(['success', 'error', 'warning']);
    act(() => {
      sonner.info('Info');
      sonner.message('Msg');
    });
    expect(getToasts().map((t) => t.kind)).toEqual(['warning', 'info', 'default']);
    act(() => sonner.dismiss());
    expect(getToasts()).toHaveLength(0);
  });

  it('an action runs and dismisses', () => {
    const onClick = jest.fn();
    renderUI(<Text>app</Text>);
    act(() => {
      sonner('Undo?', { action: { label: 'Undo', onClick } });
    });
    fireEvent.press(screen.getByText('Undo'));
    expect(onClick).toHaveBeenCalled();
    expect(getToasts()).toHaveLength(0);
  });
});

describe('host placement', () => {
  it('renders inside the top-most open overlay, so it is never hidden behind a modal', () => {
    renderUI(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Sheet</SheetTitle>
          <Dialog defaultOpen>
            <DialogContent>
              <DialogTitle>Dialog</DialogTitle>
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>,
    );
    act(() => notify('common.done'));
    const hosts = screen.getAllByTestId('vitana-ui-toast-host');
    expect(hosts).toHaveLength(1);
    // the single host is the one inside the dialog's modal (the top of the stack)
    expect(screen.getAllByText('Done')).toHaveLength(1);
    expect(within(screen.getByTestId('dialog-modal')).getAllByTestId('vitana-ui-toast-host')).toHaveLength(1);
    // closing the dialog moves the host back to the sheet
    fireEvent.press(screen.getByTestId('dialog-close'));
    expect(screen.getAllByTestId('vitana-ui-toast-host')).toHaveLength(1);
    expect(within(screen.getByTestId('sheet-modal')).getAllByTestId('vitana-ui-toast-host')).toHaveLength(1);
    expect(screen.getAllByText('Done')).toHaveLength(1);
  });
});

describe('dismissal', () => {
  it('swipe up dismisses; a small swipe does not', () => {
    expect(toastSwipeDismisses(-31, 0)).toBe(true);
    expect(toastSwipeDismisses(-10, 0)).toBe(false);
    expect(toastSwipeDismisses(-5, -600)).toBe(true);
    expect(toastSwipeDismisses(40, 0)).toBe(false);
    renderUI(<Text>app</Text>);
    act(() => notify('common.done'));
    const id = getToasts()[0].id;
    act(() =>
      fireGestureHandler(getByGestureTestId(`toast-${id}-pan`), [
        { state: State.BEGAN, translationY: 0, velocityY: 0 },
        { state: State.ACTIVE, translationY: -20, velocityY: 0 },
        { state: State.END, translationY: -60, velocityY: 0 },
      ]),
    );
    expect(getToasts()).toHaveLength(0);
  });

  it.each(['ltr', 'rtl'] as const)('%s: close button labelled, at the inline end of the row, never left/right', (mode) => {
    renderMode(<Text>app</Text>, mode);
    act(() => notify('common.done'));
    const id = getToasts()[0].id;
    const close = screen.getByTestId(`toast-${id}-close`);
    expect(close.props.accessibilityLabel).toBe(mode === 'rtl' ? 'إغلاق' : 'Close');
    expect(physicalKeys(close.props.style)).toEqual([]);
    expect(flat(screen.getByTestId(`toast-${id}`).props.style).flexDirection).toBe('row');
    expect(screen.getByTestId(`toast-${id}`).props.accessibilityLiveRegion).toBe('polite');
    fireEvent.press(close);
    expect(getToasts()).toHaveLength(0);
  });
});

describe.each(MODES)('toast %s snapshot', (mode) => {
  it('matches', () => {
    const view = renderMode(<Text>app</Text>, mode);
    act(() => {
      notifySuccess('common.done');
      notifyError('screens.ui.failedLoadData');
    });
    expect(view.toJSON()).toMatchSnapshot();
  });
});
