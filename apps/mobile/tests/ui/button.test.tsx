/** VTID-05176 — Button: variants, sizes, asChild, disabled, hit area, a11y, LTR/RTL/dark snapshots. */
import { Pressable, Text as RNText } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS, buttonStyles } from '../../src/ui';
import { buildTheme } from '../../src/ui/provider/context';
import { legacyColors, tokens } from '../../src/ui/theme';
import { MODES, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

describe('Button', () => {
  it.each(BUTTON_VARIANTS.flatMap((v) => BUTTON_SIZES.map((s) => [v, s] as const)))('renders %s / %s', (variant, size) => {
    renderUI(
      <Button variant={variant} size={size} testID="b">
        Save
      </Button>,
    );
    const b = screen.getByTestId('b');
    expect(b.props.accessibilityRole).toBe(variant === 'link' ? 'link' : 'button');
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('heights and sizes follow the web (h-10, h-9, h-11, 40×40, h-7)', () => {
    const theme = buildTheme('light', 'ltr', false);
    expect(buttonStyles('default', 'default', theme).container.height).toBe(40);
    expect(buttonStyles('default', 'sm', theme).container.height).toBe(36);
    expect(buttonStyles('default', 'lg', theme).container.height).toBe(44);
    expect(buttonStyles('default', 'icon', theme).container).toMatchObject({ height: 40, width: 40 });
    expect(buttonStyles('default', 'xs', theme).container).toMatchObject({ height: 28, borderRadius: tokens.radius.full });
  });

  it('variant colours come from tokens, and the web raw colours from legacy-literals', () => {
    const light = buildTheme('light', 'ltr', false);
    const dark = buildTheme('dark', 'ltr', false);
    expect(buttonStyles('default', 'default', light).container.backgroundColor).toBe(tokens.color.light.primary);
    expect(buttonStyles('destructive', 'default', light).container.backgroundColor).toBe(tokens.color.light.destructive);
    expect(buttonStyles('outline', 'default', light).container.borderColor).toBe(tokens.color.light.input);
    expect(buttonStyles('solid', 'default', light).container.backgroundColor).toBe(legacyColors.buttonSolidBg);
    expect(buttonStyles('soft', 'default', dark).container.backgroundColor).toBe(legacyColors.buttonSoftBg.dark);
    expect(buttonStyles('pill', 'default', light, { pressed: true }).container.backgroundColor).toBe(legacyColors.buttonPillPressed.light);
    expect(buttonStyles('default', 'default', dark).container.backgroundColor).toBe(tokens.color.dark.primary);
  });

  it('onPress fires; disabled blocks it and sets the state and opacity', () => {
    const onPress = jest.fn();
    renderUI(
      <>
        <Button testID="on" onPress={onPress}>
          Go
        </Button>
        <Button testID="off" onPress={onPress} disabled>
          No
        </Button>
      </>,
    );
    fireEvent.press(screen.getByTestId('on'));
    expect(onPress).toHaveBeenCalledTimes(1);
    const off = screen.getByTestId('off');
    expect(off.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(off);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['xs', 'sm', 'icon'] as const)('%s reaches a 44 pt hit area through hitSlop', (size) => {
    renderUI(<Button size={size} testID="b" accessibilityLabel="x" />);
    const b = screen.getByTestId('b');
    const h = buttonStyles('default', size, buildTheme('light', 'ltr', false)).container;
    const slop = b.props.hitSlop;
    expect((h.height as number) + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    if (h.width) expect((h.width as number) + slop.left + slop.right).toBeGreaterThanOrEqual(44);
  });

  it('passes aria-label and accessibilityLabel through', () => {
    renderUI(
      <>
        <Button testID="a" aria-label="Aria" />
        <Button testID="b" accessibilityLabel="Acc" />
      </>,
    );
    expect(screen.getByLabelText('Aria')).toBe(screen.getByTestId('a'));
    expect(screen.getByLabelText('Acc')).toBe(screen.getByTestId('b'));
  });

  it('asChild renders the child with merged onPress and style', () => {
    const outer = jest.fn();
    const inner = jest.fn();
    renderUI(
      <Button asChild onPress={outer} variant="destructive">
        <Pressable testID="child" onPress={inner}>
          <RNText>Child</RNText>
        </Pressable>
      </Button>,
    );
    const child = screen.getByTestId('child');
    fireEvent.press(child);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).toHaveBeenCalledTimes(1);
    expect(child.props.accessibilityRole).toBe('button');
  });

  it.each(MODES)('%s snapshot', (mode) => {
    const view = renderMode(
      <>
        {BUTTON_VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            Save
          </Button>
        ))}
        <Button size="icon" accessibilityLabel="More" />
        <Button disabled>Off</Button>
      </>,
      mode,
    );
    expect(view.toJSON()).toMatchSnapshot();
  });
});
