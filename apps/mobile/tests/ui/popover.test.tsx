/**
 * VTID-05176 — Popover placement (pure, with numbers: flip, clamp, RTL align),
 * Popover open/close, Tooltip as a long-press hint.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Button, computePlacement, Popover, PopoverContent, PopoverTrigger, Text, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../src/ui';
import { TOOLTIP_HIDE_DELAY_MS } from '../../src/ui/tooltip';
import { flat, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

const window = { width: 390, height: 844 };
const insets = { top: 47, bottom: 34, left: 0, right: 0 }; // physical-ok: safe-area insets
const content = { width: 288, height: 120 };

describe('computePlacement', () => {
  it('bottom/center below the anchor with sideOffset 4', () => {
    const p = computePlacement({ anchor: { x: 100, y: 200, width: 100, height: 40 }, content, window, insets });
    expect(p.side).toBe('bottom');
    expect(p.y).toBe(244);
    // centred would be 100 + 50 - 144 = 6, clamped to the 8 pt padding
    expect(p.x).toBe(8);
  });

  it('clamps into the safe area horizontally', () => {
    const p = computePlacement({ anchor: { x: 350, y: 200, width: 30, height: 30 }, content, window, insets });
    expect(p.x).toBe(390 - 8 - 288);
    expect(p.x).toBeGreaterThanOrEqual(8);
  });

  it('flips to the top when there is no room below and more above', () => {
    const p = computePlacement({ anchor: { x: 50, y: 760, width: 100, height: 40 }, content, window, insets });
    expect(p.side).toBe('top');
    expect(p.y).toBe(760 - 4 - 120);
  });

  it('does not flip when the other side has even less room, and clamps', () => {
    const tall = { width: 200, height: 800 };
    const p = computePlacement({ anchor: { x: 50, y: 300, width: 100, height: 40 }, content: tall, window, insets });
    expect(p.y).toBeGreaterThanOrEqual(47 + 8);
  });

  it('align start/end follow the reading direction', () => {
    const anchor = { x: 40, y: 200, width: 100, height: 40 };
    const small = { width: 80, height: 50 };
    const ltrStart = computePlacement({ anchor, content: small, window, insets, align: 'start' });
    const rtlStart = computePlacement({ anchor, content: small, window, insets, align: 'start', rtl: true });
    expect(ltrStart.x).toBe(40); // left edges aligned
    expect(rtlStart.x).toBe(40 + 100 - 80); // right edges aligned
    const rtlEnd = computePlacement({ anchor, content: small, window, insets, align: 'end', rtl: true });
    expect(rtlEnd.x).toBe(40);
  });

  it('returns a logical start offset (mirrored in RTL)', () => {
    const anchor = { x: 40, y: 200, width: 100, height: 40 };
    const small = { width: 80, height: 50 };
    const ltr = computePlacement({ anchor, content: small, window, insets, align: 'start' });
    const rtl = computePlacement({ anchor, content: small, window, insets, align: 'start', rtl: true });
    expect(ltr.start).toBe(ltr.x);
    expect(rtl.start).toBe(390 - (rtl.x + 80));
  });

  it('left/right sides flip on the horizontal axis', () => {
    const p = computePlacement({ anchor: { x: 20, y: 300, width: 40, height: 40 }, content: { width: 100, height: 40 }, window, insets, side: 'left' });
    expect(p.side).toBe('right');
    expect(p.x).toBe(20 + 40 + 4);
  });
});

describe('Popover', () => {
  it('opens from the trigger, closes on a backdrop tap and Android back', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <Popover onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button testID="trigger">Open</Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Text>Body</Text>
        </PopoverContent>
      </Popover>,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Body')).toBeTruthy();
    expect(screen.getByTestId('trigger').props.accessibilityState).toMatchObject({ expanded: true });
    // positioned with logical `start`, never left/right
    const style = flat(screen.getByTestId('popover-content').props.style);
    expect(style.start).toEqual(expect.any(Number));
    expect(style.left).toBeUndefined();
    fireEvent.press(screen.getByTestId('popover-backdrop', { includeHiddenElements: true }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText('Body')).toBeNull();
  });
});

describe('Tooltip → long-press hint', () => {
  it('a string content becomes the trigger accessibilityHint', () => {
    renderUI(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button testID="t">Info</Button>
          </TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByTestId('t').props.accessibilityHint).toBe('Helpful hint');
    expect(screen.queryByText('Helpful hint')).toBeNull();
  });

  it('long press shows the bubble; release hides it after the delay', () => {
    jest.useFakeTimers();
    try {
      renderUI(
        <Tooltip>
          <TooltipTrigger asChild>
            <Button testID="t">Info</Button>
          </TooltipTrigger>
          <TooltipContent>Helpful hint</TooltipContent>
        </Tooltip>,
      );
      fireEvent(screen.getByTestId('t'), 'longPress');
      expect(screen.getByText('Helpful hint')).toBeTruthy();
      fireEvent(screen.getByTestId('t'), 'pressOut');
      expect(screen.getByText('Helpful hint')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(TOOLTIP_HIDE_DELAY_MS + 1);
      });
      expect(screen.queryByText('Helpful hint')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
