/** VTID-05176 — Switch, Checkbox, RadioGroup: contract, roles/states, 44 pt hit areas, RTL thumb, snapshots. */
import { fireEvent, screen } from '@testing-library/react-native';
import { Checkbox, RadioGroup, RadioGroupItem, Switch } from '../../src/ui';
import { flat, MODES, physicalKeys, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

function hit(el: { props: { hitSlop: { top: number; bottom: number; left: number; right: number } } }, w: number, h: number) {
  const s = el.props.hitSlop;
  return { width: w + s.left + s.right, height: h + s.top + s.bottom };
}

describe('Switch', () => {
  it('uncontrolled toggles; onCheckedChange; role switch with checked state', () => {
    const onCheckedChange = jest.fn();
    renderUI(<Switch testID="s" onCheckedChange={onCheckedChange} aria-label="Wifi" />);
    const s = screen.getByTestId('s');
    expect(s.props.accessibilityRole).toBe('switch');
    expect(s.props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(s);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('s').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByLabelText('Wifi')).toBeTruthy();
  });

  it('controlled stays put until the parent changes it; disabled blocks', () => {
    const onCheckedChange = jest.fn();
    renderUI(
      <>
        <Switch testID="c" checked={false} onCheckedChange={onCheckedChange} />
        <Switch testID="d" disabled onCheckedChange={onCheckedChange} />
      </>,
    );
    fireEvent.press(screen.getByTestId('c'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('c').props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(screen.getByTestId('d'));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });

  it('the thumb travels toward the inline end (flex-end), never by a physical offset', () => {
    renderUI(
      <>
        <Switch testID="on" defaultChecked />
        <Switch testID="off" />
      </>,
      { direction: 'rtl' },
    );
    expect(flat(screen.getByTestId('on').props.style).justifyContent).toBe('flex-end');
    expect(flat(screen.getByTestId('off').props.style).justifyContent).toBe('flex-start');
    expect(physicalKeys(screen.getByTestId('on').props.style)).toEqual([]);
  });

  it('44 pt hit area', () => {
    renderUI(<Switch testID="s" />);
    expect(hit(screen.getByTestId('s') as never, 44, 24).height).toBeGreaterThanOrEqual(44);
  });
});

describe('Checkbox', () => {
  it("'indeterminate' maps to accessibility 'mixed' and a press checks it", () => {
    const onCheckedChange = jest.fn();
    renderUI(<Checkbox testID="c" defaultChecked="indeterminate" onCheckedChange={onCheckedChange} />);
    const c = screen.getByTestId('c');
    expect(c.props.accessibilityRole).toBe('checkbox');
    expect(c.props.accessibilityState).toMatchObject({ checked: 'mixed' });
    fireEvent.press(c);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles true/false and keeps a 44 pt hit area', () => {
    renderUI(<Checkbox testID="c" />);
    fireEvent.press(screen.getByTestId('c'));
    expect(screen.getByTestId('c').props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByTestId('c'));
    expect(screen.getByTestId('c').props.accessibilityState).toMatchObject({ checked: false });
    const h = hit(screen.getByTestId('c') as never, 16, 16);
    expect(h.width).toBeGreaterThanOrEqual(44);
    expect(h.height).toBeGreaterThanOrEqual(44);
  });
});

describe('RadioGroup', () => {
  it('radiogroup with radio items; selects; disabled items stay off', () => {
    const onValueChange = jest.fn();
    renderUI(
      <RadioGroup testID="g" defaultValue="a" onValueChange={onValueChange}>
        <RadioGroupItem value="a" testID="a" accessibilityLabel="A" />
        <RadioGroupItem value="b" testID="b" accessibilityLabel="B" />
        <RadioGroupItem value="c" testID="c" accessibilityLabel="C" disabled />
      </RadioGroup>,
    );
    expect(screen.getByTestId('g').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByTestId('a').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('a').props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByTestId('b'));
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('b').props.accessibilityState).toMatchObject({ checked: true });
    fireEvent.press(screen.getByTestId('c'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(hit(screen.getByTestId('a') as never, 16, 16).height).toBeGreaterThanOrEqual(44);
  });
});

describe.each(MODES)('toggles %s snapshot', (mode) => {
  it('matches', () => {
    const view = renderMode(
      <>
        <Switch />
        <Switch defaultChecked />
        <Checkbox />
        <Checkbox defaultChecked />
        <Checkbox defaultChecked="indeterminate" />
        <RadioGroup defaultValue="a" orientation="horizontal">
          <RadioGroupItem value="a" />
          <RadioGroupItem value="b" />
        </RadioGroup>
      </>,
      mode,
    );
    expect(view.toJSON()).toMatchSnapshot();
  });
});
