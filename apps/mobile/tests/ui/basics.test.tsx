/** VTID-05176 — Badge, Card, Input, Textarea, Label, Separator, Skeleton. */
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
  Badge,
  BADGE_VARIANTS,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Skeleton,
  Textarea,
} from '../../src/ui';
import { legacyColors, tokens } from '../../src/ui/theme';
import { flat, MODES, renderMode, renderUI, resetKit } from './helpers';

beforeEach(resetKit);

describe('Badge', () => {
  it.each(BADGE_VARIANTS)('%s renders its label', (variant) => {
    renderUI(
      <Badge variant={variant} testID="b">
        New
      </Badge>,
    );
    expect(screen.getByText('New')).toBeTruthy();
  });
  it('success keeps the web raw green (legacy-literals)', () => {
    renderUI(
      <Badge variant="success" testID="b">
        Ok
      </Badge>,
    );
    expect(flat(screen.getByTestId('b').props.style).backgroundColor).toBe(legacyColors.badgeSuccessBg);
  });
});

describe('Card', () => {
  it('renders six parts, CardTitle is a header', () => {
    renderUI(
      <Card testID="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>
          <CardDescription>Body</CardDescription>
        </CardContent>
        <CardFooter>
          <CardDescription>Foot</CardDescription>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title').props.accessibilityRole).toBe('header');
    expect(flat(screen.getByTestId('card').props.style)).toMatchObject({ borderRadius: tokens.radius.lg, backgroundColor: tokens.color.light.card });
  });
});

describe('Input / Textarea / Label', () => {
  it('Input maps web props: type, disabled, aria-invalid; text via onChangeText', () => {
    const onChangeText = jest.fn();
    renderUI(
      <>
        <Label nativeID="lbl">Email</Label>
        <Input testID="email" type="email" accessibilityLabelledBy="lbl" placeholder="Email" onChangeText={onChangeText} />
        <Input testID="pw" type="password" />
        <Input testID="off" disabled />
        <Input testID="bad" aria-invalid />
      </>,
    );
    const email = screen.getByTestId('email');
    expect(email.props.keyboardType).toBe('email-address');
    expect(email.props.accessibilityLabelledBy).toBe('lbl');
    expect(screen.getByText('Email').props.nativeID).toBe('lbl');
    fireEvent.changeText(email, 'a@b.c');
    expect(onChangeText).toHaveBeenCalledWith('a@b.c');
    expect(screen.getByTestId('pw').props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('off').props.editable).toBe(false);
    expect(flat(screen.getByTestId('bad').props.style).borderColor).toBe(tokens.color.light.destructive);
    expect(flat(email.props.style).fontSize).toBe(16);
  });

  it('focus switches the border to the ring colour', () => {
    renderUI(<Input testID="i" />);
    act(() => fireEvent(screen.getByTestId('i'), 'focus'));
    expect(flat(screen.getByTestId('i').props.style).borderColor).toBe(tokens.color.light.ring);
  });

  it('Textarea is multiline with min-h 80', () => {
    renderUI(<Textarea testID="t" />);
    const t = screen.getByTestId('t');
    expect(t.props.multiline).toBe(true);
    expect(flat(t.props.style).minHeight).toBe(80);
  });
});

describe('Separator / Skeleton', () => {
  it('Separator is decorative by default and 1 px', () => {
    renderUI(
      <>
        <Separator testID="h" />
        <Separator testID="v" orientation="vertical" decorative={false} />
      </>,
    );
    expect(screen.getByTestId('h').props.importantForAccessibility).toBe('no');
    expect(flat(screen.getByTestId('h').props.style).height).toBe(1);
    expect(flat(screen.getByTestId('v').props.style).width).toBe(1);
  });

  it('Skeleton with a label is a busy progressbar; static under reduced motion', () => {
    renderUI(<Skeleton testID="s" accessibilityLabel="Loading" />, { reducedMotion: true });
    const s = screen.getByTestId('s');
    expect(s.props.accessibilityRole).toBe('progressbar');
    expect(s.props.accessibilityState).toEqual({ busy: true });
    expect(flat(s.props.style).opacity).toBe(1);
  });
});

describe.each(MODES)('basics %s snapshot', (mode) => {
  it('matches', () => {
    const view = renderMode(
      <>
        {BADGE_VARIANTS.map((v) => (
          <Badge key={v} variant={v}>
            New
          </Badge>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Desc</CardDescription>
          </CardHeader>
        </Card>
        <Label>Email</Label>
        <Input placeholder="Email" />
        <Textarea placeholder="Note" />
        <Separator />
        <Skeleton />
      </>,
      mode,
    );
    expect(view.toJSON()).toMatchSnapshot();
  });
});
