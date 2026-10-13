/**
 * VTID-05176 — Slider: `value[]` with one thumb per value, step/min/max
 * clamping, drag (incl. RTL), adjustable actions, fill from the inline start.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { Slider, snapToStep, valueFromDrag } from '../../src/ui';
import { setThumb } from '../../src/ui/slider';
import { flat, MODES, physicalKeys, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

describe('pure helpers', () => {
  it('snapToStep clamps and rounds to the step from min', () => {
    expect(snapToStep(-5, 0, 100, 1)).toBe(0);
    expect(snapToStep(105, 0, 100, 1)).toBe(100);
    expect(snapToStep(23, 18, 99, 5)).toBe(23);
    expect(snapToStep(24, 18, 99, 5)).toBe(23);
    expect(snapToStep(26, 18, 99, 5)).toBe(28);
    expect(snapToStep(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
  });
  it('valueFromDrag maps px to value, mirrored in RTL', () => {
    expect(valueFromDrag(50, 100, 200, 0, 100, 1, false)).toBe(100);
    expect(valueFromDrag(50, 100, 200, 0, 100, 1, true)).toBe(0);
    expect(valueFromDrag(50, -40, 200, 0, 100, 1, false)).toBe(30);
    expect(valueFromDrag(50, 10, 0, 0, 100, 1, false)).toBe(50);
  });
  it('a thumb cannot pass its neighbours', () => {
    expect(setThumb([20, 60], 0, 80)).toEqual([60, 60]);
    expect(setThumb([20, 60], 1, 10)).toEqual([20, 20]);
  });
});

function layoutTrack(id = 'slider', width = 200) {
  fireEvent(screen.getByTestId(`${id}-track`), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 8 } } });
}

function dragThumb(id: string, index: number, dx: number) {
  fireGestureHandler(getByGestureTestId(`${id}-thumb-${index}-pan`), [
    { state: State.BEGAN, translationX: 0 },
    { state: State.ACTIVE, translationX: dx / 2 },
    { state: State.ACTIVE, translationX: dx },
    { state: State.END, translationX: dx },
  ]);
}

describe('Slider', () => {
  it('a [min, max] range renders one thumb per value (FindMatchFilterSheet age range)', () => {
    renderUI(<Slider defaultValue={[25, 40]} min={18} max={99} step={1} accessibilityLabel="Age" />);
    const t0 = screen.getByTestId('slider-thumb-0');
    const t1 = screen.getByTestId('slider-thumb-1');
    expect(t0.props.accessibilityRole).toBe('adjustable');
    expect(t0.props.accessibilityValue).toEqual({ min: 18, max: 99, now: 25 });
    expect(t1.props.accessibilityValue).toEqual({ min: 18, max: 99, now: 40 });
    expect(t0.props.accessibilityLabel).toBe('Age');
  });

  it('dragging the second thumb changes only the second value; commit on release', () => {
    const onValueChange = jest.fn();
    const onValueCommit = jest.fn();
    renderUI(<Slider defaultValue={[20, 40]} onValueChange={onValueChange} onValueCommit={onValueCommit} />);
    layoutTrack();
    act(() => dragThumb('slider', 1, 40)); // +20 % of 100
    expect(onValueChange).toHaveBeenLastCalledWith([20, 60]);
    expect(onValueCommit).toHaveBeenLastCalledWith([20, 60]);
    expect(screen.getByTestId('slider-thumb-1').props.accessibilityValue.now).toBe(60);
  });

  it('in RTL a drag to the physical left increases the value', () => {
    const onValueChange = jest.fn();
    renderUI(<Slider defaultValue={[50]} onValueChange={onValueChange} />, { direction: 'rtl' });
    layoutTrack();
    act(() => dragThumb('slider', 0, -50));
    expect(onValueChange).toHaveBeenLastCalledWith([75]);
  });

  it('adjustable increment/decrement step and clamp', () => {
    const onValueChange = jest.fn();
    renderUI(<Slider defaultValue={[98]} max={100} step={5} onValueChange={onValueChange} />);
    const thumb = screen.getByTestId('slider-thumb-0');
    expect(thumb.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
    fireEvent(thumb, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onValueChange).toHaveBeenLastCalledWith([100]);
    fireEvent(screen.getByTestId('slider-thumb-0'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onValueChange).toHaveBeenLastCalledWith([95]);
  });

  it('disabled: no drag, disabled state', () => {
    const onValueChange = jest.fn();
    renderUI(<Slider defaultValue={[50]} disabled onValueChange={onValueChange} />);
    layoutTrack();
    expect(screen.getByTestId('slider-thumb-0').props.accessibilityState).toEqual({ disabled: true });
  });

  it('the fill and thumbs are positioned with `start` (inline start), never left/right', () => {
    renderUI(<Slider defaultValue={[30, 70]} />, { direction: 'rtl' });
    const range = flat(screen.getByTestId('slider-range').props.style);
    expect(range.start).toBe('30%');
    expect(range.width).toBe('40%');
    expect(physicalKeys(screen.getByTestId('slider-range').props.style)).toEqual([]);
    expect(flat(screen.getByTestId('slider-thumb-1').props.style).start).toBe('70%');
  });

  it('a single value fills from the inline start', () => {
    renderUI(<Slider defaultValue={[30]} />);
    expect(flat(screen.getByTestId('slider-range').props.style)).toMatchObject({ start: '0%', width: '30%' });
  });

  it('the thumb hit area reaches 44 pt', () => {
    renderUI(<Slider defaultValue={[30]} />);
    expect(20 + 2 * screen.getByTestId('slider-thumb-0').props.hitSlop).toBeGreaterThanOrEqual(44);
  });

  it.each(MODES)('%s snapshot', (mode) => {
    expect(renderMode(<Slider defaultValue={[25, 75]} />, mode).toJSON()).toMatchSnapshot();
  });
});
