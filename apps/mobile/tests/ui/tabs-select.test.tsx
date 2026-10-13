/** VTID-05176 — Tabs and Select (bottom-sheet list). */
import { fireEvent, screen } from '@testing-library/react-native';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '../../src/ui';
import { MODES, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

function TabsFixture(props: { value?: string; onValueChange?: (v: string) => void }) {
  return (
    <Tabs defaultValue="a" {...props}>
      <TabsList testID="list">
        <TabsTrigger value="a" testID="tab-a">
          A
        </TabsTrigger>
        <TabsTrigger value="b" testID="tab-b">
          B
        </TabsTrigger>
        <TabsTrigger value="c" testID="tab-c" disabled>
          C
        </TabsTrigger>
      </TabsList>
      <TabsContent value="a">
        <Text>Panel A</Text>
      </TabsContent>
      <TabsContent value="b">
        <Text>Panel B</Text>
      </TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('roles tablist/tab, selected state, only the active content renders', () => {
    renderUI(<TabsFixture />);
    expect(screen.getByTestId('list').props.accessibilityRole).toBe('tablist');
    expect(screen.getByTestId('tab-a').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('tab-a').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('Panel A')).toBeTruthy();
    expect(screen.queryByText('Panel B')).toBeNull();
    fireEvent.press(screen.getByTestId('tab-b'));
    expect(screen.getByTestId('tab-b').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('Panel B')).toBeTruthy();
    expect(screen.queryByText('Panel A')).toBeNull();
  });

  it('controlled: onValueChange fires, the parent decides; disabled tabs do nothing', () => {
    const onValueChange = jest.fn();
    renderUI(<TabsFixture value="a" onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('tab-b'));
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(screen.getByText('Panel A')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tab-c'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('small tabs reach a 44 pt hit area', () => {
    renderUI(<TabsFixture />);
    const slop = screen.getByTestId('tab-a').props.hitSlop;
    expect(32 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });

  it.each(MODES)('%s snapshot', (mode) => {
    expect(renderMode(<TabsFixture />, mode).toJSON()).toMatchSnapshot();
  });
});

function SelectFixture(props: { value?: string; defaultValue?: string; onValueChange?: (v: string) => void }) {
  return (
    <Select {...props}>
      <SelectTrigger testID="trigger">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple" testID="apple">
            Apple
          </SelectItem>
          <SelectItem value="pear" testID="pear">
            Pear
          </SelectItem>
          <SelectSeparator />
          <SelectItem value="plum" testID="plum" disabled>
            Plum
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe('Select', () => {
  it('shows the placeholder, opens as a sheet list, picks, closes and shows the label', () => {
    const onValueChange = jest.fn();
    renderUI(<SelectFixture onValueChange={onValueChange} />);
    expect(screen.getByText('Pick one')).toBeTruthy();
    const trigger = screen.getByTestId('trigger');
    expect(trigger.props.accessibilityRole).toBe('combobox');
    expect(trigger.props.accessibilityState).toMatchObject({ expanded: false });
    fireEvent.press(trigger);
    expect(screen.getByTestId('select-content')).toBeTruthy();
    expect(screen.getByTestId('apple').props.accessibilityRole).toBe('menuitem');
    fireEvent.press(screen.getByTestId('pear'));
    expect(onValueChange).toHaveBeenCalledWith('pear');
    expect(screen.queryByTestId('select-content')).toBeNull();
    expect(screen.getByText('Pear')).toBeTruthy();
    expect(screen.queryByText('Pick one')).toBeNull();
  });

  it('marks the selected item and ignores disabled items', () => {
    const onValueChange = jest.fn();
    renderUI(<SelectFixture defaultValue="apple" onValueChange={onValueChange} />);
    expect(screen.getByText('Apple')).toBeTruthy();
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByTestId('apple').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('plum').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('plum'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('Android back closes the list without changing the value', () => {
    renderUI(<SelectFixture defaultValue="apple" />);
    fireEvent.press(screen.getByTestId('trigger'));
    fireEvent(screen.getByTestId('select-modal'), 'requestClose');
    expect(screen.queryByTestId('select-content')).toBeNull();
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it.each(MODES)('%s snapshot (open)', (mode) => {
    const view = renderMode(<SelectFixture defaultValue="apple" />, mode);
    fireEvent.press(screen.getByTestId('trigger'));
    expect(view.toJSON()).toMatchSnapshot();
  });
});
