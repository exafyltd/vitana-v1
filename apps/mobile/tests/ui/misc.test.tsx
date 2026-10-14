/** VTID-05176 — Accordion, Collapsible, Avatar, Progress, ScrollArea. */
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Progress,
  ScrollArea,
  ScrollBar,
  Text,
} from '../../src/ui';
import { flat, MODES, physicalKeys, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

function AccordionFixture(props: Record<string, unknown>) {
  return (
    <Accordion {...(props as { type: 'single' })}>
      <AccordionItem value="a">
        <AccordionTrigger testID="ta">A</AccordionTrigger>
        <AccordionContent>Body A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger testID="tb">B</AccordionTrigger>
        <AccordionContent>Body B</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe('Accordion', () => {
  it('single: one open at a time, expanded state; not collapsible by default', () => {
    const onValueChange = jest.fn();
    renderUI(<AccordionFixture type="single" defaultValue="a" onValueChange={onValueChange} />);
    expect(screen.getByText('Body A')).toBeTruthy();
    expect(screen.getByTestId('ta').props.accessibilityState).toMatchObject({ expanded: true });
    fireEvent.press(screen.getByTestId('tb'));
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    expect(screen.queryByText('Body A')).toBeNull();
    expect(screen.getByText('Body B')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tb'));
    expect(screen.getByText('Body B')).toBeTruthy();
  });

  it('single collapsible closes the open item', () => {
    renderUI(<AccordionFixture type="single" collapsible defaultValue="a" />);
    fireEvent.press(screen.getByTestId('ta'));
    expect(screen.queryByText('Body A')).toBeNull();
    expect(screen.getByTestId('ta').props.accessibilityState).toMatchObject({ expanded: false });
  });

  it('multiple keeps several open', () => {
    const onValueChange = jest.fn();
    renderUI(<AccordionFixture type="multiple" onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('ta'));
    fireEvent.press(screen.getByTestId('tb'));
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(screen.getByText('Body A')).toBeTruthy();
    expect(screen.getByText('Body B')).toBeTruthy();
  });

  it.each(MODES)('%s snapshot', (mode) => {
    expect(renderMode(<AccordionFixture type="single" defaultValue="a" />, mode).toJSON()).toMatchSnapshot();
  });
});

describe('Collapsible', () => {
  it('toggles its content; asChild trigger carries expanded', () => {
    const onOpenChange = jest.fn();
    renderUI(
      <Collapsible onOpenChange={onOpenChange}>
        <CollapsibleTrigger testID="t">More</CollapsibleTrigger>
        <CollapsibleContent>
          <Text>Hidden</Text>
        </CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText('Hidden')).toBeNull();
    fireEvent.press(screen.getByTestId('t'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Hidden')).toBeTruthy();
    expect(screen.getByTestId('t').props.accessibilityState).toMatchObject({ expanded: true });
  });
});

describe('Avatar', () => {
  it('shows the fallback until the image loads, then hides it', () => {
    const onStatus = jest.fn();
    renderUI(
      <Avatar>
        <AvatarImage testID="img" src="file:///local/avatar.png" alt="Me" onLoadingStatusChange={onStatus} />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeTruthy();
    expect(onStatus).toHaveBeenLastCalledWith('loading');
    fireEvent(screen.getByTestId('img'), 'load', { nativeEvent: {} });
    expect(onStatus).toHaveBeenLastCalledWith('loaded');
    expect(screen.queryByText('AB')).toBeNull();
    expect(screen.getByTestId('img').props.accessibilityLabel).toBe('Me');
  });

  it('an error keeps the fallback; no src renders no image', () => {
    renderUI(
      <>
        <Avatar>
          <AvatarImage testID="img" src="file:///missing.png" />
          <AvatarFallback>ER</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage testID="none" />
          <AvatarFallback>NO</AvatarFallback>
        </Avatar>
      </>,
    );
    fireEvent(screen.getByTestId('img'), 'error', { nativeEvent: {} });
    expect(screen.getByText('ER')).toBeTruthy();
    expect(screen.queryByTestId('none')).toBeNull();
    expect(screen.getByText('NO')).toBeTruthy();
  });

  it('delayMs postpones the fallback', () => {
    jest.useFakeTimers();
    try {
      renderUI(
        <Avatar>
          <AvatarFallback delayMs={600}>AB</AvatarFallback>
        </Avatar>,
      );
      expect(screen.queryByText('AB')).toBeNull();
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(screen.getByText('AB')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Progress', () => {
  it('role progressbar with accessibilityValue; fill width from the inline start', () => {
    renderUI(<Progress testID="p" value={40} accessibilityLabel="Loading" />, { direction: 'rtl' });
    const p = screen.getByTestId('p');
    expect(p.props.accessibilityRole).toBe('progressbar');
    expect(p.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    const fill = screen.getByTestId('progress-fill');
    expect(flat(fill.props.style).width).toBe('40%');
    expect(physicalKeys(fill.props.style)).toEqual([]);
  });

  it('0 renders no fill; null is indeterminate (busy)', () => {
    renderUI(
      <>
        <Progress testID="zero" value={0} />
        <Progress testID="ind" value={null} />
      </>,
    );
    expect(screen.queryByTestId('progress-fill')).toBeNull();
    expect(screen.getByTestId('ind').props.accessibilityState).toEqual({ busy: true });
  });

  it.each(MODES)('%s snapshot', (mode) => {
    expect(renderMode(<Progress value={60} />, mode).toJSON()).toMatchSnapshot();
  });
});

describe('ScrollArea', () => {
  it('vertical by default; a horizontal ScrollBar child switches it', () => {
    renderUI(
      <>
        <ScrollArea testID="v">
          <Badge>One</Badge>
        </ScrollArea>
        <ScrollArea testID="h">
          <Badge>Two</Badge>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </>,
    );
    expect(screen.getByTestId('v').props.horizontal).toBeFalsy();
    expect(screen.getByTestId('h').props.horizontal).toBe(true);
    expect(screen.getByText('Two')).toBeTruthy();
  });
});
